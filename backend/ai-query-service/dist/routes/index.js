"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const aiQueryRoutes_1 = __importDefault(require("./aiQueryRoutes"));
const router = (0, express_1.Router)();
// Montar API bajo /api para no usar stripApiPrefix
router.use('/api', aiQueryRoutes_1.default);
router.get('/', (_req, res) => {
    res.json({
        success: true,
        message: 'AI Query Service',
        version: '1.0.0',
        endpoints: {
            health: 'GET /api/health',
            chat: 'POST /api/ai-query/chat'
        }
    });
});
exports.default = router;
