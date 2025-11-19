"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.postIncome = exports.getIncome = void 0;
const financeService_1 = require("../services/financeService");
const getIncome = async (req, res, next) => {
    try {
        const { familyId, startDate, endDate, source } = req.query;
        if (!familyId)
            return res.status(400).json({ error: 'familyId es requerido' });
        const rows = await (0, financeService_1.listIncome)(String(familyId), String(startDate || ''), String(endDate || ''), String(source || ''));
        res.json(rows);
    }
    catch (err) {
        next(err);
    }
};
exports.getIncome = getIncome;
const postIncome = async (req, res, next) => {
    try {
        const payload = req.body;
        if (!payload?.familyId || !payload?.source || !payload?.amount || !payload?.currency || !payload?.occurredAt) {
            return res.status(400).json({ error: 'Campos requeridos: familyId, source, amount, currency, occurredAt' });
        }
        const result = await (0, financeService_1.createIncome)(payload);
        res.status(201).json(result);
    }
    catch (err) {
        next(err);
    }
};
exports.postIncome = postIncome;
