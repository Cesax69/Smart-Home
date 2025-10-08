export interface Task {
  id: number;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed';
  priority: 'low' | 'medium' | 'high';
  assignedTo: number; // User ID
  assignedBy: number; // User ID
  dueDate?: Date;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

export interface CreateTaskRequest {
  title: string;
  description: string;
  category: 'limpieza' | 'cocina' | 'lavanderia' | 'jardin' | 'mantenimiento' | 'organizacion' | 'mascotas' | 'compras' | 'otros';
  priority: 'baja' | 'media' | 'alta' | 'urgente';
  assignedUserId: number;
  createdById: number;
  dueDate?: Date;
  startDate?: Date;
  isRecurring?: boolean;
  recurrenceInterval?: string;
  estimatedTime?: number;
  reward?: string;
}

export interface UpdateTaskRequest {
  title?: string;
  description?: string;
  status?: 'pending' | 'in_progress' | 'completed';
  priority?: 'low' | 'medium' | 'high';
  assignedTo?: number;
  dueDate?: Date;
}

export interface TaskStats {
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
  overdue: number;
}