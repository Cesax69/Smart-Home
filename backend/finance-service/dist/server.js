"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const financeRoutes_1 = __importDefault(require("./routes/financeRoutes"));
const taskRoutes_1 = __importDefault(require("./routes/taskRoutes"));
const database_1 = require("./config/database");
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3007;
// Middleware
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
// Health check
app.get('/health', (req, res) => {
    res.json({
        ok: true,
        service: 'finance-service',
        status: 'running',
        timestamp: new Date().toISOString()
    });
});
// API Routes
app.use('/finance', financeRoutes_1.default);
app.use('/tasks', taskRoutes_1.default);
// Root endpoint
app.get('/', (req, res) => {
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
app.use((req, res) => {
    res.status(404).json({
        ok: false,
        error: {
            code: 'NOT_FOUND',
            message: 'Endpoint not found'
        }
    });
});
// Error handler
app.use((err, req, res, next) => {
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
        const dbConnected = await database_1.databaseService.testConnection();
        if (!dbConnected) {
            console.error('Failed to connect to database');
            process.exit(1);
        }
        app.listen(PORT, () => {
            console.log(`🚀 Finance Service running on port ${PORT}`);
            console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
            console.log(`💾 Database: ${database_1.databaseService.getConfig().database}`);
        });
    }
    catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}
startServer();
exports.default = app;
//# sourceMappingURL=server.js.map