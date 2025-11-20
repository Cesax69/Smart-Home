"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExpenseController = void 0;
const ExpenseService_1 = require("../services/ExpenseService");
const ExpenseBuilder_1 = require("../builders/ExpenseBuilder");
class ExpenseController {
    constructor() {
        this.expenseService = new ExpenseService_1.ExpenseService();
    }
    /**
     * POST /finance/expenses - Crear gasto
     */
    async createExpense(req, res) {
        try {
            const requestData = req.body;
            // Usar Builder para construir y validar
            const expenseData = ExpenseBuilder_1.ExpenseBuilder.fromRequest(requestData);
            // Persistir
            const expense = await this.expenseService.create(expenseData);
            const response = {
                ok: true,
                data: expense,
                meta: {
                    createdAt: expense.createdAt
                }
            };
            res.status(201).json(response);
        }
        catch (error) {
            console.error('Error creating expense:', error);
            const response = {
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
    async getExpenses(req, res) {
        try {
            const filters = {
                from: req.query.from,
                to: req.query.to,
                categoryId: req.query.categoryId,
                memberId: req.query.memberId
            };
            const expenses = await this.expenseService.findAll(filters);
            const range = this.calculateRange(filters.from, filters.to);
            const response = {
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
        }
        catch (error) {
            console.error('Error getting expenses:', error);
            const response = {
                ok: false,
                error: {
                    code: 'SERVER_ERROR',
                    message: 'Error retrieving expenses'
                }
            };
            res.status(500).json(response);
        }
    }
    extractField(message) {
        if (message.includes('amount'))
            return 'amount';
        if (message.includes('currency'))
            return 'currency';
        if (message.includes('categoryId'))
            return 'categoryId';
        return undefined;
    }
    calculateRange(from, to) {
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
exports.ExpenseController = ExpenseController;
//# sourceMappingURL=ExpenseController.js.map