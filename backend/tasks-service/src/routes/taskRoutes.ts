import { Router } from 'express';
import { TaskController } from '../controllers/taskController';

const router = Router();
const taskController = new TaskController();

// Rutas específicas PRIMERO (antes de las rutas con parámetros dinámicos)
router.get('/tasks/:id/debug', (req, res) => taskController.getTaskRawData(req, res));
// Rutas para estadísticas y reportes familiares
router.get('/tasks/stats', (req, res) => taskController.getTaskStats(req, res));
router.get('/tasks/upcoming', (req, res) => taskController.getUpcomingTasks(req, res));
router.get('/tasks/overdue', (req, res) => taskController.getOverdueTasks(req, res));

// Rutas específicas para gestión familiar
router.get('/tasks/member/:userId', (req, res) => taskController.getTasksByMember(req, res));
router.get('/tasks/category/:category', (req, res) => taskController.getTasksByCategory(req, res));
router.get('/tasks/status/:status', (req, res) => taskController.getTasksByStatus(req, res));

// Rutas principales de tareas domésticas (con parámetros dinámicos AL FINAL)
router.post('/tasks', (req, res) => taskController.createTask(req, res));
router.get('/tasks', (req, res) => taskController.getAllTasks(req, res));

// Ruta de prueba para verificar el progress directamente desde la base de datos
// DEBE estar ANTES de /tasks/:id para evitar conflictos
router.get('/tasks/:id/progress-test', (req, res) => taskController.getTaskProgressTest(req, res));

router.get('/tasks/:id', (req, res) => taskController.getTaskById(req, res));
router.put('/tasks/:id', (req, res) => taskController.updateTask(req, res));
router.patch('/tasks/:id/start', (req, res) => taskController.startTask(req, res));
router.patch('/tasks/:id/complete', (req, res) => taskController.completeTask(req, res));
router.patch('/tasks/:id/archive', (req, res) => taskController.archiveTask(req, res));
router.patch('/tasks/:id/unarchive', (req, res) => taskController.unarchiveTask(req, res));
router.delete('/tasks/:id', (req, res) => taskController.deleteTask(req, res));

// Rutas de archivos por tarea
router.get('/tasks/:id/files', (req, res) => taskController.getTaskFiles(req, res));
router.post('/tasks/:id/files', (req, res) => taskController.addTaskFiles(req, res));
router.put('/tasks/files/:fileRecordId', (req, res) => taskController.updateTaskFile(req, res));
router.delete('/tasks/files/:fileRecordId', (req, res) => taskController.deleteTaskFile(req, res));

// Rutas de comentarios por tarea
router.get('/tasks/:id/comments', (req, res) => taskController.getTaskComments(req, res));
router.post('/tasks/:id/comments', (req, res) => taskController.addTaskComment(req, res));

// Health check
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Servicio de tareas domésticas funcionando correctamente',
    timestamp: new Date().toISOString()
  });
});

export default router;