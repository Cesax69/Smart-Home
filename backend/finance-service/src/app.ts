import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import financeRouter from './routes/financeRoutes';

dotenv.config();

const app = express();
const PORT = process.env.PORT ? Number(process.env.PORT) : 3007;

app.use(cors({ origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:4200'] }));
app.use(express.json());

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'finance-service' });
});

// Health bajo el prefijo /api/finance para facilitar chequeo vía Gateway
app.get('/api/finance/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'finance-service' });
});

app.use('/api/finance', financeRouter);

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ error: 'Not Found', path: req.path });
});

// Error handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Finance Service Error:', err);
  res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' });
});

app.listen(PORT, () => {
  console.log(`Finance Service listening on port ${PORT}`);
});

export default app;