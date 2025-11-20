"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const ExpenseController_1 = require("../controllers/ExpenseController");
const IncomeController_1 = require("../controllers/IncomeController");
const ReportController_1 = require("../controllers/ReportController");
const TaskController_1 = require("../controllers/TaskController");
const router = (0, express_1.Router)();
const expenseController = new ExpenseController_1.ExpenseController();
const incomeController = new IncomeController_1.IncomeController();
const reportController = new ReportController_1.ReportController();
const taskController = new TaskController_1.TaskController();
// ============= Expense Routes =============
router.post('/expenses', (req, res) => expenseController.createExpense(req, res));
router.get('/expenses', (req, res) => expenseController.getExpenses(req, res));
router.put('/expenses/:id', (req, res) => expenseController.updateExpense(req, res));
router.delete('/expenses/:id', (req, res) => expenseController.deleteExpense(req, res));
// ============= Income Routes =============
router.post('/income', (req, res) => incomeController.createIncome(req, res));
router.get('/income', (req, res) => incomeController.getIncome(req, res));
router.put('/income/:id', (req, res) => incomeController.updateIncome(req, res));
router.delete('/income/:id', (req, res) => incomeController.deleteIncome(req, res));
// ============= Report Routes =============
router.get('/report', (req, res) => reportController.getReport(req, res));
// ============= Task Routes =============
router.get('/tasks/by-member', (req, res) => taskController.getTasksByMember(req, res));
exports.default = router;
//# sourceMappingURL=financeRoutes.js.map