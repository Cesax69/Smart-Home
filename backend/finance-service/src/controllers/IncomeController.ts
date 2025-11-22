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
            const { from, to, source, memberId, page, limit, sort } = req.query;

            const filters = {
                from: from as string | undefined,
                to: to as string | undefined,
                source: source as string | undefined,
                memberId: memberId as string | undefined
            };

            // Get ALL matching incomes first (for count)
            const allIncome = await this.incomeService.findAll(filters);
            const totalItems = allIncome.length;

            // Parse pagination params
            const currentPage = page ? parseInt(page as string) : 1;
            const pageSize = limit ? parseInt(limit as string) : 10;
            const totalPages = Math.ceil(totalItems / pageSize);

            // Calculate pagination
            const startIndex = (currentPage - 1) * pageSize;
            const endIndex = startIndex + pageSize;
            const paginatedItems = allIncome.slice(startIndex, endIndex);

            // Sort if requested
            let sortedItems = paginatedItems;
            if (sort) {
                const [field, direction] = (sort as string).split(':');
                sortedItems = [...paginatedItems].sort((a: any, b: any) => {
                    const aVal = a[field];
                    const bVal = b[field];
                    if (direction === 'asc') {
                        return aVal > bVal ? 1 : -1;
                    } else {
                        return aVal < bVal ? 1 : -1;
                    }
                });
            }

            const response: ApiResponse = {
                ok: true,
                data: {
                    items: sortedItems
                },
                meta: {
                    page: currentPage,
                    limit: pageSize,
                    totalItems: totalItems,
                    totalPages: totalPages,
                    hasNextPage: currentPage < totalPages,
                    hasPrevPage: currentPage > 1
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

    async getIncomeById(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const income = await this.incomeService.findById(parseInt(id));

            if (!income) {
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
                data: income
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
