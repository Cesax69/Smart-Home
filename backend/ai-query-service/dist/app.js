"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const routes_1 = __importDefault(require("./routes"));
dotenv_1.default.config();
class App {
    constructor() {
        this.app = (0, express_1.default)();
        this.port = parseInt(process.env.PORT || '3006');
        this.initializeMiddlewares();
        this.initializeRoutes();
        this.initializeErrorHandling();
    }
    initializeMiddlewares() {
        this.app.use((0, cors_1.default)({ origin: '*', credentials: true }));
        this.app.use(express_1.default.json({ limit: '2mb' }));
        this.app.use(express_1.default.urlencoded({ extended: true }));
    }
    initializeRoutes() {
        this.app.use('/', routes_1.default);
    }
    initializeErrorHandling() {
        this.app.use('*', (req, res) => {
            res.status(404).json({
                success: false,
                message: `Ruta no encontrada: ${req.method} ${req.originalUrl}`,
                endpoints: {
                    chat: 'POST /api/ai-query/chat',
                    health: 'GET /api/health'
                }
            });
        });
        this.app.use((error, req, res, next) => {
            console.error('❌ Error en ai-query-service:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servicio de IA',
                ...(process.env.NODE_ENV === 'development' && { detail: error?.message })
            });
        });
    }
    listen() {
        this.app.listen(this.port, () => {
            console.log(`🚀 AI Query Service listening at http://localhost:${this.port}`);
        });
    }
}
const server = new App();
server.listen();
exports.default = server;
