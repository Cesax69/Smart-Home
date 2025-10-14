import { Request, Response } from 'express';
import { TaskService } from '../services/taskService';
import { NotificationService } from '../services/notificationService';
import { CreateTaskRequest, UpdateTaskRequest, TaskResponse, TaskCategory, TaskStatus } from '../types/Task';
import { databaseService } from '../config/database';

export class TaskController {
  private taskService: TaskService;
  private notificationService: NotificationService;

  constructor() {
    this.taskService = new TaskService();
    this.notificationService = new NotificationService();
  }

  /**
   * POST /tasks - Crear una nueva tarea doméstica
   */
  async createTask(req: Request, res: Response): Promise<void> {
    try {
      const taskData: CreateTaskRequest = req.body;

      // Validación básica de entrada: permitir uno o varios asignados
      const hasSingleAssignee = !!taskData.assignedUserId && taskData.assignedUserId > 0;
      const hasMultipleAssignees = Array.isArray(taskData.assignedUserIds) && taskData.assignedUserIds.length > 0;

      if (!taskData.title || !taskData.description || (!hasSingleAssignee && !hasMultipleAssignees) || !taskData.createdById || !taskData.category) {
        res.status(400).json({
          success: false,
          message: 'Título, descripción, al menos un asignado (assignedUserId o assignedUserIds), creador y categoría son requeridos'
        } as TaskResponse);
        return;
      }

      const newTask = await this.taskService.createTask(taskData);

      // Send notification for task assignment
      try {
        const assignedUserIds: number[] = [];
        if (hasSingleAssignee) {
          assignedUserIds.push(taskData.assignedUserId!);
        }
        if (hasMultipleAssignees) {
          assignedUserIds.push(...taskData.assignedUserIds!);
        }
        
        await this.notificationService.sendTaskAssignedNotification(newTask, assignedUserIds);
      } catch (notificationError) {
        console.warn('⚠️ Failed to send task assignment notification:', notificationError);
        // Continue with the response even if notification fails
      }

      res.status(201).json({
        success: true,
        data: newTask,
        message: 'Tarea doméstica creada exitosamente'
      } as TaskResponse);

    } catch (error) {
      console.error('Error en createTask controller:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Error interno del servidor'
      } as TaskResponse);
    }
  }

  /**
   * GET /tasks - Obtener todas las tareas domésticas
   */
  async getAllTasks(req: Request, res: Response): Promise<void> {
    try {
      // Verificar si hay un parámetro userId para filtrar tareas
      const userId = req.query.userId ? parseInt(req.query.userId as string) : null;
      
      let tasks;
      if (userId && !isNaN(userId) && userId > 0) {
        // Si se proporciona userId, obtener tareas específicas del usuario
        tasks = await this.taskService.getTasksByMember(userId);
      } else {
        // Si no se proporciona userId, obtener todas las tareas
        tasks = await this.taskService.getAllTasks();
      }

      res.status(200).json({
        success: true,
        data: tasks,
        message: `Se encontraron ${tasks.length} tareas domésticas`
      } as TaskResponse);

    } catch (error) {
      console.error('Error en getAllTasks controller:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Error interno del servidor'
      } as TaskResponse);
    }
  }

  /**
   * GET /tasks/member/:userId - Obtener tareas por miembro de la familia
   */
  async getTasksByMember(req: Request, res: Response): Promise<void> {
    try {
      const userId = parseInt(req.params.userId);

      if (isNaN(userId) || userId <= 0) {
        res.status(400).json({
          success: false,
          message: 'ID de miembro inválido'
        } as TaskResponse);
        return;
      }

      const tasks = await this.taskService.getTasksByMember(userId);

      res.status(200).json({
        success: true,
        data: tasks,
        message: `Se encontraron ${tasks.length} tareas para el miembro`
      } as TaskResponse);

    } catch (error) {
      console.error('Error en getTasksByMember controller:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Error interno del servidor'
      } as TaskResponse);
    }
  }

  /**
   * GET /tasks/category/:category - Obtener tareas por categoría
   */
  async getTasksByCategory(req: Request, res: Response): Promise<void> {
    try {
      const category = req.params.category as TaskCategory;

      if (!['limpieza', 'cocina', 'lavanderia', 'jardin', 'mantenimiento', 'organizacion', 'mascotas', 'compras', 'otros'].includes(category)) {
        res.status(400).json({
          success: false,
          message: 'Categoría inválida'
        } as TaskResponse);
        return;
      }

      const tasks = await this.taskService.getTasksByCategory(category);

      res.status(200).json({
        success: true,
        data: tasks,
        message: `Se encontraron ${tasks.length} tareas de ${category}`
      } as TaskResponse);

    } catch (error) {
      console.error('Error en getTasksByCategory controller:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Error interno del servidor'
      } as TaskResponse);
    }
  }

  /**
   * GET /tasks/status/:status - Obtener tareas por estado
   */
  async getTasksByStatus(req: Request, res: Response): Promise<void> {
    try {
      const status = req.params.status as TaskStatus;

      if (!['pendiente', 'en_proceso', 'completada'].includes(status)) {
        res.status(400).json({
          success: false,
          message: 'Estado inválido. Debe ser: pendiente, en_proceso o completada'
        } as TaskResponse);
        return;
      }

      const tasks = await this.taskService.getTasksByStatus(status);

      res.status(200).json({
        success: true,
        data: tasks,
        message: `Se encontraron ${tasks.length} tareas ${status}s`
      } as TaskResponse);

    } catch (error) {
      console.error('Error en getTasksByStatus controller:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Error interno del servidor'
      } as TaskResponse);
    }
  }

  /**
   * GET /tasks/stats - Obtener estadísticas de tareas familiares
   */
  async getTaskStats(req: Request, res: Response): Promise<void> {
    try {
      const stats = await this.taskService.getTaskStats();

      res.status(200).json({
        success: true,
        data: stats,
        message: 'Estadísticas de tareas obtenidas exitosamente'
      } as TaskResponse);

    } catch (error) {
      console.error('Error en getTaskStats controller:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Error interno del servidor'
      } as TaskResponse);
    }
  }

  /**
   * GET /tasks/upcoming - Obtener tareas que vencen pronto
   */
  async getUpcomingTasks(req: Request, res: Response): Promise<void> {
    try {
      const tasks = await this.taskService.getUpcomingTasks();

      res.status(200).json({
        success: true,
        data: tasks,
        message: `Se encontraron ${tasks.length} tareas próximas a vencer`
      } as TaskResponse);

    } catch (error) {
      console.error('Error en getUpcomingTasks controller:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Error interno del servidor'
      } as TaskResponse);
    }
  }

  /**
   * GET /tasks/overdue - Obtener tareas vencidas
   */
  async getOverdueTasks(req: Request, res: Response): Promise<void> {
    try {
      const tasks = await this.taskService.getOverdueTasks();

      res.status(200).json({
        success: true,
        data: tasks,
        message: `Se encontraron ${tasks.length} tareas vencidas`
      } as TaskResponse);

    } catch (error) {
      console.error('Error en getOverdueTasks controller:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Error interno del servidor'
      } as TaskResponse);
    }
  }

  /**
   * GET /tasks/:id - Obtener una tarea específica por ID
   */
  async getTaskById(req: Request, res: Response): Promise<void> {
    try {
      const taskId = parseInt(req.params.id);
      
      if (isNaN(taskId) || taskId <= 0) {
        res.status(400).json({
          success: false,
          message: 'ID de tarea inválido'
        } as TaskResponse);
        return;
      }

      console.log(`[DEBUG] Controller - Getting task with ID: ${taskId}`);
      const task = await this.taskService.getTaskById(taskId);
      console.log(`[DEBUG] Controller - Retrieved task:`, JSON.stringify(task, null, 2));

      if (!task) {
        res.status(404).json({
          success: false,
          message: 'Tarea no encontrada'
        } as TaskResponse);
        return;
      }

      res.status(200).json({
        success: true,
        data: task
      } as TaskResponse);

    } catch (error) {
      console.error('Error en getTaskById controller:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Error interno del servidor'
      } as TaskResponse);
    }
  }

  /**
   * PUT /tasks/:id - Actualizar una tarea
   */
  async updateTask(req: Request, res: Response): Promise<void> {
    try {
      const taskId = parseInt(req.params.id);
      const updateData: UpdateTaskRequest = req.body;

      // LOGS DE DEPURACIÓN EN EL CONTROLADOR
      console.log('=== DEPURACIÓN CONTROLLER ===');
      console.log('Task ID:', taskId);
      console.log('Request body:', JSON.stringify(req.body, null, 2));
      console.log('Update data:', JSON.stringify(updateData, null, 2));
      console.log('=== FIN DEPURACIÓN CONTROLLER ===');

      if (isNaN(taskId) || taskId <= 0) {
        res.status(400).json({
          success: false,
          message: 'ID de tarea inválido'
        } as TaskResponse);
        return;
      }

      const updatedTask = await this.taskService.updateTask(taskId, updateData);

      if (!updatedTask) {
        res.status(404).json({
          success: false,
          message: 'Tarea no encontrada'
        } as TaskResponse);
        return;
      }

      res.status(200).json({
        success: true,
        data: updatedTask,
        message: 'Tarea actualizada exitosamente'
      } as TaskResponse);

    } catch (error) {
      console.error('Error en updateTask controller:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Error interno del servidor'
      } as TaskResponse);
    }
  }

  /**
   * DELETE /tasks/:id - Eliminar una tarea
   */
  async deleteTask(req: Request, res: Response): Promise<void> {
    try {
      const taskId = parseInt(req.params.id);

      if (isNaN(taskId) || taskId <= 0) {
        res.status(400).json({
          success: false,
          message: 'ID de tarea inválido'
        } as TaskResponse);
        return;
      }

      const deleted = await this.taskService.deleteTask(taskId);

      if (!deleted) {
        res.status(404).json({
          success: false,
          message: 'Tarea no encontrada'
        } as TaskResponse);
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Tarea eliminada exitosamente'
      } as TaskResponse);

    } catch (error) {
      console.error('Error en deleteTask controller:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Error interno del servidor'
      } as TaskResponse);
    }
  }

  /**
   * GET /tasks/:id/files - Listar archivos de una tarea
   */
  async getTaskFiles(req: Request, res: Response): Promise<void> {
    try {
      const taskId = parseInt(req.params.id);
      if (isNaN(taskId) || taskId <= 0) {
        res.status(400).json({ success: false, message: 'ID de tarea inválido' } as TaskResponse);
        return;
      }
      const files = await this.taskService.getTaskFiles(taskId);
      res.status(200).json({ success: true, data: files, message: `Se encontraron ${files.length} archivos` } as TaskResponse);
    } catch (error) {
      console.error('Error en getTaskFiles controller:', error);
      res.status(500).json({ success: false, message: error instanceof Error ? error.message : 'Error interno del servidor' } as TaskResponse);
    }
  }

  /**
   * POST /tasks/:id/files - Registrar archivos subidos para una tarea
   */
  async addTaskFiles(req: Request, res: Response): Promise<void> {
    try {
      const taskId = parseInt(req.params.id);
      if (isNaN(taskId) || taskId <= 0) {
        res.status(400).json({ success: false, message: 'ID de tarea inválido' } as TaskResponse);
        return;
      }
      const files = Array.isArray(req.body?.files) ? req.body.files : [];
      if (!files.length) {
        res.status(400).json({ success: false, message: 'No se proporcionaron archivos para registrar' } as TaskResponse);
        return;
      }
      // Mapear respuesta de file-upload-service a los campos esperados por task_files
      const mapped = files.map((f: any) => ({
        file_name: f.filename || f.originalName || 'archivo',
        file_path: f.folderId || '',
        file_url: f.fileUrl || f.webViewLink || null,
        file_size: f.size || null,
        file_type: null,
        mime_type: f.mimetype || null,
        uploaded_by: req.body?.uploadedBy || 0,
        storage_type: f.storage || 'google_drive',
        google_drive_id: f.fileId || null,
        is_image: (f.mimetype || '').startsWith('image/'),
        thumbnail_path: null
      }));
      const inserted = await this.taskService.addTaskFiles(taskId, mapped);
      res.status(201).json({ success: true, data: inserted, message: `Se registraron ${inserted.length} archivos` } as TaskResponse);
    } catch (error) {
      console.error('Error en addTaskFiles controller:', error);
      res.status(500).json({ success: false, message: error instanceof Error ? error.message : 'Error interno del servidor' } as TaskResponse);
    }
  }

  /**
   * DELETE /tasks/files/:fileRecordId - Eliminar registro de archivo de una tarea
   */
  async deleteTaskFile(req: Request, res: Response): Promise<void> {
    try {
      const fileRecordId = parseInt(req.params.fileRecordId);
      if (isNaN(fileRecordId) || fileRecordId <= 0) {
        res.status(400).json({ success: false, message: 'ID de archivo inválido' } as TaskResponse);
        return;
      }
      const deleted = await this.taskService.deleteTaskFile(fileRecordId);
      if (!deleted) {
        res.status(404).json({ success: false, message: 'Archivo no encontrado' } as TaskResponse);
        return;
      }
      res.status(200).json({ success: true, message: 'Archivo eliminado exitosamente' } as TaskResponse);
    } catch (error) {
      console.error('Error en deleteTaskFile controller:', error);
      res.status(500).json({ success: false, message: error instanceof Error ? error.message : 'Error interno del servidor' } as TaskResponse);
    }
  }

  /**
   * GET /tasks/:id/comments - Obtener comentarios de una tarea
   */
  async getTaskComments(req: Request, res: Response): Promise<void> {
    try {
      const taskId = parseInt(req.params.id);
      if (isNaN(taskId) || taskId <= 0) {
        res.status(400).json({ success: false, message: 'ID de tarea inválido' } as TaskResponse);
        return;
      }

      const comments = await this.taskService.getTaskComments(taskId);
      res.status(200).json({
        success: true,
        data: comments,
        message: 'Comentarios obtenidos exitosamente'
      } as TaskResponse);

    } catch (error) {
      console.error('Error en getTaskComments controller:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Error interno del servidor'
      } as TaskResponse);
    }
  }

  /**
   * POST /tasks/:id/comments - Agregar comentario a una tarea
   */
  async addTaskComment(req: Request, res: Response): Promise<void> {
    try {
      const taskId = parseInt(req.params.id);
      if (isNaN(taskId) || taskId <= 0) {
        res.status(400).json({ success: false, message: 'ID de tarea inválido' } as TaskResponse);
        return;
      }

      const { comment, createdBy, createdByName } = req.body;
      if (!comment || !comment.trim()) {
        res.status(400).json({ success: false, message: 'El comentario es requerido' } as TaskResponse);
        return;
      }

      if (!createdBy || !createdByName) {
        res.status(400).json({ success: false, message: 'Usuario creador es requerido' } as TaskResponse);
        return;
      }

      const newComment = await this.taskService.addTaskComment(taskId, {
        comment: comment.trim(),
        createdBy,
        createdByName
      });

      res.status(201).json({
        success: true,
        data: newComment,
        message: 'Comentario agregado exitosamente'
      } as TaskResponse);

    } catch (error) {
      console.error('Error en addTaskComment controller:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Error interno del servidor'
      } as TaskResponse);
    }
  }

  /**
   * PATCH /tasks/:id/start - Iniciar una tarea
   */
  async startTask(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id);

      if (isNaN(id) || id <= 0) {
        res.status(400).json({
          success: false,
          message: 'ID de tarea inválido'
        } as TaskResponse);
        return;
      }

      const updatedTask = await this.taskService.updateTask(id, { 
        status: 'en_proceso',
        progress: 0
      });

      if (!updatedTask) {
        res.status(404).json({
          success: false,
          message: 'Tarea no encontrada'
        } as TaskResponse);
        return;
      }

      res.status(200).json({
        success: true,
        data: updatedTask,
        message: 'Tarea iniciada exitosamente'
      } as TaskResponse);

    } catch (error) {
      console.error('Error en startTask controller:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Error interno del servidor'
      } as TaskResponse);
    }
  }

  /**
   * PATCH /tasks/:id/complete - Completar una tarea
   */
  async completeTask(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      
      console.log('🔄 completeTask called with:');
      console.log('  - Task ID:', id);
      console.log('  - Request body:', JSON.stringify(req.body, null, 2));

      if (isNaN(id) || id <= 0) {
        res.status(400).json({
          success: false,
          message: 'ID de tarea inválido'
        } as TaskResponse);
        return;
      }

      const updatedTask = await this.taskService.updateTask(id, { 
        status: 'completada',
        completedAt: new Date(),
        progress: 100
      });

      if (!updatedTask) {
        res.status(404).json({
          success: false,
          message: 'Tarea no encontrada'
        } as TaskResponse);
        return;
      }

      console.log('✅ Task updated successfully:', {
        id: updatedTask.id,
        title: updatedTask.title,
        status: updatedTask.status,
        assignedUserId: updatedTask.assignedUserId
      });

      // Send notification for task completion
      try {
        // Get user ID from request body or default to the assigned user
        const completedByUserId = req.body.userId || updatedTask.assignedUserId?.toString() || '1'; // Default to '1' if not available
        
        console.log('📧 Sending notification with:');
        console.log('  - completedByUserId:', completedByUserId);
        console.log('  - req.body.userId:', req.body.userId);
        console.log('  - updatedTask.assignedUserId:', updatedTask.assignedUserId);
        
        await this.notificationService.sendTaskCompletedNotification(updatedTask, completedByUserId);
        console.log('✅ Notification sent successfully');
      } catch (notificationError) {
        console.warn('⚠️ Failed to send task completion notification:', notificationError);
        // Continue with the response even if notification fails
      }

      res.status(200).json({
        success: true,
        data: updatedTask,
        message: 'Tarea completada exitosamente'
      } as TaskResponse);

    } catch (error) {
      console.error('Error en completeTask controller:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Error interno del servidor'
      } as TaskResponse);
    }
  }

  /**
   * Método de depuración para obtener datos raw de la base de datos
   */
  async getTaskRawData(req: Request, res: Response): Promise<void> {
    try {
      const taskId = parseInt(req.params.id);
      
      if (isNaN(taskId)) {
        res.status(400).json({
          success: false,
          message: 'ID de tarea inválido'
        });
        return;
      }

      // Obtener datos directamente de la base de datos
      const query = 'SELECT * FROM tasks WHERE id = $1';
      const result = await databaseService.query(query, [taskId]);
      
      if (result.rows.length === 0) {
        res.status(404).json({
          success: false,
          message: 'Tarea no encontrada'
        });
        return;
      }

      const rawTask = result.rows[0];
      
      res.status(200).json({
        success: true,
        message: 'Datos raw de la tarea obtenidos correctamente',
        data: {
          raw: rawTask,
          progress_type: typeof rawTask.progress,
          status_type: typeof rawTask.status,
          progress_value: rawTask.progress,
          status_value: rawTask.status
        }
      });
    } catch (error) {
      console.error('Error obteniendo datos raw de la tarea:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  /**
   * GET /health - Health check del servicio
   */
  async healthCheck(req: Request, res: Response): Promise<void> {
    try {
      res.status(200).json({
        success: true,
        message: 'Tasks Service está funcionando correctamente',
        timestamp: new Date().toISOString(),
        service: 'tasks-service',
        version: '1.0.0'
      });
    } catch (error) {
      console.error('Error en health check:', error);
      res.status(500).json({
        success: false,
        message: 'Error en el servicio'
      });
    }
  }

  /**
   * Endpoint de prueba para verificar el valor de progress directamente desde la base de datos
   */
  async getTaskProgressTest(req: Request, res: Response): Promise<void> {
    try {
      const taskId = parseInt(req.params.id);
      
      if (!taskId || taskId <= 0) {
        res.status(400).json({
          success: false,
          error: 'ID de tarea inválido'
        });
        return;
      }

      // Consulta directa a la base de datos sin mapeo
      const databaseService = require('../services/databaseService').default;
      const client = await databaseService.getConnection();
      
      try {
        const query = 'SELECT id, title, progress FROM public.tasks WHERE id = $1';
        const { rows } = await client.query(query, [taskId]);
        
        if (!rows.length) {
          res.status(404).json({
            success: false,
            error: 'Tarea no encontrada'
          });
          return;
        }

        const rawTask = rows[0];
        console.log('TEST ENDPOINT - Raw task from DB:', JSON.stringify(rawTask, null, 2));
        console.log('TEST ENDPOINT - Progress value:', rawTask.progress, 'Type:', typeof rawTask.progress);

        res.json({
          success: true,
          data: {
            id: rawTask.id,
            title: rawTask.title,
            progress: rawTask.progress,
            progressType: typeof rawTask.progress,
            rawData: rawTask
          }
        });
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Error en getTaskProgressTest:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }
}