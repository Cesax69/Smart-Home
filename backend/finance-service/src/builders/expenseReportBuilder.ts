import { QueryBuilder } from './queryBuilder';
import { ReportQuery } from '../types/finance';

export class ExpenseReportBuilder {
  constructor(private readonly query: ReportQuery) {}

  buildExpenses() {
    const qb = new QueryBuilder(
      'SELECT DATE_TRUNC($1::text, occurred_at) AS period, SUM(amount) AS total FROM finance_expenses'
    );
    const granularity = this.query.period || 'month';
    qb.where('family_id = $2', this.query.familyId)
      .where('$3::text IS NULL OR occurred_at >= $3::timestamptz', this.query.startDate || null)
      .where('$4::text IS NULL OR occurred_at <= $4::timestamptz', this.query.endDate || null);
    if (this.query.categories && this.query.categories.length) {
      qb.where('category = ANY($5)', this.query.categories);
    }
    qb.groupBy('period').orderBy('period ASC');
    const built = qb.build();
    // Pasar granularidad como primer parámetro ($1)
    const sql = built.sql;
    const params = [granularity, ...built.params];
    return { sql, params };
  }

  buildIncome() {
    const qb = new QueryBuilder(
      'SELECT DATE_TRUNC($1::text, occurred_at) AS period, SUM(amount) AS total FROM finance_income'
    );
    const granularity = this.query.period || 'month';
    qb.where('family_id = $2', this.query.familyId)
      .where('$3::text IS NULL OR occurred_at >= $3::timestamptz', this.query.startDate || null)
      .where('$4::text IS NULL OR occurred_at <= $4::timestamptz', this.query.endDate || null);
    qb.groupBy('period').orderBy('period ASC');
    const built = qb.build();
    const sql = built.sql;
    const params = [granularity, ...built.params];
    return { sql, params };
  }
}