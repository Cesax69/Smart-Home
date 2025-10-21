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
    // Cargar solo el token desde localStorage si estamos en el navegador
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      this.loadTokenFromStorage();
    }
  }

  login(credentials: LoginRequest): Observable<LoginResponse> {
    return this.backendLogin(credentials);
  }

  private backendLogin(credentials: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.API_URL}/auth/login`, credentials)
      .pipe(
        tap(response => {
          this.setCurrentUser(response.user, response.token);
        })
      );
  }

  loginByRole(role: 'head_of_household' | 'family_member'): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.API_URL}/auth/login-by-role`, { role })
      .pipe(tap(response => this.setCurrentUser(response.user, response.token)));
  }

  logout(): void {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      localStorage.removeItem(this.tokenKey);
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
    return this.http.get<any>(`${this.API_URL}/users`).pipe(
      map(response => response.data || response)
    );
  }

  private setCurrentUser(user: User, token: string): void {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      localStorage.setItem(this.tokenKey, token);
    }
    this.currentUserSubject.next(user);
    this.currentUser.set(user);
    this.isAuthenticated.set(true);
  }

  private loadTokenFromStorage(): void {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return;
    }
    const token = localStorage.getItem(this.tokenKey);
    if (token) {
      // Si existe token, consideramos la sesión activa; los datos de usuario se obtienen del backend
      this.isAuthenticated.set(true);
    }
  }
}