// Modelo de usuario alineado con los datos reales en la BD
export interface User {
  id: number;
  username: string;
  email: string;
  role: 'head_of_household' | 'family_member';
  firstName: string;
  lastName: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserResponse {
  success: boolean;
  data?: User | User[];
  message?: string;
}

export interface FamilyStats {
  totalMembers: number;
  headsOfHousehold: number;
  familyMembers: number;
}