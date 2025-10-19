import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
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
  userId?: number;
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
export class AiQueryService {
  private readonly BASE_URL = environment.services.aiQuery || `${environment.apiUrl}/ai-query`;

  constructor(private http: HttpClient) {}

  listConnections(): Observable<{ success: boolean; connections: AiConnectionInfo[] }> {
    return this.http.get<{ success: boolean; connections: AiConnectionInfo[] }>(`${this.BASE_URL}/connections`);
  }

  chat(body: AiChatRequest): Observable<AiChatResponse> {
    return this.http.post<AiChatResponse>(`${this.BASE_URL}/chat`, body);
  }
}