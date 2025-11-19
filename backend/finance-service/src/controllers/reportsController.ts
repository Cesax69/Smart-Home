import { Request, Response, NextFunction } from 'express';
import { getReport } from '../services/financeService';

export const postReport = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const rq = req.body;
    if (!rq?.familyId) {
      return res.status(400).json({ error: 'familyId es requerido' });
    }
    const data = await getReport(rq);
    res.json(data);
  } catch (err) {
    next(err);
  }
};