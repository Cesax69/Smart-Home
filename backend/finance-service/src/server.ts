import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import financeRoutes from './routes/financeRoutes';
import taskRoutes from './routes/taskRoutes';
import { databaseService } from './config/database';
import { tasksDatabaseService } from './config/tasksDatabase';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3007;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req: Request, res: Response) => {
    res.json({
        ok: true,
        service: 'finance-service',
        status: 'running',
        timestamp: new Date().toISOString()
    });
});

// API Routes
app.use('/finance', financeRoutes);
app.use('/tasks', taskRoutes);

// Root endpoint
app.get('/', (req: Request, res: Response) => {
    res.json({
        ok: true,
        message: 'Finance Service - API REST para gestión de finanzas',
        version: '1.0.0',
        endpoints: {
            health: 'GET /health',
            expenses: {
                create: 'POST /finance/expenses',
                list: 'GET /finance/expenses?from&to&categoryId&memberId'
            },
            income: {
                create: 'POST /finance/income',
                list: 'GET /finance/income?from&to&source&memberId'
            },
            report: {
                generate: 'GET /finance/report?period&from&to&groupBy&currency'
            }
        }
    });
});

// 404 handler
app.use((req: Request, res: Response) => {
    res.status(404).json({
        ok: false,
        error: {
            code: 'NOT_FOUND',
            message: 'Endpoint not found'
        }
    });
});

// Error handler
app.use((err: Error, req: Request, res: Response, next: any) => {
    console.error('Unhandled error:', err);
    res.status(500).json({
        ok: false,
        error: {
            code: 'INTERNAL_ERROR',
            message: 'Internal server error',
            details: process.env.NODE_ENV === 'development' ? err.message : undefined
        }
    });
});

// Start server
async function startServer() {
    try {
        // Test database connection
        const dbConnected = await databaseService.testConnection();
        if (!dbConnected) {
            console.error('Failed to connect to database');
            process.exit(1);
        }

        app.listen(PORT, () => {
            console.log(`🚀 Finance Service running on port ${PORT}`);
            console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
            console.log(`💾 Database: ${databaseService.getConfig().database}`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

startServer();

export default app;
