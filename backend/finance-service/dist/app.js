"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const financeRoutes_1 = __importDefault(require("./routes/financeRoutes"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT ? Number(process.env.PORT) : 3007;
app.use((0, cors_1.default)({ origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:4200'] }));
app.use(express_1.default.json());
app.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'finance-service' });
});
// Health bajo el prefijo /api/finance para facilitar chequeo vía Gateway
app.get('/api/finance/health', (_req, res) => {
    res.json({ status: 'ok', service: 'finance-service' });
});
app.use('/api/finance', financeRoutes_1.default);
// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Not Found', path: req.path });
});
// Error handler
app.use((err, _req, res, _next) => {
    console.error('Finance Service Error:', err);
    res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' });
});
app.listen(PORT, () => {
    console.log(`Finance Service listening on port ${PORT}`);
});
exports.default = app;
