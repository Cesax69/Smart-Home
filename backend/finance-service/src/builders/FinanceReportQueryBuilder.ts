import { FinanceReportQuery, DateRange } from '../models/types';

export class FinanceReportQueryBuilder {
    private query: FinanceReportQuery = {};

    setPeriod(period?: 'week' | 'month' | 'year'): this {
        if (period) {
            this.query.period = period;
        }
        return this;
    }

    setFrom(from?: string): this {
        if (from) {
            this.query.from = new Date(from).toISOString();
        }
        return this;
    }

    setTo(to?: string): this {
        if (to) {
            this.query.to = new Date(to).toISOString();
        }
        return this;
    }

    setGroupBy(groupBy?: 'category' | 'member' | 'date'): this {
        if (groupBy) {
            this.query.groupBy = groupBy;
        }
        return this;
    }

    setCurrency(currency?: string): this {
        this.query.currency = currency || 'USD';
        return this;
    }

    build(): FinanceReportQuery {
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

    static fromQueryParams(params: any): FinanceReportQuery {
        return new FinanceReportQueryBuilder()
            .setPeriod(params.period)
            .setFrom(params.from)
            .setTo(params.to)
            .setGroupBy(params.groupBy)
            .setCurrency(params.currency)
            .build();
    }
}
