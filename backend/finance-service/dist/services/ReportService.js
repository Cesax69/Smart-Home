"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportService = void 0;
const database_1 = require("../config/database");
class ReportService {
    /**
     * Genera un reporte financiero con labels y datasets para gráficas
     */
    async generateReport(query) {
        const { from, to, groupBy, currency, period } = query;
        const range = this.calculateDateRange(from, to, period);
        let labels = [];
        let expensesData = [];
        let incomeData = [];
        let balanceData = [];
        if (groupBy === 'date') {
            const result = await this.aggregateByDate(range, currency || 'USD');
            labels = result.labels;
            expensesData = result.expenses;
            incomeData = result.income;
            balanceData = result.balance;
        }
        else if (groupBy === 'category') {
            const result = await this.aggregateByCategory(range, currency || 'USD');
            labels = result.labels;
            expensesData = result.expenses;
        }
        else if (groupBy === 'member') {
            const result = await this.aggregateByMember(range, currency || 'USD');
            labels = result.labels;
            expensesData = result.expenses;
            incomeData = result.income;
            balanceData = result.balance;
        }
        const datasets = [
            { label: 'Gastos', data: expensesData, color: '#F44336' },
            { label: 'Ingresos', data: incomeData, color: '#2196F3' },
            { label: 'Balance', data: balanceData, color: '#4CAF50' }
        ];
        return {
            data: { labels, datasets },
            meta: {
                period,
                groupBy,
                currency: currency || 'USD',
                range: {
                    start: range.start.toISOString(),
                    end: range.end.toISOString()
                }
            }
        };
    }
    async aggregateByDate(range, currency) {
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
            database_1.databaseService.query(expensesQuery, [range.start, range.end, currency]),
            database_1.databaseService.query(incomeQuery, [range.start, range.end, currency])
        ]);
        // Generar labels de fechas
        const labels = this.generateDateLabels(range);
        const expenses = labels.map(() => 0);
        const income = labels.map(() => 0);
        // Llenar datos de expenses
        expensesResult.rows.forEach(row => {
            const dayStr = new Date(row.day).toISOString().split('T')[0];
            const index = labels.indexOf(dayStr);
            if (index !== -1) {
                expenses[index] = parseFloat(row.total);
            }
        });
        // Llenar datos de income
        incomeResult.rows.forEach(row => {
            const dayStr = new Date(row.day).toISOString().split('T')[0];
            const index = labels.indexOf(dayStr);
            if (index !== -1) {
                income[index] = parseFloat(row.total);
            }
        });
        const balance = labels.map((_, i) => income[i] - expenses[i]);
        return { labels, expenses, income, balance };
    }
    async aggregateByCategory(range, currency) {
        const query = `
      SELECT category_id, SUM(amount) as total
      FROM expenses
      WHERE date >= $1 AND date <= $2 AND currency = $3
      GROUP BY category_id
      ORDER BY total DESC
    `;
        const result = await database_1.databaseService.query(query, [range.start, range.end, currency]);
        const labels = result.rows.map(row => row.category_id);
        const expenses = result.rows.map(row => parseFloat(row.total));
        return { labels, expenses };
    }
    async aggregateByMember(range, currency) {
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
            database_1.databaseService.query(expensesQuery, [range.start, range.end, currency]),
            database_1.databaseService.query(incomeQuery, [range.start, range.end, currency])
        ]);
        // Obtener todos los member_ids únicos
        const memberIds = new Set();
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
    calculateDateRange(from, to, period) {
        const now = new Date();
        let start;
        let end = to ? new Date(to) : now;
        if (from) {
            start = new Date(from);
        }
        else if (period === 'week') {
            start = new Date(now);
            start.setDate(now.getDate() - 7);
        }
        else if (period === 'year') {
            start = new Date(now);
            start.setFullYear(now.getFullYear() - 1);
        }
        else { // default month
            start = new Date(now);
            start.setMonth(now.getMonth() - 1);
        }
        // Set to start/end of day
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        return { start, end };
    }
    generateDateLabels(range) {
        const labels = [];
        const current = new Date(range.start);
        const days = Math.ceil((range.end.getTime() - range.start.getTime()) / (1000 * 60 * 60 * 24));
        // Si es más de un mes, agrupar por semana
        if (days > 31) {
            while (current <= range.end) {
                labels.push(current.toISOString().split('T')[0]);
                current.setDate(current.getDate() + 7);
            }
        }
        else {
            // Agrupar por día
            while (current <= range.end) {
                labels.push(current.toISOString().split('T')[0]);
                current.setDate(current.getDate() + 1);
            }
        }
        return labels;
    }
}
exports.ReportService = ReportService;
//# sourceMappingURL=ReportService.js.map