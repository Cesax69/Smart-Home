export interface Task {
  id: number;
  title: string;
  description: string;
  category: 'limpieza' | 'cocina' | 'lavanderia' | 'jardin' | 'mantenimiento' | 'organizacion' | 'mascotas' | 'compras' | 'otros';
  status: 'pending' | 'in_progress' | 'completed' | 'archived' | 'pendiente' | 'en_proceso' | 'completada' | 'archivada';
  priority: 'baja' | 'media' | 'alta' | 'urgente';
  assignedTo: number; // User ID
  assignedUserId?: number; // Para compatibilidad con backend
  assignedUserIds?: number[]; // Todos los asignados
  assignedBy: number; // User ID
  dueDate?: Date;
  startDate?: Date;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  estimatedTime?: number; // Tiempo estimado en minutos
  reward?: string; // Recompensa por completar la tarea
  fileUrl?: string;
  files?: TaskFile[];
  progress?: number; // Progreso de la tarea (0-100)
  isRecurring?: boolean;
  recurrenceInterval?: string;
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
  status?: 'pending' | 'in_progress' | 'completed' | 'archived' | 'pendiente' | 'en_proceso' | 'completada' | 'archivada';
  priority?: 'baja' | 'media' | 'alta' | 'urgente';
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
  // Campos alternativos en snake_case que puede devolver el backend
  file_name?: string;
  filePath?: string | null;
  fileUrl?: string | null;
  fileSize?: number | null;
  file_size?: number | null;
  fileType?: string | null;
  mime_type?: string | null;
  mimeType?: string | null;
  uploadedBy?: number | null;
  uploaded_by_name?: string | null;
  storageType?: string | null; // e.g., 'google_drive'
  googleDriveId?: string | null;
  isImage?: boolean | null;
  thumbnailPath?: string | null;
  folderId?: string | null;
  folder_id?: string | null;
  folderName?: string | null;
  createdAt?: Date | string;
  created_at?: Date | string;
}

export interface TaskComment {
  id: number;
  taskId: number;
  comment: string;
  createdBy: number;
  createdByName?: string;
  createdAt?: Date | string;
}