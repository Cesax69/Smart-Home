"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QueryBuilder = void 0;
class QueryBuilder {
    constructor(baseSql) {
        this.conditions = [];
        this.groupByClause = '';
        this.orderByClause = '';
        this.base = baseSql.trim();
    }
    where(sql, ...params) {
        this.conditions.push({ sql, params });
        return this;
    }
    groupBy(sql) {
        this.groupByClause = sql;
        return this;
    }
    orderBy(sql) {
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
exports.QueryBuilder = QueryBuilder;
