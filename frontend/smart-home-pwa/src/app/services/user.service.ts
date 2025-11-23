import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../environments/environment';
import { User } from '../models/user.model';

@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly API_URL = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // Obtiene todos los usuarios/miembros
  getUsers(): Observable<User[]> {
    return this.http.get<any>(`${this.API_URL}/users`).pipe(
      map((res) => {
        const data = (res?.data ?? res ?? []) as any[];
        return (data || []).map((u: any) => ({
          id: Number(u?.id),
          username: String(u?.username ?? ''),
          email: String(u?.email ?? ''),
          role: (u?.role as any) ?? 'family_member',
          firstName: String(u?.firstName ?? u?.first_name ?? ''),
          lastName: String(u?.lastName ?? u?.last_name ?? ''),
          createdAt: u?.createdAt ?? u?.created_at ?? undefined,
          updatedAt: u?.updatedAt ?? u?.updated_at ?? undefined
        })) as User[];
      })
    );
  }

  // Mapa id -> nombre legible
  getUserNameMap(): Observable<Record<number, string>> {
    return this.getUsers().pipe(
      map((users) => {
        const mapById: Record<number, string> = {};
        users.forEach((u) => {
          const fullName = [u.firstName, u.lastName].filter(Boolean).join(' ').trim();
          const display = fullName || u.username || `Usuario ${u.id}`;
          mapById[Number(u.id)] = display;
        });
        return mapById;
      })
    );
  }

  // Obtener un usuario por ID
  getUserById(id: number): Observable<User | null> {
    return this.http.get<any>(`${this.API_URL}/users/${id}`).pipe(
      map((res) => {
        const u = (res?.data ?? res ?? null) as any;
        if (!u) return null;
        return {
          id: Number(u?.id),
          username: String(u?.username ?? ''),
          email: String(u?.email ?? ''),
          role: (u?.role as any) ?? 'family_member',
          firstName: String(u?.firstName ?? u?.first_name ?? ''),
          lastName: String(u?.lastName ?? u?.last_name ?? ''),
          createdAt: u?.createdAt ?? u?.created_at ?? undefined,
          updatedAt: u?.updatedAt ?? u?.updated_at ?? undefined
        } as User;
      })
    );
  }
}