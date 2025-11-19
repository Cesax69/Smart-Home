"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.postReport = void 0;
const financeService_1 = require("../services/financeService");
const postReport = async (req, res, next) => {
    try {
        const rq = req.body;
        if (!rq?.familyId) {
            return res.status(400).json({ error: 'familyId es requerido' });
        }
        const data = await (0, financeService_1.getReport)(rq);
        res.json(data);
    }
    catch (err) {
        next(err);
    }
};
exports.postReport = postReport;
