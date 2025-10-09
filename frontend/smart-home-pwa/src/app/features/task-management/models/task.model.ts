export interface Task {
  id: number;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed';
  priority: 'low' | 'medium' | 'high';
  assignedTo: number; // User ID
  assignedUserIds?: number[]; // Todos los asignados
  assignedBy: number; // User ID
  dueDate?: Date;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  estimatedTime?: number; // Tiempo estimado en minutos
  reward?: string; // Recompensa por completar la tarea
  fileUrl?: string;
  files?: TaskFile[];
  progress?: number; // Progreso de la tarea (0-100)
}

export interface CreateTaskRequest {
  title: string;
  description: string;
  category: 'limpieza' | 'cocina' | 'lavanderia' | 'jardin' | 'mantenimiento' | 'organizacion' | 'mascotas' | 'compras' | 'otros';
  priority: 'baja' | 'media' | 'alta' | 'urgente';
  assignedUserId: number;
  assignedUserIds?: number[];
  createdById: number;
  dueDate?: Date;
  startDate?: Date;
  isRecurring?: boolean;
  recurrenceInterval?: string;
  estimatedTime?: number;
  reward?: string;
  fileUrl?: string;
}

export interface UpdateTaskRequest {
  title?: string;
  description?: string;
  status?: 'pending' | 'in_progress' | 'completed';
  priority?: 'low' | 'medium' | 'high';
  assignedTo?: number;
  assignedUserIds?: number[];
  dueDate?: Date;
  progress?: number; // Progreso de la tarea (0-100)
}

export interface TaskStats {
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
  overdue: number;
}

export interface TaskFile {
  id: number;
  taskId: number;
  fileName: string;
  filePath?: string | null;
  fileUrl?: string | null;
  fileSize?: number | null;
  fileType?: string | null;
  mimeType?: string | null;
  uploadedBy?: number | null;
  storageType?: string | null; // e.g., 'google_drive'
  googleDriveId?: string | null;
  isImage?: boolean | null;
  thumbnailPath?: string | null;
  createdAt?: Date | string;
}