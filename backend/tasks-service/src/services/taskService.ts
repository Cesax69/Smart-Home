import { Task, CreateTaskRequest, UpdateTaskRequest, DatabaseTask, TaskStatus, TaskCategory, TaskPriority, TaskStats } from '../types/Task';
import { databaseService } from '../config/database';

export class TaskService {
  /**
   * Normaliza las categorías del esquema actual a las permitidas por la app
   */
  private normalizeCategory(category?: string | null): TaskCategory {
    const c = (category || '').toLowerCase();
    switch (c) {
      case 'limpieza':
        return 'limpieza';
      case 'cocina':
        return 'cocina';
      case 'lavanderia':
        return 'lavanderia';
      case 'jardin':
      case 'jardineria':
        return 'jardin';
      case 'mantenimiento':
        return 'mantenimiento';
      case 'organizacion':
        return 'organizacion';
      case 'mascotas':
        return 'mascotas';
      case 'compras':
        return 'compras';
      default:
        return 'otros';
    }
  }

  /**
   * Mapea estado del DB (en inglés) al estado de la app (español)
   */
  private mapDbStatusToApp(status?: string | null): TaskStatus {
    switch ((status || '').toLowerCase()) {
      case 'pending':
        return 'pendiente';
      case 'in_progress':
        return 'en_proceso';
      case 'completed':
        return 'completada';
      default:
        return 'pendiente';
    }
  }

  /**
   * Mapea estado de la app (español) al DB (inglés)
   */
  private mapAppStatusToDb(status?: TaskStatus | null): string {
    switch (status) {
      case 'pendiente':
        return 'pending';
      case 'en_proceso':
        return 'in_progress';
      case 'completada':
        return 'completed';
      default:
        return 'pending';
    }
  }
  
  /**
   * Publica un evento real al servicio de notificaciones
   */
  private async publishEvent(eventType: string, taskData: Task) {
    try {
      console.log(`EVENTO PUBLICADO: ${eventType}, UsuarioID: ${taskData.assignedUserId}, TareaID: ${taskData.id}, Título: ${taskData.title}`);
      
      // Mapear tipos de eventos a tipos de notificación
      let notificationType: string;
      switch (eventType) {
        case 'TareaCreada':
          notificationType = 'tarea_asignada';
          break;
        case 'TareaActualizada':
          notificationType = taskData.status === 'completada' ? 'tarea_completada' : 'tarea_actualizada';
          break;
        case 'TareaEliminada':
          notificationType = 'tarea_eliminada';
          break;
        default:
          notificationType = 'general';
      }

      // Preparar datos para el webhook de notificaciones
      const notificationPayload = {
        userId: taskData.assignedUserId,
        type: notificationType,
        priority: taskData.priority === 'urgente' ? 'alta' : taskData.priority === 'alta' ? 'media' : 'baja',
        taskData: {
          id: taskData.id,
          title: taskData.title,
          description: taskData.description,
          category: taskData.category,
          priority: taskData.priority,
          status: taskData.status,
          assignedUserName: taskData.assignedUserName,
          createdByName: taskData.createdByName,
          dueDate: taskData.dueDate,
          reward: taskData.reward
        }
      };

      // Enviar notificación al notifications-service
      const notificationServiceUrl = process.env.NOTIFICATIONS_SERVICE_URL || 'http://localhost:3004';
      const response = await fetch(`${notificationServiceUrl}/notify/family`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(notificationPayload)
      });

      if (response.ok) {
         const result = await response.json() as { message?: string };
         console.log(`✅ Notificación enviada exitosamente:`, result.message || 'Sin mensaje');
       } else {
         console.error(`❌ Error al enviar notificación: ${response.status} ${response.statusText}`);
       }
    } catch (error) {
      console.error('❌ Error al publicar evento de notificación:', error);
      // No lanzamos el error para que no afecte la operación principal de la tarea
    }
  }

  /**
   * Convierte un registro de base de datos a objeto Task
   */
  private mapDatabaseTaskToTask(dbTask: DatabaseTask): Task {
    return {
      id: dbTask.id,
      title: dbTask.title,
      description: dbTask.description,
      category: this.normalizeCategory(dbTask.category as unknown as string),
      priority: (['baja', 'media', 'alta', 'urgente'].includes((dbTask.priority as unknown as string) || '')
        ? (dbTask.priority as unknown as TaskPriority)
        : 'media'),
      status: this.mapDbStatusToApp(dbTask.status as unknown as string),
      assignedUserId: (dbTask.assigned_user_id as unknown as number) || (dbTask.created_by_id as unknown as number),
      assignedUserIds: (dbTask.assigned_user_ids as unknown as number[]) || ((dbTask.assigned_user_id as unknown as number) ? [dbTask.assigned_user_id as unknown as number] : undefined),
      assignedUserName: dbTask.assigned_user_name,
      createdById: dbTask.created_by_id,
      createdByName: dbTask.created_by_name,
      dueDate: dbTask.due_date,
      estimatedTime: dbTask.estimated_time,
      reward: dbTask.reward,
      fileUrl: dbTask.file_url || undefined,
      completedAt: dbTask.completed_at,
      createdAt: dbTask.created_at,
      updatedAt: dbTask.updated_at
    };
  }

  /**
   * Valida el estado de una tarea
   */
  private isValidStatus(status: string): status is TaskStatus {
    return ['pendiente', 'en_proceso', 'completada'].includes(status);
  }

  /**
   * Valida la categoría de una tarea
   */
  private isValidCategory(category: string): category is TaskCategory {
    return ['limpieza', 'cocina', 'lavanderia', 'jardin', 'mantenimiento', 'organizacion', 'mascotas', 'compras', 'otros'].includes(category);
  }

  /**
   * Valida la prioridad de una tarea
   */
  private isValidPriority(priority: string): priority is TaskPriority {
    return ['baja', 'media', 'alta', 'urgente'].includes(priority);
  }

  /**
   * Crea una nueva tarea doméstica
   */
  async createTask(taskData: CreateTaskRequest): Promise<Task> {
    try {
      // Validar datos de entrada
      if (!taskData.title || taskData.title.trim().length === 0) {
        throw new Error('El título de la tarea es requerido');
      }

      if (!taskData.description || taskData.description.trim().length === 0) {
        throw new Error('La descripción de la tarea es requerida');
      }

      const assigneeIds = Array.isArray(taskData.assignedUserIds) && taskData.assignedUserIds.length > 0
        ? taskData.assignedUserIds
        : (taskData.assignedUserId ? [taskData.assignedUserId] : []);

      if (!assigneeIds.length || assigneeIds.some(id => !id || id <= 0)) {
        throw new Error('Se requiere al menos un usuario asignado válido');
      }

      if (!taskData.createdById || taskData.createdById <= 0) {
        throw new Error('El ID del creador es requerido y debe ser válido');
      }

      if (!this.isValidCategory(taskData.category)) {
        throw new Error('Categoría de tarea inválida');
      }

      const status = taskData.status || 'pendiente';
      if (!this.isValidStatus(status)) {
        throw new Error('Estado de tarea inválido. Debe ser: pendiente, en_proceso o completada');
      }

      const priority = taskData.priority || 'media';
      if (!this.isValidPriority(priority)) {
        throw new Error('Prioridad de tarea inválida. Debe ser: baja, media, alta o urgente');
      }

      // Insertar en la base de datos: tabla tasks + task_assignments
      const client = await databaseService.getConnection();
      try {
        const insertTaskQuery = `
          INSERT INTO public.tasks (user_id, title, description, status, priority, category, due_date)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING id, user_id AS created_by_id, title, description, category, priority, status, due_date, completed_at, created_at, updated_at
        `;
        const insertTaskParams = [
          taskData.createdById,
          taskData.title.trim(),
          taskData.description.trim(),
          this.mapAppStatusToDb(status),
          priority,
          taskData.category,
          taskData.dueDate || null
        ];

        const { rows: taskRows } = await client.query(insertTaskQuery, insertTaskParams);
        const t = taskRows[0];

        // Insertar asignaciones para todos los miembros seleccionados
        const insertAssignQuery = `
          INSERT INTO public.task_assignments (task_id, user_id, assigned_by, status)
          VALUES ($1, $2, $3, $4)
          ON CONFLICT (task_id, user_id) DO UPDATE SET assigned_by = EXCLUDED.assigned_by, status = EXCLUDED.status
        `;
        for (const uid of assigneeIds) {
          await client.query(insertAssignQuery, [t.id, uid, taskData.createdById, 'assigned']);
        }

        const dbTask: DatabaseTask = {
          id: t.id,
          title: t.title,
          description: t.description,
          category: t.category,
          priority: t.priority,
          status: t.status,
          assigned_user_id: assigneeIds[0],
          assigned_user_ids: assigneeIds,
          created_by_id: t.created_by_id,
          due_date: t.due_date,
          estimated_time: taskData.estimatedTime,
          reward: taskData.reward,
          file_url: taskData.fileUrl,
          completed_at: t.completed_at,
          created_at: t.created_at,
          updated_at: t.updated_at
        } as any;

        const newTask = this.mapDatabaseTaskToTask(dbTask);
        await this.publishEvent('TareaCreada', newTask);
        return newTask;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Error en createTask:', error);
      throw error;
    }
  }

  /**
   * Obtiene todas las tareas domésticas
   */
  async getAllTasks(): Promise<Task[]> {
    try {
      const client = await databaseService.getConnection();
      try {
        const query = `
          SELECT 
            t.id,
            t.user_id AS created_by_id,
            t.title,
            t.description,
            t.category,
            t.priority,
            t.status,
            t.due_date,
            t.completed_at,
            t.created_at,
            t.updated_at,
            (
              SELECT ta.user_id 
              FROM public.task_assignments ta 
              WHERE ta.task_id = t.id 
              ORDER BY ta.assigned_at DESC 
              LIMIT 1
            ) AS assigned_user_id,
            (
              SELECT ARRAY_AGG(ta2.user_id)
              FROM public.task_assignments ta2
              WHERE ta2.task_id = t.id
            ) AS assigned_user_ids,
            (
              SELECT tf.file_url 
              FROM public.task_files tf 
              WHERE tf.task_id = t.id AND tf.file_url IS NOT NULL 
              ORDER BY tf.created_at DESC 
              LIMIT 1
            ) AS file_url
          FROM public.tasks t
          ORDER BY t.created_at DESC
        `;
        const { rows } = await client.query(query);
        const tasks = rows.map((r: any) => this.mapDatabaseTaskToTask(r as DatabaseTask));
        return tasks;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Error en getAllTasks:', error);
      throw error;
    }
  }

  /**
   * Obtiene tareas por miembro de la familia
   */
  async getTasksByMember(userId: number): Promise<Task[]> {
    try {
      const client = await databaseService.getConnection();
      try {
        const query = `
          SELECT 
            t.id,
            t.user_id AS created_by_id,
            t.title,
            t.description,
            t.category,
            t.priority,
            t.status,
            t.due_date,
            t.completed_at,
            t.created_at,
            t.updated_at,
            (
              SELECT ta.user_id 
              FROM public.task_assignments ta 
              WHERE ta.task_id = t.id 
              ORDER BY ta.assigned_at DESC 
              LIMIT 1
            ) AS assigned_user_id,
            (
              SELECT ARRAY_AGG(ta2.user_id)
              FROM public.task_assignments ta2
              WHERE ta2.task_id = t.id
            ) AS assigned_user_ids,
            (
              SELECT tf.file_url 
              FROM public.task_files tf 
              WHERE tf.task_id = t.id AND tf.file_url IS NOT NULL 
              ORDER BY tf.created_at DESC 
              LIMIT 1
            ) AS file_url
          FROM public.tasks t
          WHERE EXISTS (
            SELECT 1 FROM public.task_assignments ta WHERE ta.task_id = t.id AND ta.user_id = $1
          )
          ORDER BY t.created_at DESC
        `;
        const { rows } = await client.query(query, [userId]);
        return rows.map((r: any) => this.mapDatabaseTaskToTask(r as DatabaseTask));
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Error en getTasksByMember:', error);
      throw error;
    }
  }

  /**
   * Obtiene tareas por categoría
   */
  async getTasksByCategory(category: TaskCategory): Promise<Task[]> {
    try {
      if (!this.isValidCategory(category)) {
        throw new Error('Categoría inválida');
      }
      const client = await databaseService.getConnection();
      try {
        const query = `
          SELECT 
            t.id,
            t.user_id AS created_by_id,
            t.title,
            t.description,
            t.category,
            t.priority,
            t.status,
            t.due_date,
            t.completed_at,
            t.created_at,
            t.updated_at,
            (
              SELECT ta.user_id 
              FROM public.task_assignments ta 
              WHERE ta.task_id = t.id 
              ORDER BY ta.assigned_at DESC 
              LIMIT 1
            ) AS assigned_user_id,
            (
              SELECT ARRAY_AGG(ta2.user_id)
              FROM public.task_assignments ta2
              WHERE ta2.task_id = t.id
            ) AS assigned_user_ids,
            (
              SELECT tf.file_url 
              FROM public.task_files tf 
              WHERE tf.task_id = t.id AND tf.file_url IS NOT NULL 
              ORDER BY tf.created_at DESC 
              LIMIT 1
            ) AS file_url
          FROM public.tasks t
          WHERE LOWER(t.category) = LOWER($1)
          ORDER BY t.created_at DESC
        `;
        const { rows } = await client.query(query, [category]);
        return rows.map((r: any) => this.mapDatabaseTaskToTask(r as DatabaseTask));
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Error en getTasksByCategory:', error);
      throw error;
    }
  }

  /**
   * Obtiene tareas por estado
   */
  async getTasksByStatus(status: TaskStatus): Promise<Task[]> {
    try {
      if (!this.isValidStatus(status)) {
        throw new Error('Estado inválido');
      }
      const client = await databaseService.getConnection();
      try {
        const dbStatus = this.mapAppStatusToDb(status);
        const query = `
          SELECT 
            t.id,
            t.user_id AS created_by_id,
            t.title,
            t.description,
            t.category,
            t.priority,
            t.status,
            t.due_date,
            t.completed_at,
            t.created_at,
            t.updated_at,
            (
              SELECT ta.user_id 
              FROM public.task_assignments ta 
              WHERE ta.task_id = t.id 
              ORDER BY ta.assigned_at DESC 
              LIMIT 1
            ) AS assigned_user_id,
            (
              SELECT ARRAY_AGG(ta2.user_id)
              FROM public.task_assignments ta2
              WHERE ta2.task_id = t.id
            ) AS assigned_user_ids,
            (
              SELECT tf.file_url 
              FROM public.task_files tf 
              WHERE tf.task_id = t.id AND tf.file_url IS NOT NULL 
              ORDER BY tf.created_at DESC 
              LIMIT 1
            ) AS file_url
          FROM public.tasks t
          WHERE LOWER(t.status) = LOWER($1)
          ORDER BY t.created_at DESC
        `;
        const { rows } = await client.query(query, [dbStatus]);
        return rows.map((r: any) => this.mapDatabaseTaskToTask(r as DatabaseTask));
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Error en getTasksByStatus:', error);
      throw error;
    }
  }

  /**
   * Obtiene una tarea por su ID
   */
  async getTaskById(id: number): Promise<Task | null> {
    try {
      if (!id || id <= 0) {
        throw new Error('ID de tarea inválido');
      }
      const client = await databaseService.getConnection();
      try {
        const query = `
          SELECT 
            t.id,
            t.user_id AS created_by_id,
            t.title,
            t.description,
            t.category,
            t.priority,
            t.status,
            t.due_date,
            t.completed_at,
            t.created_at,
            t.updated_at,
            (
              SELECT ta.user_id 
              FROM public.task_assignments ta 
              WHERE ta.task_id = t.id 
              ORDER BY ta.assigned_at DESC 
              LIMIT 1
            ) AS assigned_user_id,
            (
              SELECT ARRAY_AGG(ta2.user_id)
              FROM public.task_assignments ta2
              WHERE ta2.task_id = t.id
            ) AS assigned_user_ids,
            (
              SELECT tf.file_url 
              FROM public.task_files tf 
              WHERE tf.task_id = t.id AND tf.file_url IS NOT NULL 
              ORDER BY tf.created_at DESC 
              LIMIT 1
            ) AS file_url
          FROM public.tasks t
          WHERE t.id = $1
        `;
        const { rows } = await client.query(query, [id]);
        if (!rows.length) return null;
        return this.mapDatabaseTaskToTask(rows[0] as DatabaseTask);
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Error en getTaskById:', error);
      throw error;
    }
  }

  /**
   * Actualiza una tarea existente
   */
  async updateTask(id: number, updateData: UpdateTaskRequest): Promise<Task | null> {
    try {
      if (!id || id <= 0) {
        throw new Error('ID de tarea inválido');
      }
      // Validar datos de actualización
      if (updateData.status && !this.isValidStatus(updateData.status)) {
        throw new Error('Estado de tarea inválido. Debe ser: pendiente, en_proceso o completada');
      }

      if (updateData.category && !this.isValidCategory(updateData.category)) {
        throw new Error('Categoría de tarea inválida');
      }

      if (updateData.priority && !this.isValidPriority(updateData.priority)) {
        throw new Error('Prioridad de tarea inválida');
      }

      const client = await databaseService.getConnection();
      try {
        const fields: string[] = [];
        const params: any[] = [];
        let idx = 1;

        if (updateData.title !== undefined) { fields.push(`title = $${idx++}`); params.push(updateData.title); }
        if (updateData.description !== undefined) { fields.push(`description = $${idx++}`); params.push(updateData.description); }
        if (updateData.category !== undefined) { fields.push(`category = $${idx++}`); params.push(updateData.category); }
        if (updateData.priority !== undefined) { fields.push(`priority = $${idx++}`); params.push(updateData.priority); }
        if (updateData.status !== undefined) { fields.push(`status = $${idx++}`); params.push(this.mapAppStatusToDb(updateData.status)); }
        if (updateData.dueDate !== undefined) { fields.push(`due_date = $${idx++}`); params.push(updateData.dueDate || null); }
        if (updateData.completedAt !== undefined) { fields.push(`completed_at = $${idx++}`); params.push(updateData.completedAt || null); }

        fields.push(`updated_at = NOW()`);

        const updateQuery = `UPDATE public.tasks SET ${fields.join(', ')} WHERE id = $${idx} RETURNING id, user_id AS created_by_id, title, description, category, priority, status, due_date, completed_at, created_at, updated_at`;
        params.push(id);

        const { rows } = await client.query(updateQuery, params);
        if (!rows.length) return null;

        // Actualizar asignaciones si vienen en el payload
        if (Array.isArray(updateData.assignedUserIds) && updateData.assignedUserIds.length > 0) {
          await client.query(`DELETE FROM public.task_assignments WHERE task_id = $1`, [id]);
          const insertAssignQuery = `
            INSERT INTO public.task_assignments (task_id, user_id, assigned_by, status)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (task_id, user_id) DO UPDATE SET assigned_by = EXCLUDED.assigned_by, status = EXCLUDED.status
          `;
          for (const uid of updateData.assignedUserIds) {
            await client.query(insertAssignQuery, [id, uid, rows[0].created_by_id, 'assigned']);
          }
        } else if (updateData.assignedUserId !== undefined) {
          await client.query(`DELETE FROM public.task_assignments WHERE task_id = $1`, [id]);
          await client.query(`INSERT INTO public.task_assignments (task_id, user_id, assigned_by, status) VALUES ($1, $2, $3, $4)`,
            [id, updateData.assignedUserId, rows[0].created_by_id, 'assigned']
          );
        }

        const dbTask: DatabaseTask = {
          id: rows[0].id,
          title: rows[0].title,
          description: rows[0].description,
          category: rows[0].category,
          priority: rows[0].priority,
          status: rows[0].status,
          assigned_user_id: (Array.isArray(updateData.assignedUserIds) && updateData.assignedUserIds.length > 0)
            ? updateData.assignedUserIds[0]
            : (updateData.assignedUserId ?? undefined as any),
          assigned_user_ids: Array.isArray(updateData.assignedUserIds) ? updateData.assignedUserIds : undefined,
          created_by_id: rows[0].created_by_id,
          due_date: rows[0].due_date,
          estimated_time: updateData.estimatedTime,
          reward: updateData.reward,
          file_url: updateData.fileUrl,
          completed_at: rows[0].completed_at,
          created_at: rows[0].created_at,
          updated_at: rows[0].updated_at
        } as any;

        const updatedTask = this.mapDatabaseTaskToTask(dbTask);
        await this.publishEvent('TareaActualizada', updatedTask);
        return updatedTask;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Error en updateTask:', error);
      throw error;
    }
  }

  /**
   * Elimina una tarea
   */
  async deleteTask(id: number): Promise<boolean> {
    try {
      if (!id || id <= 0) {
        throw new Error('ID de tarea inválido');
      }
      const client = await databaseService.getConnection();
      try {
        const { rows } = await client.query(`SELECT id, user_id AS created_by_id, title, description, category, priority, status, due_date, completed_at, created_at, updated_at FROM public.tasks WHERE id = $1`, [id]);
        if (!rows.length) return false;
        const dbTaskBefore: DatabaseTask = rows[0] as any;
        await client.query(`DELETE FROM public.tasks WHERE id = $1`, [id]);
        const deletedTask = this.mapDatabaseTaskToTask(dbTaskBefore);
        await this.publishEvent('TareaEliminada', deletedTask);
        return true;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Error en deleteTask:', error);
      throw error;
    }
  }

  /**
   * Listar archivos asociados a una tarea
   */
  async getTaskFiles(taskId: number): Promise<any[]> {
    try {
      if (!taskId || taskId <= 0) {
        throw new Error('ID de tarea inválido');
      }
      const client = await databaseService.getConnection();
      try {
        const { rows } = await client.query(`
          SELECT id, task_id, file_name, file_path, file_url, file_size, file_type, mime_type, uploaded_by, storage_type, google_drive_id, is_image, thumbnail_path, created_at
          FROM public.task_files
          WHERE task_id = $1
          ORDER BY created_at DESC
        `, [taskId]);
        return rows;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Error en getTaskFiles:', error);
      throw error;
    }
  }

  /**
   * Agregar archivos a una tarea (registra metadatos en task_files)
   */
  async addTaskFiles(taskId: number, files: any[]): Promise<any[]> {
    try {
      if (!taskId || taskId <= 0) {
        throw new Error('ID de tarea inválido');
      }
      if (!Array.isArray(files) || files.length === 0) {
        throw new Error('No hay archivos para registrar');
      }
      const client = await databaseService.getConnection();
      try {
        const inserted: any[] = [];
        for (const f of files) {
          const {
            file_name,
            file_path,
            file_url,
            file_size,
            file_type,
            mime_type,
            uploaded_by,
            storage_type,
            google_drive_id,
            is_image,
            thumbnail_path
          } = f;

          const { rows } = await client.query(`
            INSERT INTO public.task_files (task_id, file_name, file_path, file_url, file_size, file_type, mime_type, uploaded_by, storage_type, google_drive_id, is_image, thumbnail_path)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            RETURNING id, task_id, file_name, file_path, file_url, file_size, file_type, mime_type, uploaded_by, storage_type, google_drive_id, is_image, thumbnail_path, created_at
          `, [
            taskId,
            file_name || 'archivo',
            file_path || '',
            file_url || null,
            file_size || null,
            file_type || null,
            mime_type || null,
            uploaded_by || 0,
            storage_type || 'google_drive',
            google_drive_id || null,
            is_image || false,
            thumbnail_path || null
          ]);
          inserted.push(rows[0]);
        }
        return inserted;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Error en addTaskFiles:', error);
      throw error;
    }
  }

  /**
   * Eliminar registro de archivo asociado a una tarea
   */
  async deleteTaskFile(fileRecordId: number): Promise<boolean> {
    try {
      if (!fileRecordId || fileRecordId <= 0) {
        throw new Error('ID de archivo inválido');
      }
      const client = await databaseService.getConnection();
      try {
        const { rows } = await client.query(`SELECT id FROM public.task_files WHERE id = $1`, [fileRecordId]);
        if (!rows.length) return false;
        await client.query(`DELETE FROM public.task_files WHERE id = $1`, [fileRecordId]);
        return true;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Error en deleteTaskFile:', error);
      throw error;
    }
  }

  /**
   * Obtiene estadísticas de las tareas familiares
   */
  async getTaskStats(): Promise<TaskStats> {
    try {
      const client = await databaseService.getConnection();
      try {
        const { rows } = await client.query(`
          SELECT 
            COUNT(*) AS total,
            COUNT(*) FILTER (WHERE status = 'pending') AS pending,
            COUNT(*) FILTER (WHERE status = 'in_progress') AS in_progress,
            COUNT(*) FILTER (WHERE status = 'completed') AS completed
          FROM public.tasks
        `);
        const statsRow = rows[0];

        const tasksByCategoryInit: Record<TaskCategory, number> = {
          limpieza: 0,
          cocina: 0,
          lavanderia: 0,
          jardin: 0,
          mantenimiento: 0,
          organizacion: 0,
          mascotas: 0,
          compras: 0,
          otros: 0
        };

        const { rows: catRows } = await client.query(`SELECT category, COUNT(*) AS count FROM public.tasks GROUP BY category`);
        catRows.forEach((r: any) => {
          const cat = this.normalizeCategory(r.category);
          tasksByCategoryInit[cat] = (tasksByCategoryInit[cat] || 0) + Number(r.count || 0);
        });

        const tasksByPriority: Record<TaskPriority, number> = { baja: 0, media: 0, alta: 0, urgente: 0 };
        const { rows: priRows } = await client.query(`SELECT priority, COUNT(*) AS count FROM public.tasks GROUP BY priority`);
        priRows.forEach((r: any) => {
          const p = (['baja','media','alta','urgente'].includes((r.priority || '').toLowerCase()) ? (r.priority as TaskPriority) : 'media');
          tasksByPriority[p] = (tasksByPriority[p] || 0) + Number(r.count || 0);
        });

        // Miembros: contar por asignación
        const tasksByMember: Record<number, { name: string; count: number; completed: number }> = {};
        const { rows: memRows } = await client.query(`
          SELECT ta.user_id, 
                 COUNT(*) AS count,
                 COUNT(*) FILTER (WHERE t.status = 'completed') AS completed
          FROM public.task_assignments ta
          JOIN public.tasks t ON t.id = ta.task_id
          GROUP BY ta.user_id
        `);
        memRows.forEach((r: any) => {
          const uid = Number(r.user_id);
          tasksByMember[uid] = {
            name: `Usuario ${uid}`,
            count: Number(r.count || 0),
            completed: Number(r.completed || 0)
          };
        });

        return {
          totalTasks: Number(statsRow.total || 0),
          pendingTasks: Number(statsRow.pending || 0),
          inProgressTasks: Number(statsRow.in_progress || 0),
          completedTasks: Number(statsRow.completed || 0),
          tasksByCategory: tasksByCategoryInit,
          tasksByPriority,
          tasksByMember
        };
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Error en getTaskStats:', error);
      throw error;
    }
  }

  /**
   * Obtiene tareas que vencen pronto (próximas 24 horas)
   */
  async getUpcomingTasks(): Promise<Task[]> {
    try {
      const client = await databaseService.getConnection();
      try {
        const { rows } = await client.query(`
          SELECT 
            t.id,
            t.user_id AS created_by_id,
            t.title,
            t.description,
            t.category,
            t.priority,
            t.status,
            t.due_date,
            t.completed_at,
            t.created_at,
            t.updated_at,
            (
              SELECT ta.user_id 
              FROM public.task_assignments ta 
              WHERE ta.task_id = t.id 
              ORDER BY ta.assigned_at DESC 
              LIMIT 1
            ) AS assigned_user_id,
            (
              SELECT ARRAY_AGG(ta2.user_id)
              FROM public.task_assignments ta2
              WHERE ta2.task_id = t.id
            ) AS assigned_user_ids,
            (
              SELECT tf.file_url 
              FROM public.task_files tf 
              WHERE tf.task_id = t.id AND tf.file_url IS NOT NULL 
              ORDER BY tf.created_at DESC 
              LIMIT 1
            ) AS file_url
          FROM public.tasks t
          WHERE t.status <> 'completed' AND t.due_date IS NOT NULL AND t.due_date > NOW() AND t.due_date <= NOW() + INTERVAL '24 hours'
          ORDER BY t.due_date ASC
        `);
        return rows.map((r: any) => this.mapDatabaseTaskToTask(r as DatabaseTask));
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Error en getUpcomingTasks:', error);
      throw error;
    }
  }

  /**
   * Obtiene tareas vencidas
   */
  async getOverdueTasks(): Promise<Task[]> {
    try {
      const client = await databaseService.getConnection();
      try {
        const { rows } = await client.query(`
          SELECT 
            t.id,
            t.user_id AS created_by_id,
            t.title,
            t.description,
            t.category,
            t.priority,
            t.status,
            t.due_date,
            t.completed_at,
            t.created_at,
            t.updated_at,
            (
              SELECT ta.user_id 
              FROM public.task_assignments ta 
              WHERE ta.task_id = t.id 
              ORDER BY ta.assigned_at DESC 
              LIMIT 1
            ) AS assigned_user_id,
            (
              SELECT ARRAY_AGG(ta2.user_id)
              FROM public.task_assignments ta2
              WHERE ta2.task_id = t.id
            ) AS assigned_user_ids,
            (
              SELECT tf.file_url 
              FROM public.task_files tf 
              WHERE tf.task_id = t.id AND tf.file_url IS NOT NULL 
              ORDER BY tf.created_at DESC 
              LIMIT 1
            ) AS file_url
          FROM public.tasks t
          WHERE t.status <> 'completed' AND t.due_date IS NOT NULL AND t.due_date < NOW()
          ORDER BY t.due_date ASC
        `);
        return rows.map((r: any) => this.mapDatabaseTaskToTask(r as DatabaseTask));
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Error en getOverdueTasks:', error);
      throw error;
    }
  }
}