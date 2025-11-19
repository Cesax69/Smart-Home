import { Request, Response, NextFunction } from 'express';
import { getSummary } from '../services/financeService';

export const getSummaryController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { familyId, startDate, endDate } = req.query as any;
    if (!familyId) return res.status(400).json({ error: 'familyId es requerido' });
    const result = await getSummary({ familyId: String(familyId), startDate: String(startDate || ''), endDate: String(endDate || '') });
    res.json(result);
  } catch (err) {
    next(err);
  }
};