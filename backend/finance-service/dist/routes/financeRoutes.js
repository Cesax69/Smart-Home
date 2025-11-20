"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const ExpenseController_1 = require("../controllers/ExpenseController");
const IncomeController_1 = require("../controllers/IncomeController");
const ReportController_1 = require("../controllers/ReportController");
const router = (0, express_1.Router)();
const expenseController = new ExpenseController_1.ExpenseController();
const incomeController = new IncomeController_1.IncomeController();
const reportController = new ReportController_1.ReportController();
// ============= Expense Routes =============
router.post('/expenses', (req, res) => expenseController.createExpense(req, res));
router.get('/expenses', (req, res) => expenseController.getExpenses(req, res));
// ============= Income Routes =============
router.post('/income', (req, res) => incomeController.createIncome(req, res));
router.get('/income', (req, res) => incomeController.getIncome(req, res));
// ============= Report Routes =============
router.get('/report', (req, res) => reportController.getReport(req, res));
exports.default = router;
//# sourceMappingURL=financeRoutes.js.map