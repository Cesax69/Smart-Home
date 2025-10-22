import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface AiConnectionInfo {
  id: string;
  type: 'postgres' | 'mysql' | 'mssql' | 'mongo';
  name: string;
}

export interface AiChatRequest {
  message: string;
  connectionId?: string;
  limit?: number;
  userId?: number | string;
  userRole?: string;
}

export interface AiChatResponse {
  success: boolean;
  query: { sql?: string; mongo?: { collection: string; pipeline?: any[]; filter?: any } };
  result?: { rows: any[]; meta?: any };
  notes?: string;
  summary?: string;
  error?: string;
}

@Injectable({ providedIn: 'root' })
export class SimpleAiQueryService {
  private readonly BASE_URL = environment.services?.aiQuery || 'http://localhost:3006/api/ai-query';

  constructor(private http: HttpClient) {}

  getHealth(): Observable<{ success: boolean; status?: string } | any> {
    return this.http.get(`${this.BASE_URL}/health`, { headers: this.getAuthHeaders() });
  }

  getConnections(): Observable<{ success: boolean; connections: AiConnectionInfo[] }> {
    return this.http.get<{ success: boolean; connections: AiConnectionInfo[] }>(`${this.BASE_URL}/connections`, { headers: this.getAuthHeaders() });
  }

  chat(body: AiChatRequest): Observable<AiChatResponse> {
    return this.http.post<AiChatResponse>(`${this.BASE_URL}/chat`, body, { headers: this.getAuthHeaders() });
  }

  addConnection(body: { id: string; type: 'postgres'; name: string; url: string; readOnly?: boolean }): Observable<{ success: boolean; connections: AiConnectionInfo[] }> {
    return this.http.post<{ success: boolean; connections: AiConnectionInfo[] }>(`${this.BASE_URL}/connections`, body, { headers: this.getAuthHeaders() });
  }

  private getAuthHeaders(): HttpHeaders {
    let token = '';
    // Guardar para SSR: localStorage no existe en servidor
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      token = localStorage.getItem('token') || '';
    }
    const headersConfig: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
    if (token) headersConfig['Authorization'] = `Bearer ${token}`;
    return new HttpHeaders(headersConfig);
  }
}