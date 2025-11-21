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
    /**
     * GET /finance/expenses/:id - Obtener gasto por ID
     */
    async getExpenseById(req, res) {
        try {
            const { id } = req.params;
            const expense = await this.expenseService.findById(id);
            if (!expense) {
                const response = {
                    ok: false,
                    error: { code: 'NOT_FOUND', message: 'Expense not found' }
                };
                res.status(404).json(response);
                return;
            }
            const response = { ok: true, data: expense };
            res.status(200).json(response);
        }
        catch (error) {
            console.error('Error getting expense by id:', error);
            const response = {
                ok: false,
                error: { code: 'SERVER_ERROR', message: 'Error retrieving expense' }
            };
            res.status(500).json(response);
        }
    }
    /**
     * PUT /finance/expenses/:id - Actualizar gasto
     */
    async updateExpense(req, res) {
        try {
            const { id } = req.params;
            const updated = await this.expenseService.update(id, req.body || {});
            if (!updated) {
                const response = {
                    ok: false,
                    error: { code: 'NOT_FOUND', message: 'Expense not found' }
                };
                res.status(404).json(response);
                return;
            }
            const response = { ok: true, data: updated };
            res.status(200).json(response);
        }
        catch (error) {
            console.error('Error updating expense:', error);
            const response = {
                ok: false,
                error: { code: 'SERVER_ERROR', message: 'Error updating expense' }
            };
            res.status(500).json(response);
        }
    }
    /**
     * DELETE /finance/expenses/:id - Eliminar gasto
     */
    async deleteExpense(req, res) {
        try {
            const { id } = req.params;
            const success = await this.expenseService.delete(id);
            const response = { ok: success };
            res.status(success ? 200 : 404).json(success ? response : { ok: false, error: { code: 'NOT_FOUND', message: 'Expense not found' } });
        }
        catch (error) {
            console.error('Error deleting expense:', error);
            const response = {
                ok: false,
                error: { code: 'SERVER_ERROR', message: 'Error deleting expense' }
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