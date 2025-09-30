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

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  user: User;
  token: string;
  message?: string;
}