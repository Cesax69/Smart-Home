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

      if (!taskData.title || (!hasSingleAssignee && !hasMultipleAssignees) || !taskData.createdById) {
        res.status(400).json({
          success: false,
          message: 'Título, al menos un asignado (assignedUserId o assignedUserIds) y createdById son requeridos'
        } as TaskResponse);
        return;
      }

      const newTask = await this.taskService.createTask(taskData);

      // Send notification for task assignment (no bloquear la respuesta)
      const assignedUserIds: number[] = [];
      if (hasSingleAssignee) {
        assignedUserIds.push(taskData.assignedUserId!);
      }
      if (hasMultipleAssignees) {
        assignedUserIds.push(...taskData.assignedUserIds!);
      }
      const uniqueAssignedUserIds = Array.from(new Set(assignedUserIds.filter(id => !!id && id > 0)));
      // No notificar al creador de la tarea por asignación
      const recipients = uniqueAssignedUserIds.filter(id => id !== taskData.createdById);
      if (recipients.length > 0) {
        this.notificationService
          .sendTaskAssignedNotification(newTask, recipients)
          .catch((notificationError) => {
            console.warn('⚠️ Failed to send task assignment notification:', notificationError);
          });
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

      if (!['pendiente', 'en_proceso', 'completada', 'archivada'].includes(status)) {
        res.status(400).json({
          success: false,
          message: 'Estado inválido. Debe ser: pendiente, en_proceso, completada o archivada'
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

      // Determinar transición a 'completada' comparando estado previo
      const previousTask = await this.taskService.getTaskById(taskId);
      const wasCompleted = previousTask?.status === 'completada';
      const isTransitionToCompleted = updateData.status === 'completada' && !wasCompleted;

      // Solo establecer completedAt/progress si hay transición real
      if (isTransitionToCompleted) {
        (updateData as any).completedAt = new Date();
        (updateData as any).progress = 100;
      }

      const updatedTask = await this.taskService.updateTask(taskId, updateData);

      if (!updatedTask) {
        res.status(404).json({
          success: false,
          message: 'Tarea no encontrada'
        } as TaskResponse);
        return;
      }

      // Enviar notificación SOLO si hubo transición a 'completada'
      const transitionedToCompleted = !wasCompleted && updatedTask.status === 'completada';
      if (transitionedToCompleted) {
        try {
          const completedByUserId = Number((req.body as any)?.userId ?? updatedTask.assignedUserId ?? updatedTask.createdById);
          await this.notificationService.sendTaskCompletedNotification(updatedTask, completedByUserId);
        } catch (notificationError) {
          console.warn('⚠️ Failed to send task completion notification from updateTask:', notificationError);
        }
      } else {
        // Enviar notificación de edición general
        try {
          const actorUserId = Number((req.body as any)?.userId ?? updatedTask.assignedUserId ?? updatedTask.createdById);
          await this.notificationService.sendTaskUpdatedNotification(updatedTask, actorUserId, { change: 'task_edited' });
        } catch (notificationError) {
          console.warn('⚠️ Failed to send task updated notification from updateTask:', notificationError);
        }
      }

      res.status(200).json({
        success: true,
        data: updatedTask,
        message: (transitionedToCompleted ? 'Tarea marcada como completada' : 'Tarea actualizada exitosamente')
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
   * PATCH /tasks/:id/archive - Archivar una tarea (soft delete)
   */
  async archiveTask(req: Request, res: Response): Promise<void> {
    try {
      const taskId = parseInt(req.params.id);
      if (isNaN(taskId) || taskId <= 0) {
        res.status(400).json({ success: false, message: 'ID de tarea inválido' } as TaskResponse);
        return;
      }

      const updated = await this.taskService.archiveTask(taskId);
      if (!updated) {
        res.status(404).json({ success: false, message: 'Tarea no encontrada' } as TaskResponse);
        return;
      }
      res.status(200).json({ success: true, data: updated, message: 'Tarea archivada exitosamente' } as TaskResponse);
    } catch (error) {
      console.error('Error en archiveTask controller:', error);
      res.status(500).json({ success: false, message: error instanceof Error ? error.message : 'Error interno del servidor' } as TaskResponse);
    }
  }

  /**
   * PATCH /tasks/:id/unarchive - Restaurar una tarea archivada
   */
  async unarchiveTask(req: Request, res: Response): Promise<void> {
    try {
      const taskId = parseInt(req.params.id);
      if (isNaN(taskId) || taskId <= 0) {
        res.status(400).json({ success: false, message: 'ID de tarea inválido' } as TaskResponse);
        return;
      }

      const updated = await this.taskService.unarchiveTask(taskId);
      if (!updated) {
        res.status(404).json({ success: false, message: 'Tarea no encontrada' } as TaskResponse);
        return;
      }
      res.status(200).json({ success: true, data: updated, message: 'Tarea restaurada exitosamente' } as TaskResponse);
    } catch (error) {
      console.error('Error en unarchiveTask controller:', error);
      res.status(500).json({ success: false, message: error instanceof Error ? error.message : 'Error interno del servidor' } as TaskResponse);
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
      // Fallback para uploadedBy: usar el creador de la tarea si no viene en el cuerpo
      let fallbackUploaderId = 0;
      try {
        const task = await this.taskService.getTaskById(taskId);
        fallbackUploaderId = (task?.createdById as number) || 0;
      } catch (e) {
        // Si falla la obtención, mantenemos fallback en 0 y seguimos
      }
      // Mapear respuesta de file-upload-service a los campos esperados por task_files
      const mapped = files.map((f: any) => {
        // Construir una URL directa utilizable para Drive, priorizando downloadLink
        const directUrl = f.fileUrl
          || f.downloadLink
          || f.webViewLink
          || (f.fileId ? `https://drive.google.com/uc?id=${f.fileId}` : null);

        return {
          file_name: f.filename || f.originalName || 'archivo',
          // Para Google Drive, guardar una ruta útil (URL directa) en file_path en lugar del folderId
          file_path: directUrl || '',
          // Guardar también la URL pública si está disponible
          file_url: directUrl,
          file_size: f.size || null,
          file_type: null,
          mime_type: f.mimetype || null,
          uploaded_by: req.body?.uploadedBy || fallbackUploaderId || 0,
          storage_type: f.storage || 'google_drive',
          google_drive_id: f.fileId || null,
          is_image: (f.mimetype || '').startsWith('image/'),
          thumbnail_path: null,
          folder_id: f.folderId || null,
          folder_name: f.folderName || null
        };
      });
      const inserted = await this.taskService.addTaskFiles(taskId, mapped);

      // Disparar notificación por archivos agregados
      try {
        const actorUserId = Number(req.body?.uploadedBy ?? fallbackUploaderId ?? 0);
        const task = await this.taskService.getTaskById(taskId);
        if (task) {
          await this.notificationService.sendTaskUpdatedNotification(task, actorUserId, { change: 'files_added', count: inserted.length });
        }
      } catch (notificationError) {
        console.warn('⚠️ Failed to send task files-added notification:', notificationError);
      }

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
   * PUT /tasks/files/:fileRecordId - Actualizar registro de archivo de una tarea
   */
  async updateTaskFile(req: Request, res: Response): Promise<void> {
    try {
      const fileRecordId = parseInt(req.params.fileRecordId);
      if (isNaN(fileRecordId) || fileRecordId <= 0) {
        res.status(400).json({ success: false, message: 'ID de archivo inválido' } as TaskResponse);
        return;
      }

      const payload = req.body || {};
      // Aceptar tanto camelCase como snake_case del frontend/servicio de subida
      const fileData = {
        file_name: payload.file_name ?? payload.filename ?? payload.fileName,
        file_path: payload.file_path ?? payload.filePath,
        file_url: payload.file_url ?? payload.fileUrl,
        file_size: payload.file_size ?? payload.size,
        file_type: payload.file_type ?? undefined,
        mime_type: payload.mime_type ?? payload.mimetype,
        uploaded_by: payload.uploaded_by ?? undefined,
        storage_type: payload.storage_type ?? payload.storage ?? 'google_drive',
        google_drive_id: payload.google_drive_id ?? payload.fileId,
        is_image: payload.is_image ?? (typeof payload.mimetype === 'string' ? payload.mimetype.startsWith('image/') : undefined),
        thumbnail_path: payload.thumbnail_path ?? undefined,
        folder_id: payload.folder_id ?? payload.folderId,
        folder_name: payload.folder_name ?? payload.folderName
      };

      const updated = await this.taskService.updateTaskFile(fileRecordId, fileData);
      if (!updated) {
        res.status(404).json({ success: false, message: 'Archivo no encontrado' } as TaskResponse);
        return;
      }

      // Disparar notificación por archivo actualizado
      try {
        const actorUserId = Number(req.body?.uploaded_by ?? req.body?.uploadedBy ?? updated.uploaded_by ?? 0);
        if (updated.task_id) {
          const task = await this.taskService.getTaskById(Number(updated.task_id));
          if (task) {
            await this.notificationService.sendTaskUpdatedNotification(task, actorUserId, { change: 'file_updated', fileName: updated.file_name });
          }
        }
      } catch (notificationError) {
        console.warn('⚠️ Failed to send task file-updated notification:', notificationError);
      }

      res.status(200).json({ success: true, data: updated } as TaskResponse);
    } catch (error) {
      console.error('Error en updateTaskFile controller:', error);
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

      // Disparar notificación por comentario agregado
      try {
        const task = await this.taskService.getTaskById(taskId);
        if (task) {
          await this.notificationService.sendTaskUpdatedNotification(task, Number(createdBy), { change: 'comment_added', commentPreview: comment.trim().slice(0, 80) });
        }
      } catch (notificationError) {
        console.warn('⚠️ Failed to send task comment-added notification:', notificationError);
      }

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

      // Evaluar estado previo para evitar re-notificar
      const previousTask = await this.taskService.getTaskById(id);
      const wasCompleted = previousTask?.status === 'completada';

      const updatePayload: UpdateTaskRequest = wasCompleted
        ? { status: 'completada' }
        : { status: 'completada', completedAt: new Date(), progress: 100 };

      const updatedTask = await this.taskService.updateTask(id, updatePayload);

      if (!updatedTask) {
        res.status(404).json({
          success: false,
          message: 'Tarea no encontrada'
        } as TaskResponse);
        return;
      }

      // Enviar notificación solo si hubo transición a 'completada'
      const transitionedToCompleted = !wasCompleted && updatedTask.status === 'completada';
      if (transitionedToCompleted) {
        try {
          // Get user ID from request body or default to the assigned user (numeric)
          const completedByUserId = Number(req.body.userId ?? updatedTask.assignedUserId ?? 1);
          
          console.log('📧 Sending completion notification with:');
          console.log('  - completedByUserId:', completedByUserId);
          console.log('  - req.body.userId:', req.body.userId);
          console.log('  - updatedTask.assignedUserId:', updatedTask.assignedUserId);
          
          await this.notificationService.sendTaskCompletedNotification(updatedTask, completedByUserId);
          console.log('✅ Notification sent successfully');
        } catch (notificationError) {
          console.warn('⚠️ Failed to send task completion notification:', notificationError);
          // Continue with the response even if notification fails
        }
      } else {
        console.log('ℹ️ No completion notification sent (no status transition).');
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
}