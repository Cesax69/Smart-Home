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
            const { from, to, source, memberId, currency, page, limit, sort } = req.query;
            const filters = {
                from: from,
                to: to,
                source: source,
                memberId: memberId,
                currency: currency
            };
            // Get ALL matching incomes first (for count)
            const allIncome = await this.incomeService.findAll(filters);
            const totalItems = allIncome.length;
            // Parse pagination params
            const currentPage = page ? parseInt(page) : 1;
            const pageSize = limit ? parseInt(limit) : 10;
            const totalPages = Math.ceil(totalItems / pageSize);
            // Calculate pagination
            const startIndex = (currentPage - 1) * pageSize;
            const endIndex = startIndex + pageSize;
            const paginatedItems = allIncome.slice(startIndex, endIndex);
            // Sort if requested
            let sortedItems = paginatedItems;
            if (sort) {
                const [field, direction] = sort.split(':');
                sortedItems = [...paginatedItems].sort((a, b) => {
                    const aVal = a[field];
                    const bVal = b[field];
                    if (direction === 'asc') {
                        return aVal > bVal ? 1 : -1;
                    }
                    else {
                        return aVal < bVal ? 1 : -1;
                    }
                });
            }
            const response = {
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
    async getIncomeById(req, res) {
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
            const response = {
                ok: true,
                data: income
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