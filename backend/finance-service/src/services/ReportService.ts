import { databaseService } from '../config/database';
import { FinanceReportQuery, FinanceReportData, Dataset, DateRange } from '../models/types';

export class ReportService {
    /**
     * Genera un reporte financiero con labels y datasets para gráficas
     */
    async generateReport(query: FinanceReportQuery): Promise<{ data: FinanceReportData, meta: any }> {
        const { from, to, groupBy, currency, period } = query;
        const range = await this.calculateDateRange(from, to, period);

        let labels: string[] = [];
        let expensesData: number[] = [];
        let incomeData: number[] = [];
        let balanceData: number[] = [];

        const effectiveGroup = groupBy || 'date';
        if (effectiveGroup === 'date') {
            const result = await this.aggregateByDate(range, currency || 'USD', period);
            labels = result.labels;
            expensesData = result.expenses;
            incomeData = result.income;
            balanceData = result.balance;
        } else if (effectiveGroup === 'category') {
            const result = await this.aggregateByCategory(range, currency || 'USD');
            labels = result.labels;
            expensesData = result.expenses;
        } else if (effectiveGroup === 'member') {
            const result = await this.aggregateByMember(range, currency || 'USD');
            labels = result.labels;
            expensesData = result.expenses;
            incomeData = result.income;
            balanceData = result.balance;
        } else if (effectiveGroup === 'source') {
            const result = await this.aggregateBySource(range, currency || 'USD');
            labels = result.labels;
            incomeData = result.income;
        }

        // Construir datasets según el tipo de agrupación
        let datasets: Dataset[] = [];
        if (groupBy === 'source') {
            datasets = [{ label: 'Ingresos', data: incomeData, color: '#2196F3' }];
        } else if (groupBy === 'category') {
            datasets = [{ label: 'Gastos', data: expensesData, color: '#F44336' }];
        } else {
            // Por fecha o por miembro: mostrar los tres
            datasets = [
                { label: 'Gastos', data: expensesData, color: '#F44336' },
                { label: 'Ingresos', data: incomeData, color: '#2196F3' },
                { label: 'Balance', data: balanceData, color: '#4CAF50' }
            ];
        }

        return {
            data: { labels, datasets },
            meta: {
                period,
                groupBy: effectiveGroup,
                currency: currency || 'USD',
                range: {
                    start: range.start.toISOString(),
                    end: range.end.toISOString()
                }
            }
        };
    }

    private async aggregateBySource(range: { start: Date, end: Date }, currency: string) {
        const incomeQuery = `
      SELECT source, SUM(amount) as total
      FROM income
      WHERE date >= $1 AND date <= $2 AND currency = $3
      GROUP BY source
      ORDER BY total DESC
    `;

        const incomeResult = await databaseService.query(incomeQuery, [range.start, range.end, currency]);

        const labels = incomeResult.rows.map((row: any) => row.source);
        const income = incomeResult.rows.map((row: any) => parseFloat(row.total));

        return { labels, income };
    }

    private async aggregateByDate(range: { start: Date, end: Date }, currency: string, period?: string) {
        const expensesQuery = `
      SELECT DATE(date) as day, SUM(amount) as total
      FROM expenses
      WHERE date >= $1 AND date <= $2 AND currency = $3
      GROUP BY DATE(date)
      ORDER BY day ASC
    `;

        const incomeQuery = `
      SELECT DATE(date) as day, SUM(amount) as total
      FROM income
      WHERE date >= $1 AND date <= $2 AND currency = $3
      GROUP BY DATE(date)
      ORDER BY day ASC
    `;

        const [expensesResult, incomeResult] = await Promise.all([
            databaseService.query(expensesQuery, [range.start, range.end, currency]),
            databaseService.query(incomeQuery, [range.start, range.end, currency])
        ]);

        // Generar labels de fechas según período (formato YYYY-MM-DD en hora local)
        const labels = this.generateDateLabels(range, period);
        const expenses = labels.map(() => 0);
        const income = labels.map(() => 0);
        
        // Helper para encontrar el bin según período
        const parseLabelLocal = (label: string): Date => {
            // label en formato YYYY-MM-DD
            const [yStr, mStr, dStr] = label.split('-');
            const y = parseInt(yStr, 10);
            const m = parseInt(mStr, 10);
            const day = parseInt(dStr, 10);
            return new Date(y, m - 1, day, 0, 0, 0, 0);
        };

        const parseRowDayLocal = (val: any): Date => {
            if (val instanceof Date) {
                return new Date(val.getFullYear(), val.getMonth(), val.getDate(), 0, 0, 0, 0);
            }
            const s = String(val);
            // Soportar "YYYY-MM-DD" y "YYYY-MM-DDTHH:mm:ssZ"
            const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
            if (m) {
                const y = parseInt(m[1], 10);
                const mon = parseInt(m[2], 10);
                const dnum = parseInt(m[3], 10);
                return new Date(y, mon - 1, dnum, 0, 0, 0, 0);
            }
            const d = new Date(val);
            return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
        };

        const findBinIndex = (d: Date): number => {
            if (period === 'week') {
                return labels.findIndex(label => {
                    const labelDate = parseLabelLocal(label);
                    const next = new Date(labelDate);
                    next.setDate(labelDate.getDate() + 7);
                    return d >= labelDate && d < next;
                });
            }
            if (period === 'month') {
                return labels.findIndex(label => {
                    const labelDate = parseLabelLocal(label);
                    const next = new Date(labelDate.getFullYear(), labelDate.getMonth() + 1, 1);
                    return d >= labelDate && d < next;
                });
            }
            if (period === 'year') {
                return labels.findIndex(label => {
                    const labelDate = parseLabelLocal(label);
                    const next = new Date(labelDate.getFullYear() + 1, 0, 1);
                    return d >= labelDate && d < next;
                });
            }
            // day o default: match exact día
            const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            return labels.indexOf(iso);
        };

        // Llenar datos de expenses
        expensesResult.rows.forEach(row => {
            const day = parseRowDayLocal(row.day);
            const idx = findBinIndex(day);
            if (idx !== -1) expenses[idx] += parseFloat(row.total);
        });

        // Llenar datos de income
        incomeResult.rows.forEach(row => {
            const day = parseRowDayLocal(row.day);
            const idx = findBinIndex(day);
            if (idx !== -1) income[idx] += parseFloat(row.total);
        });

        const balance = labels.map((_, i) => income[i] - expenses[i]);

        return { labels, expenses, income, balance };
    }

    private async aggregateByCategory(range: { start: Date, end: Date }, currency: string) {
        const query = `
      SELECT category_id, SUM(amount) as total
      FROM expenses
      WHERE date >= $1 AND date <= $2 AND currency = $3
      GROUP BY category_id
      ORDER BY total DESC
    `;

        const result = await databaseService.query(query, [range.start, range.end, currency]);

        const labels = result.rows.map(row => row.category_id);
        const expenses = result.rows.map(row => parseFloat(row.total));

        return { labels, expenses };
    }

    private async aggregateByMember(range: { start: Date, end: Date }, currency: string) {
        const expensesQuery = `
      SELECT member_id, SUM(amount) as total
      FROM expenses
      WHERE date >= $1 AND date <= $2 AND currency = $3 AND member_id IS NOT NULL
      GROUP BY member_id
      ORDER BY total DESC
    `;

        const incomeQuery = `
      SELECT member_id, SUM(amount) as total
      FROM income
      WHERE date >= $1 AND date <= $2 AND currency = $3 AND member_id IS NOT NULL
      GROUP BY member_id
      ORDER BY total DESC
    `;

        const [expensesResult, incomeResult] = await Promise.all([
            databaseService.query(expensesQuery, [range.start, range.end, currency]),
            databaseService.query(incomeQuery, [range.start, range.end, currency])
        ]);

        // Obtener todos los member_ids únicos
        const memberIds = new Set<string>();
        expensesResult.rows.forEach(row => memberIds.add(row.member_id));
        incomeResult.rows.forEach(row => memberIds.add(row.member_id));

        const labels = Array.from(memberIds);
        const expenses = labels.map(id => {
            const row = expensesResult.rows.find(r => r.member_id === id);
            return row ? parseFloat(row.total) : 0;
        });
        const income = labels.map(id => {
            const row = incomeResult.rows.find(r => r.member_id === id);
            return row ? parseFloat(row.total) : 0;
        });
        const balance = labels.map((_, i) => income[i] - expenses[i]);

        return { labels, expenses, income, balance };
    }

    private async calculateDateRange(from?: string, to?: string, period?: string): Promise<{ start: Date, end: Date }> {
        const now = new Date();
        let start: Date;
        let end: Date;

        if (from) {
            start = new Date(from);
            end = to ? new Date(to) : new Date(now);
            return { start, end };
        }

        // Cuando no se especifica rango, usar el primer y último registro existentes
        const qMinExp = `SELECT MIN(date) AS min FROM expenses`;
        const qMaxExp = `SELECT MAX(date) AS max FROM expenses`;
        const qMinInc = `SELECT MIN(date) AS min FROM income`;
        const qMaxInc = `SELECT MAX(date) AS max FROM income`;

        const [minExpRes, maxExpRes, minIncRes, maxIncRes] = await Promise.all([
            databaseService.query(qMinExp),
            databaseService.query(qMaxExp),
            databaseService.query(qMinInc),
            databaseService.query(qMaxInc)
        ]);

        const minDates: Date[] = [];
        const maxDates: Date[] = [];
        const pushIfValid = (val: any, list: Date[]) => {
            if (val) {
                const d = new Date(val);
                if (!isNaN(d.getTime())) list.push(d);
            }
        };

        pushIfValid(minExpRes.rows?.[0]?.min, minDates);
        pushIfValid(minIncRes.rows?.[0]?.min, minDates);
        pushIfValid(maxExpRes.rows?.[0]?.max, maxDates);
        pushIfValid(maxIncRes.rows?.[0]?.max, maxDates);

        if (minDates.length && maxDates.length) {
            const min = new Date(Math.min(...minDates.map(d => d.getTime())));
            const max = new Date(Math.max(...maxDates.map(d => d.getTime())));
            start = new Date(min.getFullYear(), min.getMonth(), min.getDate(), 0, 0, 0, 0);
            end = new Date(max.getFullYear(), max.getMonth(), max.getDate(), 23, 59, 59, 999);
        } else {
            // Fallback: comportamiento previo si no hay datos
            if (period === 'year') {
                start = new Date(now.getFullYear() - 2, 0, 1, 0, 0, 0, 0);
                end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
            } else if (period === 'day' || period === 'week') {
                const fromMonth = new Date(now.getFullYear(), now.getMonth(), 1);
                const toMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                start = new Date(fromMonth.getFullYear(), fromMonth.getMonth(), fromMonth.getDate(), 0, 0, 0, 0);
                end = new Date(toMonth.getFullYear(), toMonth.getMonth(), toMonth.getDate(), 23, 59, 59, 999);
            } else { // default month
                const fromYear = new Date(now.getFullYear(), 0, 1);
                const toYear = new Date(now.getFullYear(), 11, 31);
                start = new Date(fromYear.getFullYear(), fromYear.getMonth(), fromYear.getDate(), 0, 0, 0, 0);
                end = new Date(toYear.getFullYear(), toYear.getMonth(), toYear.getDate(), 23, 59, 59, 999);
            }
        }

        return { start, end };
    }

    private generateDateLabels(range: { start: Date, end: Date }, period?: string): string[] {
        const labels: string[] = [];
        const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        if (period === 'week') {
            // Desde inicio del rango hasta fin del rango, saltos de 7 días
            const cur = new Date(range.start.getFullYear(), range.start.getMonth(), range.start.getDate());
            while (cur <= range.end) {
                labels.push(fmt(cur));
                cur.setDate(cur.getDate() + 7);
            }
            return labels;
        }
        if (period === 'month') {
            // Desde inicio del rango hasta fin del rango, saltos de mes
            const cur = new Date(range.start.getFullYear(), range.start.getMonth(), 1);
            const endMonth = new Date(range.end.getFullYear(), range.end.getMonth(), 1);
            while (cur <= endMonth) {
                labels.push(fmt(cur));
                cur.setMonth(cur.getMonth() + 1);
            }
            return labels;
        }
        if (period === 'year') {
            // Desde el año de inicio hasta el año de fin (inclusive)
            const cur = new Date(range.start.getFullYear(), 0, 1);
            const endYear = new Date(range.end.getFullYear(), 0, 1);
            while (cur <= endYear) {
                labels.push(fmt(cur));
                cur.setFullYear(cur.getFullYear() + 1);
            }
            return labels;
        }
        // default o 'day': días desde inicio del rango hasta fin del rango
        const cur = new Date(range.start.getFullYear(), range.start.getMonth(), range.start.getDate());
        while (cur <= range.end) {
            labels.push(fmt(cur));
            cur.setDate(cur.getDate() + 1);
        }
        return labels;
    }
}
