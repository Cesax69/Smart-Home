"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExpenseService = void 0;
const database_1 = require("../config/database");
class ExpenseService {
    async create(expenseData) {
        const query = `
      INSERT INTO expenses (amount, currency, category_id, member_id, date, notes)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, amount, currency, category_id as "categoryId", member_id as "memberId", 
                date, notes, created_at as "createdAt"
    `;
        const values = [
            expenseData.amount,
            expenseData.currency,
            expenseData.categoryId,
            expenseData.memberId || null,
            expenseData.date,
            expenseData.notes || null
        ];
        const result = await database_1.databaseService.query(query, values);
        const row = result.rows[0];
        return {
            id: row.id.toString(),
            amount: parseFloat(row.amount),
            currency: row.currency,
            categoryId: row.categoryId,
            memberId: row.memberId,
            date: new Date(row.date).toISOString(),
            notes: row.notes,
            createdAt: new Date(row.createdAt).toISOString()
        };
    }
    async findAll(filters) {
        let query = `
      SELECT id, amount, currency, category_id as "categoryId", member_id as "memberId",
             date, notes, created_at as "createdAt"
      FROM expenses
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
        if (filters.categoryId) {
            query += ` AND category_id = $${paramCount}`;
            values.push(filters.categoryId);
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
            categoryId: row.categoryId,
            memberId: row.memberId,
            date: new Date(row.date).toISOString(),
            notes: row.notes,
            createdAt: new Date(row.createdAt).toISOString()
        }));
    }
    async update(id, updates) {
        const setClauses = [];
        const values = [];
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
        if (updates.categoryId !== undefined) {
            setClauses.push(`category_id = $${paramCount}`);
            values.push(updates.categoryId);
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
      UPDATE expenses
      SET ${setClauses.join(', ')}
      WHERE id = $${paramCount}
      RETURNING id, amount, currency, category_id as "categoryId", member_id as "memberId",
                date, notes, created_at as "createdAt"
    `;
        const result = await database_1.databaseService.query(query, values);
        if (result.rows.length === 0) {
            return null;
        }
        const row = result.rows[0];
        return {
            id: row.id.toString(),
            amount: parseFloat(row.amount),
            currency: row.currency,
            categoryId: row.categoryId,
            memberId: row.memberId,
            date: new Date(row.date).toISOString(),
            notes: row.notes,
            createdAt: new Date(row.createdAt).toISOString()
        };
    }
    async delete(id) {
        const query = 'DELETE FROM expenses WHERE id = $1';
        const result = await database_1.databaseService.query(query, [id]);
        return result.rowCount !== null && result.rowCount > 0;
    }
}
exports.ExpenseService = ExpenseService;
//# sourceMappingURL=ExpenseService.js.map