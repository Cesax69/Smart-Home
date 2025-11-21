"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IncomeController = void 0;
const IncomeService_1 = require("../services/IncomeService");
const IncomeBuilder_1 = require("../builders/IncomeBuilder");
class IncomeController {
    constructor() {
        this.incomeService = new IncomeService_1.IncomeService();
    }
    /**
     * POST /finance/income - Crear ingreso
     */
    async createIncome(req, res) {
        try {
            const requestData = req.body;
            // Usar Builder para construir y validar
            const incomeData = IncomeBuilder_1.IncomeBuilder.fromRequest(requestData);
            // Persistir
            const income = await this.incomeService.create(incomeData);
            const response = {
                ok: true,
                data: income,
                meta: {
                    createdAt: income.createdAt
                }
            };
            res.status(201).json(response);
        }
        catch (error) {
            console.error('Error creating income:', error);
            const response = {
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
    async getIncome(req, res) {
        try {
            const filters = {
                from: req.query.from,
                to: req.query.to,
                source: req.query.source,
                memberId: req.query.memberId
            };
            const income = await this.incomeService.findAll(filters);
            const range = this.calculateRange(filters.from, filters.to);
            const response = {
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
        }
        catch (error) {
            console.error('Error getting income:', error);
            const response = {
                ok: false,
                error: {
                    code: 'SERVER_ERROR',
                    message: 'Error retrieving income'
                }
            };
            res.status(500).json(response);
        }
    }
    /**
     * GET /finance/income/:id - Obtener ingreso por ID
     */
    async getIncomeById(req, res) {
        try {
            const { id } = req.params;
            const income = await this.incomeService.findById(id);
            if (!income) {
                const response = {
                    ok: false,
                    error: { code: 'NOT_FOUND', message: 'Income not found' }
                };
                res.status(404).json(response);
                return;
            }
            const response = { ok: true, data: income };
            res.status(200).json(response);
        }
        catch (error) {
            console.error('Error getting income by id:', error);
            const response = {
                ok: false,
                error: { code: 'SERVER_ERROR', message: 'Error retrieving income' }
            };
            res.status(500).json(response);
        }
    }
    /**
     * PUT /finance/income/:id - Actualizar ingreso
     */
    async updateIncome(req, res) {
        try {
            const { id } = req.params;
            const updated = await this.incomeService.update(id, req.body || {});
            if (!updated) {
                const response = {
                    ok: false,
                    error: { code: 'NOT_FOUND', message: 'Income not found' }
                };
                res.status(404).json(response);
                return;
            }
            const response = { ok: true, data: updated };
            res.status(200).json(response);
        }
        catch (error) {
            console.error('Error updating income:', error);
            const response = {
                ok: false,
                error: { code: 'SERVER_ERROR', message: 'Error updating income' }
            };
            res.status(500).json(response);
        }
    }
    /**
     * DELETE /finance/income/:id - Eliminar ingreso
     */
    async deleteIncome(req, res) {
        try {
            const { id } = req.params;
            const success = await this.incomeService.delete(id);
            const response = { ok: success };
            res.status(success ? 200 : 404).json(success ? response : { ok: false, error: { code: 'NOT_FOUND', message: 'Income not found' } });
        }
        catch (error) {
            console.error('Error deleting income:', error);
            const response = {
                ok: false,
                error: { code: 'SERVER_ERROR', message: 'Error deleting income' }
            };
            res.status(500).json(response);
        }
    }
    extractField(message) {
        if (message.includes('amount'))
            return 'amount';
        if (message.includes('currency'))
            return 'currency';
        if (message.includes('source'))
            return 'source';
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
exports.IncomeController = IncomeController;
//# sourceMappingURL=IncomeController.js.map