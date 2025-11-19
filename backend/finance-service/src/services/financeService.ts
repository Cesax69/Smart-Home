import { query } from '../config/database';
import { ExpenseRecord, IncomeRecord, ReportQuery, SummaryQuery } from '../types/finance';
import { ExpenseReportBuilder } from '../builders/expenseReportBuilder';

export const listExpenses = async (familyId: string, startDate?: string, endDate?: string, category?: string) => {
  const sql = `SELECT id, family_id AS "familyId", member_id AS "memberId", category, amount, currency, occurred_at AS "occurredAt", notes
               FROM finance_expenses
               WHERE family_id = $1
                 AND ($2::text IS NULL OR occurred_at >= $2::timestamptz)
                 AND ($3::text IS NULL OR occurred_at <= $3::timestamptz)
                 AND ($4::text IS NULL OR category = $4)`;
  const { rows } = await query(sql, [familyId, startDate || null, endDate || null, category || null]);
  return rows;
};

export const createExpense = async (payload: ExpenseRecord) => {
  const sql = `INSERT INTO finance_expenses (family_id, member_id, category, amount, currency, occurred_at, notes)
               VALUES ($1, $2, $3, $4, $5, $6::timestamptz, $7)
               RETURNING id`;
  const params = [payload.familyId, payload.memberId || null, payload.category, payload.amount, payload.currency, payload.occurredAt, payload.notes || null];
  const { rows } = await query(sql, params);
  return { id: rows[0].id };
};

export const listIncome = async (familyId: string, startDate?: string, endDate?: string, source?: string) => {
  const sql = `SELECT id, family_id AS "familyId", member_id AS "memberId", source, amount, currency, occurred_at AS "occurredAt", notes
               FROM finance_income
               WHERE family_id = $1
                 AND ($2::text IS NULL OR occurred_at >= $2::timestamptz)
                 AND ($3::text IS NULL OR occurred_at <= $3::timestamptz)
                 AND ($4::text IS NULL OR source = $4)`;
  const { rows } = await query(sql, [familyId, startDate || null, endDate || null, source || null]);
  return rows;
};

export const createIncome = async (payload: IncomeRecord) => {
  const sql = `INSERT INTO finance_income (family_id, member_id, source, amount, currency, occurred_at, notes)
               VALUES ($1, $2, $3, $4, $5, $6::timestamptz, $7)
               RETURNING id`;
  const params = [payload.familyId, payload.memberId || null, payload.source, payload.amount, payload.currency, payload.occurredAt, payload.notes || null];
  const { rows } = await query(sql, params);
  return { id: rows[0].id };
};

export const getReport = async (rq: ReportQuery) => {
  const builder = new ExpenseReportBuilder(rq);
  const result: { expenses?: any[]; income?: any[] } = {};
  if (rq.includeExpenses !== false) {
    const { sql, params } = builder.buildExpenses();
    const { rows } = await query(sql, params);
    result.expenses = rows;
  }
  if (rq.includeIncome) {
    const { sql, params } = builder.buildIncome();
    const { rows } = await query(sql, params);
    result.income = rows;
  }
  return result;
};

export const getSummary = async (sq: SummaryQuery) => {
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
    query(expensesSql, [sq.familyId, sq.startDate || null, sq.endDate || null]),
    query(incomeSql, [sq.familyId, sq.startDate || null, sq.endDate || null])
  ]);

  const totalExpenses = expensesRes.rows[0]?.total_expenses || 0;
  const totalIncome = incomeRes.rows[0]?.total_income || 0;
  return {
    totalExpenses,
    totalIncome,
    balance: totalIncome - totalExpenses
  };
};