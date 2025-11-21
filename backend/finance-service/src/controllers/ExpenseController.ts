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
            const { from, to, categoryId, memberId } = req.query;

            const filters = {
                from: from as string | undefined,
                to: to as string | undefined,
                categoryId: categoryId as string | undefined,
                memberId: memberId as string | undefined
            };

            const expenses = await this.expenseService.findAll(filters);

            // Calculate range
            const now = new Date();
            const thirtyDaysAgo = new Date(now);
            thirtyDaysAgo.setDate(now.getDate() - 30);

            const response: ApiResponse = {
                ok: true,
                data: {
                    items: expenses
                },
                meta: {
                    count: expenses.length,
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
                    message: error.message || 'Error fetching expenses',
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
