export type TaskStatus = 'pendiente' | 'en_proceso' | 'completada';

export type TaskCategory = 
  | 'limpieza'      // Limpiar, aspirar, trapear, etc.
  | 'cocina'        // Cocinar, lavar platos, organizar despensa
  | 'lavanderia'    // Lavar ropa, doblar, planchar
  | 'jardin'        // Regar plantas, cortar césped, jardinería
  | 'mantenimiento' // Reparaciones menores, cambiar bombillas
  | 'organizacion'  // Ordenar habitaciones, organizar armarios
  | 'mascotas'      // Alimentar, pasear, cuidar mascotas
  | 'compras'       // Hacer compras, mandados
  | 'otros';        // Otras tareas domésticas

export type TaskPriority = 'baja' | 'media' | 'alta' | 'urgente';

export interface Task {
  id: number;
  title: string;           // Título corto de la tarea
  description?: string;    // Descripción detallada (opcional)
  category: TaskCategory;  // Categoría de la tarea doméstica
  priority: TaskPriority;  // Prioridad de la tarea
  status: TaskStatus;
  assignedUserId: number;  // ID del miembro de la familia asignado
  assignedUserIds?: number[]; // IDs de todos los miembros asignados
  assignedUserName?: string; // Nombre del miembro asignado (para facilitar la UI)
  createdById: number;     // ID del líder que creó la tarea
  createdByName?: string;  // Nombre del líder que creó la tarea
  startDate?: Date;        // Fecha de inicio del rango
  dueDate?: Date;          // Fecha límite para completar la tarea
  estimatedTime?: number;  // Tiempo estimado en minutos
  // Recurrencia
  isRecurring?: boolean;
  // En el frontend se usa "recurrenceInterval" para el tipo ('daily','weekly','monthly','yearly')
  // lo mapeamos a recurrence_type en BD
  recurrenceInterval?: string;
  reward?: string;         // Recompensa por completar la tarea
  fileUrl?: string;        // URL de archivo adjunto (foto de referencia, etc.)
  completedAt?: Date;      // Fecha y hora de completación
  createdAt: Date;
  updatedAt?: Date;
  progress?: number;       // Progreso de la tarea (0-100)
}

export interface CreateTaskRequest {
  title: string;
  description?: string;
  category?: TaskCategory;
  priority?: TaskPriority;
  status?: TaskStatus;
  assignedUserId: number;
  assignedUserIds?: number[];
  createdById: number;
  startDate?: Date;
  dueDate?: Date;
  estimatedTime?: number;
  // Recurrencia desde el frontend
  isRecurring?: boolean;
  recurrenceInterval?: string; // 'daily' | 'weekly' | 'monthly' | 'yearly'
  reward?: string;
  fileUrl?: string;
}

export interface UpdateTaskRequest {
  title?: string;
  description?: string;
  category?: TaskCategory;
  priority?: TaskPriority;
  status?: TaskStatus;
  assignedUserId?: number;
  assignedUserIds?: number[];
  startDate?: Date;
  dueDate?: Date;
  estimatedTime?: number;
  reward?: string;
  fileUrl?: string;
  completedAt?: Date;
  // Recurrencia desde el frontend
  isRecurring?: boolean;
  recurrenceInterval?: string; // 'daily' | 'weekly' | 'monthly' | 'yearly'
  // Progreso de la tarea (0-100)
  progress?: number;
}

export interface TaskResponse {
  success: boolean;
  data?: Task | Task[] | TaskStats;
  message?: string;
}

export interface TaskStats {
  totalTasks: number;
  pendingTasks: number;
  inProgressTasks: number;
  completedTasks: number;
  tasksByCategory: Record<TaskCategory, number>;
  tasksByPriority: Record<TaskPriority, number>;
  tasksByMember: Record<number, { name: string; count: number; completed: number }>;
}

export interface DatabaseTask {
  id: number;
  title: string;
  description?: string | null;
  category: TaskCategory;
  priority: TaskPriority;
  status: TaskStatus;
  assigned_user_id: number;
  assigned_user_ids?: number[];
  assigned_user_name?: string;
  created_by_id: number;
  created_by_name?: string;
  start_date?: Date;
  due_date?: Date;
  estimated_time?: number;
  // Campos de recurrencia en BD
  is_recurring?: boolean;
  recurrence_type?: string | null;
  recurrence_interval?: number | null;
  recurrence_days?: any;
  recurrence_end_date?: Date | null;
  parent_task_id?: number | null;
  reward?: string;
  file_url?: string;
  completed_at?: Date;
  created_at: Date;
  updated_at?: Date;
  progress?: number;       // Progreso de la tarea (0-100)
}