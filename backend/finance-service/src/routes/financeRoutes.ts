import { Router } from 'express';
import { ExpenseController } from '../controllers/ExpenseController';
import { IncomeController } from '../controllers/IncomeController';
import { ReportController } from '../controllers/ReportController';
import { BalanceController } from '../controllers/BalanceController';

const router = Router();

const expenseController = new ExpenseController();
const incomeController = new IncomeController();
const reportController = new ReportController();
const balanceController = new BalanceController();

// ============= Expense Routes =============
router.post('/expenses', (req, res) => expenseController.createExpense(req, res));
router.get('/expenses', (req, res) => expenseController.getExpenses(req, res));
router.get('/expenses/:id', (req, res) => expenseController.getExpenseById(req, res));
router.put('/expenses/:id', (req, res) => expenseController.updateExpense(req, res));
router.delete('/expenses/:id', (req, res) => expenseController.deleteExpense(req, res));

// ============= Income Routes =============
router.post('/income', (req, res) => incomeController.createIncome(req, res));
router.get('/income', (req, res) => incomeController.getIncome(req, res));
router.get('/income/:id', (req, res) => incomeController.getIncomeById(req, res));
router.put('/income/:id', (req, res) => incomeController.updateIncome(req, res));
router.delete('/income/:id', (req, res) => incomeController.deleteIncome(req, res));

// ============= Report Routes =============
router.get('/report', (req, res) => reportController.getReport(req, res));

// ============= Balance Routes =============
router.get('/balance', (req, res) => balanceController.getBalance(req, res));

export default router;
