import { Router } from 'express';
import aiQueryRoutes from './aiQueryRoutes';

const router = Router();

// Montar API bajo /api para no usar stripApiPrefix
router.use('/api', aiQueryRoutes);

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

export default router;