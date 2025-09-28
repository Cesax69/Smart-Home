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

      // Validación básica de entrada
      if (!taskData.title || !taskData.description || !taskData.assignedUserId || !taskData.createdById || !taskData.category) {
        res.status(400).json({
          success: false,
          message: 'Título, descripción, usuario asignado, creador y categoría son requeridos'
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