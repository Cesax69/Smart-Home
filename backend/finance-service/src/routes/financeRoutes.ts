import { Router } from 'express';
import { ExpenseController } from '../controllers/ExpenseController';
import { IncomeController } from '../controllers/IncomeController';
import { ReportController } from '../controllers/ReportController';

const router = Router();

const expenseController = new ExpenseController();
const incomeController = new IncomeController();
const reportController = new ReportController();

// ============= Expense Routes =============
router.post('/expenses', (req, res) => expenseController.createExpense(req, res));
router.get('/expenses', (req, res) => expenseController.getExpenses(req, res));

// ============= Income Routes =============
router.post('/income', (req, res) => incomeController.createIncome(req, res));
router.get('/income', (req, res) => incomeController.getIncome(req, res));

// ============= Report Routes =============
router.get('/report', (req, res) => reportController.getReport(req, res));

export default router;
