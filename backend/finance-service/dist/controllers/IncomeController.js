"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IncomeController = void 0;
const IncomeService_1 = require("../services/IncomeService");
const IncomeBuilder_1 = require("../builders/IncomeBuilder");
class IncomeController {
    constructor() {
        this.incomeService = new IncomeService_1.IncomeService();
    }
    async createIncome(req, res) {
        try {
            const requestData = req.body;
            // Usar el Builder para construir y validar
            const income = IncomeBuilder_1.IncomeBuilder.fromRequest(requestData);
            // Guardar en la BD
            const saved = await this.incomeService.create(income);
            const response = {
                ok: true,
                data: saved,
                meta: {
                    createdAt: saved.createdAt
                }
            };
            res.status(201).json(response);
        }
        catch (error) {
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
    async getIncome(req, res) {
        try {
            const { from, to, source, memberId } = req.query;
            const filters = {
                from: from,
                to: to,
                source: source,
                memberId: memberId
            };
            const income = await this.incomeService.findAll(filters);
            // Calculate range
            const now = new Date();
            const thirtyDaysAgo = new Date(now);
            thirtyDaysAgo.setDate(now.getDate() - 30);
            const response = {
                ok: true,
                data: {
                    items: income
                },
                meta: {
                    count: income.length,
                    currency: 'USD',
                    range: {
                        start: from ? new Date(from).toISOString() : thirtyDaysAgo.toISOString(),
                        end: to ? new Date(to).toISOString() : now.toISOString()
                    }
                }
            };
            res.status(200).json(response);
        }
        catch (error) {
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
    async updateIncome(req, res) {
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
            const response = {
                ok: true,
                data: updated,
                meta: {
                    updatedAt: new Date().toISOString()
                }
            };
            res.status(200).json(response);
        }
        catch (error) {
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
    async deleteIncome(req, res) {
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
        }
        catch (error) {
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
exports.IncomeController = IncomeController;
//# sourceMappingURL=IncomeController.js.map