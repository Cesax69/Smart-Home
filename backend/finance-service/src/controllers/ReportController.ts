import { Request, Response } from 'express';
import { ReportService } from '../services/ReportService';
import { FinanceReportQueryBuilder } from '../builders/FinanceReportQueryBuilder';
import { ApiResponse } from '../models/types';

export class ReportController {
    private reportService: ReportService;

    constructor() {
        this.reportService = new ReportService();
    }

    /**
     * GET /finance/report - Generar reporte financiero
     */
    async getReport(req: Request, res: Response): Promise<void> {
        try {
            // Usar Builder para construir query
            const query = FinanceReportQueryBuilder.fromQueryParams(req.query);

            // Generar reporte
            const result = await this.reportService.generateReport(query);

            const response: ApiResponse = {
                ok: true,
                data: result.data,
                meta: result.meta
            };

            res.status(200).json(response);
        } catch (error) {
            console.error('Error generating report:', error);

            const response: ApiResponse = {
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
