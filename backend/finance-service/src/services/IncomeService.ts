import { databaseService } from '../config/database';
import { Income, GetIncomeQuery } from '../models/types';

export class IncomeService {
    async create(incomeData: Omit<Income, 'id' | 'createdAt'>): Promise<Income> {
        const query = `
      INSERT INTO income (amount, currency, source, member_id, date, notes)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, amount, currency, source, member_id as "memberId", 
                date, notes, created_at as "createdAt"
    `;

        const values = [
            incomeData.amount,
            incomeData.currency,
            incomeData.source,
            incomeData.memberId || null,
            incomeData.date,
            incomeData.notes || null
        ];

        const result = await databaseService.query(query, values);
        const row = result.rows[0];

        return {
            id: row.id.toString(),
            amount: parseFloat(row.amount),
            currency: row.currency,
            source: row.source,
            memberId: row.memberId,
            date: new Date(row.date).toISOString(),
            notes: row.notes,
            createdAt: new Date(row.createdAt).toISOString()
        };
    }

    async findAll(filters: GetIncomeQuery): Promise<Income[]> {
        let query = `
      SELECT id, amount, currency, source, member_id as "memberId",
             date, notes, created_at as "createdAt"
      FROM income
      WHERE 1=1
    `;

        const values: any[] = [];
        let paramCount = 1;

        if (filters.from) {
            query += ` AND date >= $${paramCount}`;
            values.push(new Date(filters.from));
            paramCount++;
        }

        if (filters.to) {
            query += ` AND date <= $${paramCount}`;
            values.push(new Date(filters.to));
            paramCount++;
        }

        if (filters.source) {
            query += ` AND source = $${paramCount}`;
            values.push(filters.source);
            paramCount++;
        }

        if (filters.memberId) {
            query += ` AND member_id = $${paramCount}`;
            values.push(filters.memberId);
            paramCount++;
        }

        query += ' ORDER BY date DESC';

        const result = await databaseService.query(query, values);

        return result.rows.map(row => ({
            id: row.id.toString(),
            amount: parseFloat(row.amount),
            currency: row.currency,
            source: row.source,
            memberId: row.memberId,
            date: new Date(row.date).toISOString(),
            notes: row.notes,
            createdAt: new Date(row.createdAt).toISOString()
        }));
    }
}
