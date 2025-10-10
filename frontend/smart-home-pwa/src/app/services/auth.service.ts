import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, tap, map } from 'rxjs';
import { User, LoginRequest, LoginResponse } from '../models/user.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly API_URL = environment.services.auth;
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
    return this.backendLogin(credentials);
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

  

  // Método para login por rol (simplificado)
  loginByRole(role: 'head_of_household' | 'family_member'): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.API_URL}/auth/login-by-role`, { role });
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
    // Consultar el microservicio de usuarios
    return this.http.get<any>(`${this.API_URL}/users`).pipe(
      tap(response => {
        console.log('Family members from microservice:', response);
      }),
      // Extraer los datos del response del microservicio
      map(response => response.data || response)
    );
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