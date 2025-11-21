import { Router } from 'express';
import { TaskController } from '../controllers/TaskController';

const router = Router();
const taskController = new TaskController();

// ============= Task Routes =============
router.get('/by-member', (req, res) => taskController.getTasksByMember(req, res));

export default router;
