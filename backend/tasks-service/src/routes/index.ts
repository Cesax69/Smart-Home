import { Router } from 'express';
import taskRoutes from './taskRoutes';

const router = Router();

// Montar las rutas de tareas
router.use('/api', taskRoutes);

// Ruta raíz del servicio
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Tasks Service - API REST para gestión de tareas del hogar',
    version: '1.0.0',
    endpoints: {
      health: 'GET /api/health',
      tasks: {
        create: 'POST /api/tasks',
        getAll: 'GET /api/tasks',
        getById: 'GET /api/tasks/:id',
        update: 'PUT /api/tasks/:id',
        delete: 'DELETE /api/tasks/:id',
        comments: {
          get: 'GET /api/tasks/:id/comments',
          add: 'POST /api/tasks/:id/comments'
        },
        files: {
          get: 'GET /api/tasks/:id/files',
          add: 'POST /api/tasks/:id/files',
          delete: 'DELETE /api/tasks/files/:fileRecordId'
        }
      },
      files: {
        listByTask: 'GET /api/tasks/:id/files',
        registerForTask: 'POST /api/tasks/:id/files',
        updateRecord: 'PUT /api/tasks/files/:fileRecordId',
        deleteRecord: 'DELETE /api/tasks/files/:fileRecordId'
      },
      queryParams: {
        filterByUser: 'GET /api/tasks?userId=:userId',
        filterByStatus: 'GET /api/tasks?status=:status'
      }
    },
    documentation: {
      taskStatuses: ['pendiente', 'en_proceso', 'completada'],
      requiredFields: {
        create: ['description', 'assignedUserId'],
        update: 'Al menos un campo: description, status, assignedUserId, fileUrl'
      }
    }
  });
});

export default router;