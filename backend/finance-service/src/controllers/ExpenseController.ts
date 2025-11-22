import { Request, Response } from 'express';
import { ExpenseService } from '../services/ExpenseService';
import { ExpenseBuilder } from '../builders/ExpenseBuilder';
import { CreateExpenseRequest, ApiResponse, ApiError } from '../models/types';

export class ExpenseController {
    private expenseService: ExpenseService;

    constructor() {
        this.expenseService = new ExpenseService();
    }

    async createExpense(req: Request, res: Response): Promise<void> {
        try {
            const requestData: CreateExpenseRequest = req.body;

            // Usar el Builder para construir y validar el expense
            const expense = ExpenseBuilder.fromRequest(requestData);

            // Guardar en la BD
            const saved = await this.expenseService.create(expense);

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
                    message: error.message || 'Error creating expense',
                    details: error
                }
            });
        }
    }

    async getExpenses(req: Request, res: Response): Promise<void> {
        try {
            const { from, to, categoryId, memberId, page, limit, sort } = req.query;

            const filters = {
                from: from as string | undefined,
                to: to as string | undefined,
                categoryId: categoryId as string | undefined,
                memberId: memberId as string | undefined
            };

            // Get ALL matching expenses first (for count)
            const allExpenses = await this.expenseService.findAll(filters);
            const totalItems = allExpenses.length;

            // Parse pagination params
            const currentPage = page ? parseInt(page as string) : 1;
            const pageSize = limit ? parseInt(limit as string) : 10;
            const totalPages = Math.ceil(totalItems / pageSize);

            // Calculate pagination
            const startIndex = (currentPage - 1) * pageSize;
            const endIndex = startIndex + pageSize;
            const paginatedItems = allExpenses.slice(startIndex, endIndex);

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
                    message: error.message || 'Error fetching expenses',
                    details: error
                }
            });
        }
    }

    async getExpenseById(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const expense = await this.expenseService.findById(parseInt(id));

            if (!expense) {
                res.status(404).json({
                    ok: false,
                    error: {
                        code: 'NOT_FOUND',
                        message: `Expense with id ${id} not found`
                    }
                });
                return;
            }

            const response: ApiResponse = {
                ok: true,
                data: expense
            };

            res.status(200).json(response);
        } catch (error: any) {
            res.status(500).json({
                ok: false,
                error: {
                    code: 'INTERNAL_ERROR',
                    message: error.message || 'Error fetching expense',
                    details: error
                }
            });
        }
    }

    async updateExpense(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const updates = req.body;

            // Validate if amount is being updated
            if (updates.amount !== undefined && updates.amount <= 0) {
                throw new Error('Amount must be greater than 0');
            }

            const updated = await this.expenseService.update(id, updates);

            if (!updated) {
                res.status(404).json({
                    ok: false,
                    error: {
                        code: 'NOT_FOUND',
                        message: `Expense with id ${id} not found`
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
                    message: error.message || 'Error updating expense',
                    details: error
                }
            });
        }
    }

    async deleteExpense(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;

            const deleted = await this.expenseService.delete(id);

            if (!deleted) {
                res.status(404).json({
                    ok: false,
                    error: {
                        code: 'NOT_FOUND',
                        message: `Expense with id ${id} not found`
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
                    message: error.message || 'Error deleting expense',
                    details: error
                }
            });
        }
    }
}
