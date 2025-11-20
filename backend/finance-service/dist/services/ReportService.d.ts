import { FinanceReportQuery, FinanceReportData } from '../models/types';
export declare class ReportService {
    /**
     * Genera un reporte financiero con labels y datasets para gráficas
     */
    generateReport(query: FinanceReportQuery): Promise<{
        data: FinanceReportData;
        meta: any;
    }>;
    private aggregateByDate;
    private aggregateByCategory;
    private aggregateByMember;
    private calculateDateRange;
    private generateDateLabels;
}
//# sourceMappingURL=ReportService.d.ts.map