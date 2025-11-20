"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FinanceReportQueryBuilder = void 0;
class FinanceReportQueryBuilder {
    constructor() {
        this.query = {};
    }
    setPeriod(period) {
        if (period) {
            this.query.period = period;
        }
        return this;
    }
    setFrom(from) {
        if (from) {
            this.query.from = new Date(from).toISOString();
        }
        return this;
    }
    setTo(to) {
        if (to) {
            this.query.to = new Date(to).toISOString();
        }
        return this;
    }
    setGroupBy(groupBy) {
        if (groupBy) {
            this.query.groupBy = groupBy;
        }
        return this;
    }
    setCurrency(currency) {
        this.query.currency = currency || 'USD';
        return this;
    }
    build() {
        // Set defaults
        if (!this.query.currency) {
            this.query.currency = 'USD';
        }
        if (!this.query.groupBy) {
            this.query.groupBy = 'date';
        }
        if (!this.query.period && !this.query.from && !this.query.to) {
            this.query.period = 'month';
        }
        return this.query;
    }
    static fromQueryParams(params) {
        return new FinanceReportQueryBuilder()
            .setPeriod(params.period)
            .setFrom(params.from)
            .setTo(params.to)
            .setGroupBy(params.groupBy)
            .setCurrency(params.currency)
            .build();
    }
}
exports.FinanceReportQueryBuilder = FinanceReportQueryBuilder;
//# sourceMappingURL=FinanceReportQueryBuilder.js.map