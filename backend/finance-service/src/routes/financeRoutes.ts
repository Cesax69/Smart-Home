import { Router } from 'express';
import { getExpenses, postExpense } from '../controllers/expensesController';
import { getIncome, postIncome } from '../controllers/incomeController';
import { postReport } from '../controllers/reportsController';
import { getSummaryController } from '../controllers/summaryController';

const router = Router();

router.get('/expenses', getExpenses);
router.post('/expenses', postExpense);

router.get('/income', getIncome);
router.post('/income', postIncome);

router.post('/reports', postReport);

router.get('/summary', getSummaryController);

export default router;