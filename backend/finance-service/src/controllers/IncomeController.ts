import { Request, Response } from 'express';
import { IncomeService } from '../services/IncomeService';
import { IncomeBuilder } from '../builders/IncomeBuilder';
import { ApiResponse, CreateIncomeRequest, GetIncomeQuery } from '../models/types';

export class IncomeController {
    private incomeService: IncomeService;

    constructor() {
        this.incomeService = new IncomeService();
    }

    /**
     * POST /finance/income - Crear ingreso
     */
    async createIncome(req: Request, res: Response): Promise<void> {
        try {
            const requestData: CreateIncomeRequest = req.body;

            // Usar Builder para construir y validar
            const incomeData = IncomeBuilder.fromRequest(requestData);

            // Persistir
            const income = await this.incomeService.create(incomeData);

            const response: ApiResponse = {
                ok: true,
                data: income,
                meta: {
                    createdAt: income.createdAt
                }
            };

            res.status(201).json(response);
        } catch (error) {
            console.error('Error creating income:', error);

            const response: ApiResponse = {
                ok: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: error instanceof Error ? error.message : 'Error creating income',
                    details: error instanceof Error ? { field: this.extractField(error.message) } : undefined
                }
            };

            res.status(400).json(response);
        }
    }

    /**
     * GET /finance/income - Listar ingresos
     */
    async getIncome(req: Request, res: Response): Promise<void> {
        try {
            const filters: GetIncomeQuery = {
                from: req.query.from as string,
                to: req.query.to as string,
                source: req.query.source as string,
                memberId: req.query.memberId as string
            };

            const income = await this.incomeService.findAll(filters);

            const range = this.calculateRange(filters.from, filters.to);

            const response: ApiResponse = {
                ok: true,
                data: {
                    items: income
                },
                meta: {
                    count: income.length,
                    currency: income.length > 0 ? income[0].currency : 'USD',
                    range
                }
            };

            res.status(200).json(response);
        } catch (error) {
            console.error('Error getting income:', error);

            const response: ApiResponse = {
                ok: false,
                error: {
                    code: 'SERVER_ERROR',
                    message: 'Error retrieving income'
                }
            };

            res.status(500).json(response);
        }
    }

    private extractField(message: string): string | undefined {
        if (message.includes('amount')) return 'amount';
        if (message.includes('currency')) return 'currency';
        if (message.includes('source')) return 'source';
        return undefined;
    }

    private calculateRange(from?: string, to?: string): { start: string, end: string } {
        const now = new Date();
        const start = from ? new Date(from) : new Date(now.setDate(now.getDate() - 30));
        const end = to ? new Date(to) : new Date();

        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);

        return {
            start: start.toISOString(),
            end: end.toISOString()
        };
    }
}
