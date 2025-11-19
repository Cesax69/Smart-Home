"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSummaryController = void 0;
const financeService_1 = require("../services/financeService");
const getSummaryController = async (req, res, next) => {
    try {
        const { familyId, startDate, endDate } = req.query;
        if (!familyId)
            return res.status(400).json({ error: 'familyId es requerido' });
        const result = await (0, financeService_1.getSummary)({ familyId: String(familyId), startDate: String(startDate || ''), endDate: String(endDate || '') });
        res.json(result);
    }
    catch (err) {
        next(err);
    }
};
exports.getSummaryController = getSummaryController;
