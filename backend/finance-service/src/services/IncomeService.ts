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

        if (filters.currency) {
            query += ` AND currency = $${paramCount}`;
            values.push(filters.currency);
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

    async findById(id: number): Promise<Income | null> {
        const query = `
            SELECT id, amount, currency, source, member_id as "memberId",
                   date, notes, created_at as "createdAt"
            FROM income
            WHERE id = $1
        `;

        const result = await databaseService.query(query, [id]);

        if (result.rows.length === 0) {
            return null;
        }

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

    async update(id: string, updates: Partial<Omit<Income, 'id' | 'createdAt'>>): Promise<Income | null> {
        const setClauses: string[] = [];
        const values: any[] = [];
        let paramCount = 1;

        if (updates.amount !== undefined) {
            setClauses.push(`amount = $${paramCount}`);
            values.push(updates.amount);
            paramCount++;
        }
        if (updates.currency !== undefined) {
            setClauses.push(`currency = $${paramCount}`);
            values.push(updates.currency);
            paramCount++;
        }
        if (updates.source !== undefined) {
            setClauses.push(`source = $${paramCount}`);
            values.push(updates.source);
            paramCount++;
        }
        if (updates.memberId !== undefined) {
            setClauses.push(`member_id = $${paramCount}`);
            values.push(updates.memberId);
            paramCount++;
        }
        if (updates.date !== undefined) {
            setClauses.push(`date = $${paramCount}`);
            values.push(new Date(updates.date));
            paramCount++;
        }
        if (updates.notes !== undefined) {
            setClauses.push(`notes = $${paramCount}`);
            values.push(updates.notes);
            paramCount++;
        }

        if (setClauses.length === 0) {
            return null;
        }

        values.push(id);
        const query = `
      UPDATE income
      SET ${setClauses.join(', ')}
      WHERE id = $${paramCount}
      RETURNING id, amount, currency, source, member_id as "memberId",
                date, notes, created_at as "createdAt"
    `;

        const result = await databaseService.query(query, values);

        if (result.rows.length === 0) {
            return null;
        }

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

    async delete(id: string): Promise<boolean> {
        const query = 'DELETE FROM income WHERE id = $1';
        const result = await databaseService.query(query, [id]);
        return result.rowCount !== null && result.rowCount > 0;
    }
}
