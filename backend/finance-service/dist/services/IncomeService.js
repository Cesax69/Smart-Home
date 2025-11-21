"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IncomeService = void 0;
const database_1 = require("../config/database");
class IncomeService {
    async create(incomeData) {
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
        const result = await database_1.databaseService.query(query, values);
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
    async findAll(filters) {
        let query = `
      SELECT id, amount, currency, source, member_id as "memberId",
             date, notes, created_at as "createdAt"
      FROM income
      WHERE 1=1
    `;
        const values = [];
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
        const result = await database_1.databaseService.query(query, values);
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
    async findById(id) {
        const query = `
      SELECT id, amount, currency, source, member_id as "memberId",
             date, notes, created_at as "createdAt"
      FROM income
      WHERE id = $1
    `;
        const result = await database_1.databaseService.query(query, [id]);
        if (result.rows.length === 0)
            return null;
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
    async update(id, data) {
        const fields = [];
        const values = [];
        let i = 1;
        if (data.amount !== undefined) {
            fields.push(`amount = $${i++}`);
            values.push(data.amount);
        }
        if (data.currency !== undefined) {
            fields.push(`currency = $${i++}`);
            values.push(data.currency);
        }
        if (data.source !== undefined || data.sourceId !== undefined) {
            fields.push(`source = $${i++}`);
            values.push(data.source ?? data.sourceId);
        }
        if (data.memberId !== undefined) {
            fields.push(`member_id = $${i++}`);
            values.push(data.memberId);
        }
        if (data.date !== undefined) {
            fields.push(`date = $${i++}`);
            values.push(new Date(data.date));
        }
        if (data.notes !== undefined) {
            fields.push(`notes = $${i++}`);
            values.push(data.notes);
        }
        if (fields.length === 0) {
            return this.findById(id);
        }
        const query = `
      UPDATE income SET ${fields.join(', ')}
      WHERE id = $${i}
      RETURNING id, amount, currency, source, member_id as "memberId",
                date, notes, created_at as "createdAt"
    `;
        values.push(id);
        const result = await database_1.databaseService.query(query, values);
        if (result.rows.length === 0)
            return null;
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
    async delete(id) {
        const result = await database_1.databaseService.query('DELETE FROM income WHERE id = $1', [id]);
        return (result.rowCount ?? 0) > 0;
    }
}
exports.IncomeService = IncomeService;
//# sourceMappingURL=IncomeService.js.map