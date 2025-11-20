import { FinanceReportQuery } from '../models/types';
export declare class FinanceReportQueryBuilder {
    private query;
    setPeriod(period?: 'week' | 'month' | 'year'): this;
    setFrom(from?: string): this;
    setTo(to?: string): this;
    setGroupBy(groupBy?: 'category' | 'member' | 'date'): this;
    setCurrency(currency?: string): this;
    build(): FinanceReportQuery;
    static fromQueryParams(params: any): FinanceReportQuery;
}
//# sourceMappingURL=FinanceReportQueryBuilder.d.ts.map