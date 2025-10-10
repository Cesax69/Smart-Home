import { Request, Response } from 'express';
import { TaskService } from '../services/taskService';
import { CreateTaskRequest, UpdateTaskRequest, TaskResponse, TaskCategory, TaskStatus } from '../types/Task';

export class TaskController {
  private taskService: TaskService;

  constructor() {
    this.taskService = new TaskService();
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
      const tasks = await this.taskService.getAllTasks();

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
   * GET /tasks/:id - Obtener una tarea por ID
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

      const task = await this.taskService.getTaskById(taskId);

      if (!task) {
        res.status(404).json({
          success: false,
          message: 'Tarea no encontrada'
        } as TaskResponse);
        return;
      }

      res.status(200).json({
        success: true,
        data: task,
        message: 'Tarea encontrada exitosamente'
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

      if (isNaN(id) || id <= 0) {
        res.status(400).json({
          success: false,
          message: 'ID de tarea inválido'
        } as TaskResponse);
        return;
      }

      const updatedTask = await this.taskService.updateTask(id, { 
        status: 'completada',
        completedAt: new Date()
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