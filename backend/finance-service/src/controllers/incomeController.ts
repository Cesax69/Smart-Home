import { Request, Response, NextFunction } from 'express';
import { createIncome, listIncome } from '../services/financeService';

export const getIncome = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { familyId, startDate, endDate, source } = req.query as any;
    if (!familyId) return res.status(400).json({ error: 'familyId es requerido' });
    const rows = await listIncome(String(familyId), String(startDate || ''), String(endDate || ''), String(source || ''));
    res.json(rows);
  } catch (err) {
    next(err);
  }
};

export const postIncome = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const payload = req.body;
    if (!payload?.familyId || !payload?.source || !payload?.amount || !payload?.currency || !payload?.occurredAt) {
      return res.status(400).json({ error: 'Campos requeridos: familyId, source, amount, currency, occurredAt' });
    }
    const result = await createIncome(payload);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
};