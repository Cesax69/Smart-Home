import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, tap, of } from 'rxjs';
import { User, LoginRequest, LoginResponse } from '../models/user.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly API_URL = environment.services.auth;
  private readonly USE_MOCK = environment.useMockData;
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  private tokenKey = 'smart_home_token';
  
  public currentUser$ = this.currentUserSubject.asObservable();
  public currentUser = signal<User | null>(null);
  public isAuthenticated = signal(false);

  constructor(private http: HttpClient) {
    // Solo cargar desde localStorage si estamos en el navegador
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      this.loadUserFromStorage();
    }
  }

  login(credentials: LoginRequest): Observable<LoginResponse> {
    if (this.USE_MOCK) {
      return this.mockLogin(credentials);
    } else {
      return this.backendLogin(credentials);
    }
  }

  // Método para login con backend real (preparado para futuro uso)
  private backendLogin(credentials: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.API_URL}/auth/login`, credentials)
      .pipe(
        tap(response => {
          this.setCurrentUser(response.user, response.token);
        })
      );
  }

  // Método mock actual (se mantendrá hasta que el backend esté listo)
  private mockLogin(credentials: LoginRequest): Observable<LoginResponse> {
    return new Observable<LoginResponse>(observer => {
      setTimeout(() => {
        // Simular validación de datos
        if (!credentials.username || !credentials.password) {
          observer.error({ error: { message: 'Usuario y contraseña son requeridos' } });
          return;
        }

        // Buscar usuario en localStorage
        const existingUsers = this.getStoredUsers();
        const user = existingUsers.find(u => 
          (u.username === credentials.username || u.email === credentials.username)
        );

        if (!user) {
          observer.error({ error: { message: 'Usuario no encontrado' } });
          return;
        }

        // En una implementación real, aquí verificarías la contraseña hasheada
        // Por ahora, aceptamos cualquier contraseña para testing
        const response: LoginResponse = {
          user: user,
          token: 'mock_token_' + Date.now(),
          message: '¡Inicio de sesión exitoso!'
        };

        this.setCurrentUser(response.user, response.token);
        observer.next(response);
        observer.complete();
      }, 800); // Simular delay de red
    });
  }

  // Método para login por rol (simplificado)
  loginByRole(role: 'head_of_household' | 'family_member'): Observable<LoginResponse> {
    if (this.USE_MOCK) {
      return this.mockLoginByRole(role);
    } else {
      // Cuando el backend esté listo, implementar endpoint específico
      return this.http.post<LoginResponse>(`${this.API_URL}/auth/login-by-role`, { role });
    }
  }

  private mockLoginByRole(role: 'head_of_household' | 'family_member'): Observable<LoginResponse> {
    return new Observable<LoginResponse>(observer => {
      setTimeout(() => {
        const users = this.getStoredUsers();
        const user = users.find(u => u.role === role);
        
        if (!user) {
          observer.error({ error: { message: 'No se encontró usuario con ese rol' } });
          return;
        }

        const response: LoginResponse = {
          user: user,
          token: 'mock_token_' + Date.now(),
          message: `¡Bienvenido ${role === 'head_of_household' ? 'Jefe del Hogar' : 'Miembro'}!`
        };

        this.setCurrentUser(response.user, response.token);
        observer.next(response);
        observer.complete();
      }, 500);
    });
  }

  logout(): void {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      localStorage.removeItem(this.tokenKey);
      localStorage.removeItem('smart_home_user');
    }
    this.currentUserSubject.next(null);
    this.currentUser.set(null);
    this.isAuthenticated.set(false);
  }

  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  getToken(): string | null {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return null;
    }
    return localStorage.getItem(this.tokenKey);
  }

  isHeadOfHousehold(): boolean {
    const user = this.getCurrentUser();
    return user?.role === 'head_of_household';
  }

  isFamilyMember(): boolean {
    const user = this.getCurrentUser();
    return user?.role === 'family_member';
  }

  getFamilyMembers(): Observable<User[]> {
    // Obtener usuarios del almacenamiento local
    return of(this.getStoredUsers());
  }

  // Método para obtener miembros de la familia (simulado por ahora)
  private getStoredUsers(): User[] {
    const stored = localStorage.getItem('smart_home_users');
    if (stored) {
      return JSON.parse(stored);
    }
    
    // Usuarios por defecto para testing
    const defaultUsers: User[] = [
      {
        id: 1,
        username: 'admin',
        email: 'admin@smarthome.com',
        firstName: 'Admin',
        lastName: 'Sistema',
        role: 'head_of_household',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01')
      },
      {
        id: 2,
        username: 'maria',
        email: 'maria@familia.com',
        firstName: 'María',
        lastName: 'García',
        role: 'head_of_household',
        createdAt: new Date('2024-01-02'),
        updatedAt: new Date('2024-01-02')
      },
      {
        id: 3,
        username: 'juan',
        email: 'juan@familia.com',
        firstName: 'Juan',
        lastName: 'García',
        role: 'family_member',
        createdAt: new Date('2024-01-03'),
        updatedAt: new Date('2024-01-03')
      }
    ];
    
    localStorage.setItem('smart_home_users', JSON.stringify(defaultUsers));
    return defaultUsers;
  }

  private setCurrentUser(user: User, token: string): void {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      localStorage.setItem(this.tokenKey, token);
      localStorage.setItem('smart_home_user', JSON.stringify(user));
    }
    this.currentUserSubject.next(user);
    this.currentUser.set(user);
    this.isAuthenticated.set(true);
  }

  private loadUserFromStorage(): void {
    // Verificar que localStorage esté disponible
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return;
    }
    
    const token = localStorage.getItem(this.tokenKey);
    const userStr = localStorage.getItem('smart_home_user');
    
    if (token && userStr) {
      try {
        const user = JSON.parse(userStr) as User;
        this.currentUserSubject.next(user);
        this.currentUser.set(user);
        this.isAuthenticated.set(true);
      } catch (error) {
        console.error('Error parsing user from storage:', error);
        this.logout();
      }
    }
  }
}