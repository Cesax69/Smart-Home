import { Request, Response } from 'express';
import { IncomeService } from '../services/IncomeService';
import { IncomeBuilder } from '../builders/IncomeBuilder';
import { CreateIncomeRequest, ApiResponse, ApiError } from '../models/types';

export class IncomeController {
    private incomeService: IncomeService;

    constructor() {
        this.incomeService = new IncomeService();
    }

    async createIncome(req: Request, res: Response): Promise<void> {
        try {
            const requestData: CreateIncomeRequest = req.body;

            // Usar el Builder para construir y validar
            const income = IncomeBuilder.fromRequest(requestData);

            // Guardar en la BD
            const saved = await this.incomeService.create(income);

            const response: ApiResponse = {
                ok: true,
                data: saved,
                meta: {
                    createdAt: saved.createdAt
                }
            };

            res.status(201).json(response);
        } catch (error: any) {
            res.status(400).json({
                ok: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: error.message || 'Error creating income',
                    details: error
                }
            });
        }
    }

    async getIncome(req: Request, res: Response): Promise<void> {
        try {
            const { from, to, source, memberId } = req.query;

            const filters = {
                from: from as string | undefined,
                to: to as string | undefined,
                source: source as string | undefined,
                memberId: memberId as string | undefined
            };

            const income = await this.incomeService.findAll(filters);

            // Calculate range
            const now = new Date();
            const thirtyDaysAgo = new Date(now);
            thirtyDaysAgo.setDate(now.getDate() - 30);

            const response: ApiResponse = {
                ok: true,
                data: {
                    items: income
                },
                meta: {
                    count: income.length,
                    currency: 'USD',
                    range: {
                        start: from ? new Date(from as string).toISOString() : thirtyDaysAgo.toISOString(),
                        end: to ? new Date(to as string).toISOString() : now.toISOString()
                    }
                }
            };

            res.status(200).json(response);
        } catch (error: any) {
            res.status(500).json({
                ok: false,
                error: {
                    code: 'INTERNAL_ERROR',
                    message: error.message || 'Error fetching income',
                    details: error
                }
            });
        }
    }

    async updateIncome(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const updates = req.body;

            // Validate if amount is being updated
            if (updates.amount !== undefined && updates.amount <= 0) {
                throw new Error('Amount must be greater than 0');
            }

            const updated = await this.incomeService.update(id, updates);

            if (!updated) {
                res.status(404).json({
                    ok: false,
                    error: {
                        code: 'NOT_FOUND',
                        message: `Income with id ${id} not found`
                    }
                });
                return;
            }

            const response: ApiResponse = {
                ok: true,
                data: updated,
                meta: {
                    updatedAt: new Date().toISOString()
                }
            };

            res.status(200).json(response);
        } catch (error: any) {
            res.status(400).json({
                ok: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: error.message || 'Error updating income',
                    details: error
                }
            });
        }
    }

    async deleteIncome(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;

            const deleted = await this.incomeService.delete(id);

            if (!deleted) {
                res.status(404).json({
                    ok: false,
                    error: {
                        code: 'NOT_FOUND',
                        message: `Income with id ${id} not found`
                    }
                });
                return;
            }

            res.status(204).send();
        } catch (error: any) {
            res.status(500).json({
                ok: false,
                error: {
                    code: 'INTERNAL_ERROR',
                    message: error.message || 'Error deleting income',
                    details: error
                }
            });
        }
    }
}
