"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.postExpense = exports.getExpenses = void 0;
const financeService_1 = require("../services/financeService");
const getExpenses = async (req, res, next) => {
    try {
        const { familyId, startDate, endDate, category } = req.query;
        if (!familyId)
            return res.status(400).json({ error: 'familyId es requerido' });
        const rows = await (0, financeService_1.listExpenses)(String(familyId), String(startDate || ''), String(endDate || ''), String(category || ''));
        res.json(rows);
    }
    catch (err) {
        next(err);
    }
};
exports.getExpenses = getExpenses;
const postExpense = async (req, res, next) => {
    try {
        const payload = req.body;
        if (!payload?.familyId || !payload?.category || !payload?.amount || !payload?.currency || !payload?.occurredAt) {
            return res.status(400).json({ error: 'Campos requeridos: familyId, category, amount, currency, occurredAt' });
        }
        const result = await (0, financeService_1.createExpense)(payload);
        res.status(201).json(result);
    }
    catch (err) {
        next(err);
    }
};
exports.postExpense = postExpense;
