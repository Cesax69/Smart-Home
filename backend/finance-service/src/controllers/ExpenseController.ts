import { Request, Response } from 'express';
import { ExpenseService } from '../services/ExpenseService';
import { ExpenseBuilder } from '../builders/ExpenseBuilder';
import { ApiResponse, CreateExpenseRequest, GetExpensesQuery } from '../models/types';

export class ExpenseController {
    private expenseService: ExpenseService;

    constructor() {
        this.expenseService = new ExpenseService();
    }

    /**
     * POST /finance/expenses - Crear gasto
     */
    async createExpense(req: Request, res: Response): Promise<void> {
        try {
            const requestData: CreateExpenseRequest = req.body;

            // Usar Builder para construir y validar
            const expenseData = ExpenseBuilder.fromRequest(requestData);

            // Persistir
            const expense = await this.expenseService.create(expenseData);

            const response: ApiResponse = {
                ok: true,
                data: expense,
                meta: {
                    createdAt: expense.createdAt
                }
            };

            res.status(201).json(response);
        } catch (error) {
            console.error('Error creating expense:', error);

            const response: ApiResponse = {
                ok: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: error instanceof Error ? error.message : 'Error creating expense',
                    details: error instanceof Error ? { field: this.extractField(error.message) } : undefined
                }
            };

            res.status(400).json(response);
        }
    }

    /**
     * GET /finance/expenses - Listar gastos
     */
    async getExpenses(req: Request, res: Response): Promise<void> {
        try {
            const filters: GetExpensesQuery = {
                from: req.query.from as string,
                to: req.query.to as string,
                categoryId: req.query.categoryId as string,
                memberId: req.query.memberId as string
            };

            const expenses = await this.expenseService.findAll(filters);

            const range = this.calculateRange(filters.from, filters.to);

            const response: ApiResponse = {
                ok: true,
                data: {
                    items: expenses
                },
                meta: {
                    count: expenses.length,
                    currency: expenses.length > 0 ? expenses[0].currency : 'USD',
                    range
                }
            };

            res.status(200).json(response);
        } catch (error) {
            console.error('Error getting expenses:', error);

            const response: ApiResponse = {
                ok: false,
                error: {
                    code: 'SERVER_ERROR',
                    message: 'Error retrieving expenses'
                }
            };

            res.status(500).json(response);
        }
    }

    private extractField(message: string): string | undefined {
        if (message.includes('amount')) return 'amount';
        if (message.includes('currency')) return 'currency';
        if (message.includes('categoryId')) return 'categoryId';
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
