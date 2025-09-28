export interface User {
  id: number;
  name: string;
  role: 'leader' | 'member'; // 'leader' para líder del hogar (padre/madre/tutor), 'member' para miembro (hijo)
  familyRole?: string; // Rol específico en la familia: 'padre', 'madre', 'tutor', 'hijo', 'hija'
  age?: number; // Edad del miembro de la familia
  avatar?: string; // Emoji o URL del avatar
  tasksCompleted?: number; // Número de tareas completadas
  joinedAt?: Date; // Fecha de incorporación a la familia
  isActive?: boolean; // Si el miembro está activo
}

export interface UserResponse {
  success: boolean;
  data?: User | User[];
  message?: string;
}

export interface FamilyStats {
  totalMembers: number;
  leaders: number;
  members: number;
  activeMembers: number;
}