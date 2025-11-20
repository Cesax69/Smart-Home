import { Router } from 'express';
import { ExpenseController } from '../controllers/ExpenseController';
import { IncomeController } from '../controllers/IncomeController';
import { ReportController } from '../controllers/ReportController';
import { TaskController } from '../controllers/TaskController';

const router = Router();

const expenseController = new ExpenseController();
const incomeController = new IncomeController();
const reportController = new ReportController();
const taskController = new TaskController();

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

export default router;
