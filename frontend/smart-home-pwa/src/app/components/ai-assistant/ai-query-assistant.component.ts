import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { AiQueryService, AiConnectionInfo, AiChatResponse } from '../../services/ai-query.service';
import { AuthService } from '../../services/auth.service';

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  meta?: any;
}

@Component({
  selector: 'app-ai-query-assistant',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    MatDividerModule
  ],
  template: `
    <div class="assistant-container">
      <mat-card class="assistant-header">
        <div class="title-row">
          <div class="title-left">
            <mat-icon class="brand-icon">smart_toy</mat-icon>
            <div>
              <h2 class="assistant-title">Asistente de Datos</h2>
              <p class="assistant-subtitle">Consultas de solo lectura a múltiples bases usando IA</p>
            </div>
          </div>
          <div class="title-right">
            <mat-icon class="guard-icon" matTooltip="Seguridad de solo lectura">lock</mat-icon>
          </div>
        </div>
        <div class="controls-row">
          <mat-form-field appearance="outline" class="conn-select">
            <mat-label>Conexión</mat-label>
            <mat-select [(ngModel)]="selectedConnectionId">
              <mat-option *ngFor="let c of connections()" [value]="c.id">
                {{ c.name }} ({{ c.type }})
              </mat-option>
            </mat-select>
          </mat-form-field>
          <mat-form-field appearance="outline" class="limit-input">
            <mat-label>Límite</mat-label>
            <input matInput type="number" min="1" max="500" [(ngModel)]="limit" />
          </mat-form-field>
        </div>
      </mat-card>

      <mat-card class="chat-card">
        <div class="chat-history" id="chatHistory">
          <div *ngFor="let msg of messages()" [class]="'msg ' + msg.role">
            <div class="bubble">
              <div class="role-icon">
                <mat-icon *ngIf="msg.role === 'user'">person</mat-icon>
                <mat-icon *ngIf="msg.role === 'assistant'">psychology</mat-icon>
                <mat-icon *ngIf="msg.role === 'system'">info</mat-icon>
              </div>
              <div class="content" [innerHTML]="msg.content"></div>
              <div class="meta" *ngIf="msg.meta">
                <pre>{{ msg.meta | json }}</pre>
              </div>
            </div>
          </div>
          <div *ngIf="messages().length === 0" class="empty-chat">
            <mat-icon>chat_bubble_outline</mat-icon>
            <p>Escribe una pregunta como: "Muestra los 20 últimos usuarios registrados"</p>
          </div>
        </div>
        <mat-divider></mat-divider>
        <form [formGroup]="chatForm" class="chat-input" (ngSubmit)="onSend()">
          <mat-form-field class="message-field" appearance="outline">
            <mat-label>Tu pregunta</mat-label>
            <textarea matInput rows="3" formControlName="message" placeholder="Ej: ¿Cuántas tareas hay en estado pendiente?" ></textarea>
          </mat-form-field>
          <button mat-raised-button color="primary" [disabled]="loading() || chatForm.invalid">
            <mat-icon>send</mat-icon>
            <span>Enviar</span>
          </button>
        </form>
        <div class="loading" *ngIf="loading()">
          <mat-progress-spinner mode="indeterminate" diameter="32"></mat-progress-spinner>
          <span>Procesando consulta...</span>
        </div>
      </mat-card>

      <mat-card class="result-card" *ngIf="lastResult()">
        <div class="result-header">
          <div class="query-info">
            <mat-icon>psychology</mat-icon>
            <span>Respuesta</span>
          </div>
        </div>
        <div class="summary-text">{{ summaryText() }}</div>
        <div class="result-body">
          <div *ngIf="hasTabular()" class="table-wrap">
            <table class="result-table">
              <thead>
                <tr>
                  <th *ngFor="let k of tableKeys()">{{ k }}</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let r of lastResult()!.result!.rows">
                  <td *ngFor="let k of tableKeys()">{{ r[k] }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div *ngIf="!hasTabular()" class="json-wrap">
            <pre>{{ lastResult()!.result | json }}</pre>
          </div>
        </div>
        <div class="notes" *ngIf="lastResult()!.notes">
          <mat-icon>sticky_note_2</mat-icon>
          <span>{{ lastResult()!.notes }}</span>
        </div>
      </mat-card>
    </div>
  `,
  styles: [`
    .assistant-container { max-width: 1200px; margin: 32px auto; padding: 0 16px; }
    .assistant-header { margin-bottom: 16px; padding: 16px; border-radius: 16px; border: 1px solid #e3e8ff; box-shadow: 0 8px 24px rgba(16,24,40,0.08); background: linear-gradient(135deg, #f8fbff, #eef3ff); }
    .title-row { display:flex; align-items:center; justify-content:space-between; }
    .title-left { display:flex; align-items:center; gap:12px; }
    .brand-icon { font-size: 36px; color:#3f51b5; }
    .assistant-title { margin:0; font-size:24px; font-weight:600; color:#1f2937; }
    .assistant-subtitle { margin:0; color:#5b6470; font-size:14px; }
    .guard-icon { color:#4f46e5; }
    .controls-row { display:flex; gap:12px; margin-top:12px; }
    .conn-select, .limit-input { flex: 1 1 220px; }

    .chat-card { border-radius: 16px; border: 1px solid #e4e8f7; box-shadow: 0 8px 24px rgba(16,24,40,0.08); }
    .chat-history { max-height: 54vh; overflow:auto; padding: 16px; background:#ffffff; border-radius:12px; }
    .empty-chat { display:flex; align-items:center; gap:10px; color:#6b7280; border:1px dashed #d7dce6; background:#f7f9fc; padding: 12px; border-radius: 12px; }
    .msg { display:flex; margin-bottom: 12px; }
    .msg .bubble { display:grid; grid-template-columns: 28px 1fr; gap:12px; padding:12px 14px; border-radius:12px; max-width:85%; line-height:1.45; font-size:14.5px; box-shadow: 0 1px 2px rgba(16,24,40,0.06); }
    .msg.user .bubble { margin-left:auto; background:#E8F0FE; border:1px solid #C5D2F7; }
    .msg.assistant .bubble { margin-right:auto; background:#F1EBFF; border:1px solid #E0D7FF; }
    .msg.system .bubble { margin:0 auto; background:#F9FAFB; border:1px dashed #E5E7EB; }
    .role-icon { display:grid; place-items:center; width:28px; height:28px; border-radius:50%; background:#fff; border:1px solid #e4e8f7; }
    .content { color:#111827; }
    .chat-input { display:flex; align-items:flex-end; gap:10px; padding:12px; background:#fff; border-top: 1px solid #e4e8f7; }
    .message-field { flex:1; }
    .loading { display:flex; align-items:center; gap:10px; padding:10px; }

    .result-card { margin-top:16px; border-radius:16px; box-shadow: 0 8px 24px rgba(16,24,40,0.08); }
    .result-header { display:flex; justify-content:space-between; align-items:center; padding: 8px 12px; }
    .summary-text { background:#f7f9ff; border:1px solid #e3e8ff; color:#2b2e5e; padding:10px 12px; border-radius:10px; margin:10px 12px; }
    .result-body { padding: 12px; }
    .table-wrap { overflow:auto; border:1px solid #e4e8f7; border-radius: 10px; }
    .result-table { border-collapse: separate; border-spacing: 0; width:100%; }
    .result-table th { position: sticky; top: 0; background: #f9fafb; text-transform: uppercase; letter-spacing: 0.3px; font-size: 12px; }
    .result-table tr:nth-child(even) td { background: #fcfdff; }
    .result-table th, .result-table td { border: 1px solid #ddd; padding: 8px; font-size: 13px; }
    .json-wrap pre { background:#fafafa; padding:12px; border-radius:8px; }
    .notes { display:flex; align-items:center; gap:8px; margin-top:10px; color:#555; }
  `]
})
export class AiQueryAssistantComponent implements OnInit {
  private fb = inject(FormBuilder);
  private ai = inject(AiQueryService);
  private auth = inject(AuthService);

  chatForm: FormGroup = this.fb.group({
    message: ['', [Validators.required, Validators.minLength(3)]]
  });

  connections = signal<AiConnectionInfo[]>([]);
  selectedConnectionId?: string;
  limit = 100;

  messages = signal<ChatMessage[]>([]);
  loading = signal(false);
  lastResult = signal<AiChatResponse | null>(null);

  ngOnInit(): void {
    this.ai.listConnections().subscribe({
      next: (res) => {
        this.connections.set(res.connections || []);
        if (!this.selectedConnectionId && res.connections?.length) {
          this.selectedConnectionId = res.connections[0].id;
        }
        this.pushSystem('Conectado. Seguridad de solo lectura habilitada.');
      },
      error: () => {
        this.pushSystem('No hay conexiones configuradas. Configure AI_DB_CONNECTIONS en el backend.');
      }
    });
  }

  onSend(): void {
    if (this.chatForm.invalid || this.loading()) return;
    const message = this.chatForm.value.message;
    this.pushUser(message);
    this.loading.set(true);
    const currentUser = this.auth.getCurrentUser();
    const userId = currentUser?.id;
    const userRole = currentUser?.role;
    this.ai.chat({ message, connectionId: this.selectedConnectionId, limit: this.limit, userId, userRole }).subscribe({
      next: (res) => {
        this.lastResult.set(res);
        const text = res.summary || this.buildLocalSummary(res);
        this.pushAssistant(text);
        this.loading.set(false);
        this.scrollToBottom();
      },
      error: (err) => {
        const msg = err?.error?.error || 'No se pudo procesar la consulta. Verifique configuración de IA.';
        this.pushAssistant(`<span style='color:#c62828'>${msg}</span>`);
        this.loading.set(false);
      }
    });
    this.chatForm.reset();
  }

  hasTabular(): boolean {
    const rows = this.lastResult()?.result?.rows;
    return Array.isArray(rows) && rows.length > 0 && typeof rows[0] === 'object';
  }

  tableKeys(): string[] {
    const rows = this.lastResult()?.result?.rows || [];
    return rows.length ? Object.keys(rows[0]) : [];
  }

  resultDialect(): string {
    const q = this.lastResult()?.query;
    if (!q) return '';
    return q.sql ? 'SQL' : 'MongoDB';
  }

  displayQuery(): string {
    const q = this.lastResult()?.query;
    if (!q) return '';
    if (q.sql) return q.sql;
    return JSON.stringify(q.mongo, null, 2);
  }

  summaryText(): string {
    const res = this.lastResult();
    if (!res) return '';
    return res.summary || this.buildLocalSummary(res);
  }

  private buildLocalSummary(res: AiChatResponse): string {
    const rows = res.result?.rows || [];
    const count = rows.length;
    if (count === 0) return 'No se encontraron resultados para tu consulta.';
    // Detectar campos comunes
    const keys = Object.keys(rows[0] || {});
    const titleKey = ['title','name','descripcion','description'].find(k => keys.includes(k));
    const statusKey = ['status','estado'].find(k => keys.includes(k));
    const dueKey = ['due_date','fecha','fecha_limite'].find(k => keys.includes(k));
    const head = `Encontré ${count} ${count === 1 ? 'resultado' : 'resultados'}.`;
    const lines = rows.slice(0, 5).map((r, i) => {
      const parts = [titleKey ? (r as any)[titleKey] : undefined, statusKey ? (r as any)[statusKey] : undefined, dueKey ? (r as any)[dueKey] : undefined].filter(Boolean);
      return parts.length ? `${i + 1}. ${parts.join(' — ')}` : `${i + 1}. ${JSON.stringify(r)}`;
    });
    return `${head}${lines.length ? '\n' + lines.join('\n') : ''}`;
  }

  private pushUser(text: string) { this.messages.set([...this.messages(), { role: 'user', content: text }]); }
  private pushAssistant(html: string, meta?: any) { this.messages.set([...this.messages(), { role: 'assistant', content: html, meta }]); }
  private pushSystem(text: string) { this.messages.set([...this.messages(), { role: 'system', content: text }]); }

  private scrollToBottom() {
    setTimeout(() => {
      const el = document.getElementById('chatHistory');
      if (el) el.scrollTop = el.scrollHeight;
    }, 50);
  }
}