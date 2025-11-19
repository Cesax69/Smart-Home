type Condition = { sql: string; params: any[] };

export class QueryBuilder {
  private base: string;
  private conditions: Condition[] = [];
  private groupByClause = '';
  private orderByClause = '';

  constructor(baseSql: string) {
    this.base = baseSql.trim();
  }

  where(sql: string, ...params: any[]) {
    this.conditions.push({ sql, params });
    return this;
  }

  groupBy(sql: string) {
    this.groupByClause = sql;
    return this;
  }

  orderBy(sql: string) {
    this.orderByClause = sql;
    return this;
  }

  build() {
    const whereSql = this.conditions.length
      ? ' WHERE ' + this.conditions.map((c) => c.sql).join(' AND ')
      : '';
    const params = this.conditions.flatMap((c) => c.params);
    const groupSql = this.groupByClause ? ` GROUP BY ${this.groupByClause}` : '';
    const orderSql = this.orderByClause ? ` ORDER BY ${this.orderByClause}` : '';
    const sql = `${this.base}${whereSql}${groupSql}${orderSql}`;
    return { sql, params };
  }
}