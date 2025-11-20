"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportController = void 0;
const ReportService_1 = require("../services/ReportService");
const FinanceReportQueryBuilder_1 = require("../builders/FinanceReportQueryBuilder");
class ReportController {
    constructor() {
        this.reportService = new ReportService_1.ReportService();
    }
    /**
     * GET /finance/report - Generar reporte financiero
     */
    async getReport(req, res) {
        try {
            // Usar Builder para construir query
            const query = FinanceReportQueryBuilder_1.FinanceReportQueryBuilder.fromQueryParams(req.query);
            // Generar reporte
            const result = await this.reportService.generateReport(query);
            const response = {
                ok: true,
                data: result.data,
                meta: result.meta
            };
            res.status(200).json(response);
        }
        catch (error) {
            console.error('Error generating report:', error);
            const response = {
                ok: false,
                error: {
                    code: 'SERVER_ERROR',
                    message: 'Error generating financial report',
                    details: error instanceof Error ? error.message : undefined
                }
            };
            res.status(500).json(response);
        }
    }
}
exports.ReportController = ReportController;
//# sourceMappingURL=ReportController.js.map