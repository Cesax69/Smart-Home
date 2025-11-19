import { Request, Response, NextFunction } from 'express';
import { createExpense, listExpenses } from '../services/financeService';

export const getExpenses = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { familyId, startDate, endDate, category } = req.query as any;
    if (!familyId) return res.status(400).json({ error: 'familyId es requerido' });
    const rows = await listExpenses(String(familyId), String(startDate || ''), String(endDate || ''), String(category || ''));
    res.json(rows);
  } catch (err) {
    next(err);
  }
};

export const postExpense = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const payload = req.body;
    if (!payload?.familyId || !payload?.category || !payload?.amount || !payload?.currency || !payload?.occurredAt) {
      return res.status(400).json({ error: 'Campos requeridos: familyId, category, amount, currency, occurredAt' });
    }
    const result = await createExpense(payload);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
};