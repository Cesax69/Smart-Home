"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSummary = exports.getReport = exports.createIncome = exports.listIncome = exports.createExpense = exports.listExpenses = void 0;
const database_1 = require("../config/database");
const expenseReportBuilder_1 = require("../builders/expenseReportBuilder");
const listExpenses = async (familyId, startDate, endDate, category) => {
    const sql = `SELECT id, family_id AS "familyId", member_id AS "memberId", category, amount, currency, occurred_at AS "occurredAt", notes
               FROM finance_expenses
               WHERE family_id = $1
                 AND ($2::text IS NULL OR occurred_at >= $2::timestamptz)
                 AND ($3::text IS NULL OR occurred_at <= $3::timestamptz)
                 AND ($4::text IS NULL OR category = $4)`;
    const { rows } = await (0, database_1.query)(sql, [familyId, startDate || null, endDate || null, category || null]);
    return rows;
};
exports.listExpenses = listExpenses;
const createExpense = async (payload) => {
    const sql = `INSERT INTO finance_expenses (family_id, member_id, category, amount, currency, occurred_at, notes)
               VALUES ($1, $2, $3, $4, $5, $6::timestamptz, $7)
               RETURNING id`;
    const params = [payload.familyId, payload.memberId || null, payload.category, payload.amount, payload.currency, payload.occurredAt, payload.notes || null];
    const { rows } = await (0, database_1.query)(sql, params);
    return { id: rows[0].id };
};
exports.createExpense = createExpense;
const listIncome = async (familyId, startDate, endDate, source) => {
    const sql = `SELECT id, family_id AS "familyId", member_id AS "memberId", source, amount, currency, occurred_at AS "occurredAt", notes
               FROM finance_income
               WHERE family_id = $1
                 AND ($2::text IS NULL OR occurred_at >= $2::timestamptz)
                 AND ($3::text IS NULL OR occurred_at <= $3::timestamptz)
                 AND ($4::text IS NULL OR source = $4)`;
    const { rows } = await (0, database_1.query)(sql, [familyId, startDate || null, endDate || null, source || null]);
    return rows;
};
exports.listIncome = listIncome;
const createIncome = async (payload) => {
    const sql = `INSERT INTO finance_income (family_id, member_id, source, amount, currency, occurred_at, notes)
               VALUES ($1, $2, $3, $4, $5, $6::timestamptz, $7)
               RETURNING id`;
    const params = [payload.familyId, payload.memberId || null, payload.source, payload.amount, payload.currency, payload.occurredAt, payload.notes || null];
    const { rows } = await (0, database_1.query)(sql, params);
    return { id: rows[0].id };
};
exports.createIncome = createIncome;
const getReport = async (rq) => {
    const builder = new expenseReportBuilder_1.ExpenseReportBuilder(rq);
    const result = {};
    if (rq.includeExpenses !== false) {
        const { sql, params } = builder.buildExpenses();
        const { rows } = await (0, database_1.query)(sql, params);
        result.expenses = rows;
    }
    if (rq.includeIncome) {
        const { sql, params } = builder.buildIncome();
        const { rows } = await (0, database_1.query)(sql, params);
        result.income = rows;
    }
    return result;
};
exports.getReport = getReport;
const getSummary = async (sq) => {
    const expensesSql = `SELECT COALESCE(SUM(amount),0) AS total_expenses
                       FROM finance_expenses
                       WHERE family_id = $1
                         AND ($2::text IS NULL OR occurred_at >= $2::timestamptz)
                         AND ($3::text IS NULL OR occurred_at <= $3::timestamptz)`;
    const incomeSql = `SELECT COALESCE(SUM(amount),0) AS total_income
                     FROM finance_income
                     WHERE family_id = $1
                       AND ($2::text IS NULL OR occurred_at >= $2::timestamptz)
                       AND ($3::text IS NULL OR occurred_at <= $3::timestamptz)`;
    const [expensesRes, incomeRes] = await Promise.all([
        (0, database_1.query)(expensesSql, [sq.familyId, sq.startDate || null, sq.endDate || null]),
        (0, database_1.query)(incomeSql, [sq.familyId, sq.startDate || null, sq.endDate || null])
    ]);
    const totalExpenses = expensesRes.rows[0]?.total_expenses || 0;
    const totalIncome = incomeRes.rows[0]?.total_income || 0;
    return {
        totalExpenses,
        totalIncome,
        balance: totalIncome - totalExpenses
    };
};
exports.getSummary = getSummary;
