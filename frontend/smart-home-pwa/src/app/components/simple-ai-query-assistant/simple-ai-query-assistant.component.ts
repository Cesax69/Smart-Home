import { Component, OnInit, signal, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { SimpleAiQueryService, AiConnectionInfo, AiChatResponse } from '../../services/simple-ai-query.service';

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  meta?: any;
}

@Component({
  selector: 'app-simple-ai-query-assistant',
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
    MatDividerModule,
    MatButtonToggleModule
  ],
  template: `
    <div class="assistant-container">
      <mat-card class="assistant-header">
        <div class="title-row">
          <div class="title-left">
            <mat-icon class="brand-icon">smart_toy</mat-icon>
            <div>
              <h2 class="assistant-title">AI Query Assistant</h2>
              <p class="assistant-subtitle">Consultas de solo lectura con auditoría mínima</p>
            </div>
          </div>
          <div class="title-right">
            <mat-button-toggle-group class="view-toggle" [value]="viewMode" (change)="onViewChange($event.value)">
              <mat-button-toggle value="chat">Vista Chat</mat-button-toggle>
              <mat-button-toggle value="develop">Vista Develop</mat-button-toggle>
            </mat-button-toggle-group>
          </div>
        </div>
        <div class="controls-row" *ngIf="viewMode === 'develop'">
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
            <input matInput type="number" [(ngModel)]="limit" min="1" max="500" />
          </mat-form-field>
        </div>
        <div class="add-conn-row" *ngIf="viewMode === 'develop'">
          <form [formGroup]="connForm" (ngSubmit)="addConnection()" class="add-conn-form">
            <mat-form-field appearance="outline" class="conn-id">
              <mat-label>ID</mat-label>
              <input matInput formControlName="id" placeholder="ej: users-pg" />
            </mat-form-field>
            <mat-form-field appearance="outline" class="conn-name">
              <mat-label>Nombre</mat-label>
              <input matInput formControlName="name" placeholder="ej: Users DB (Postgres)" />
            </mat-form-field>
            <mat-form-field appearance="outline" class="conn-url">
              <mat-label>URL</mat-label>
              <input matInput formControlName="url" placeholder="postgresql://user:pass@host:5432/db" />
            </mat-form-field>
            <button mat-stroked-button color="accent" type="submit" [disabled]="connForm.invalid">Agregar conexión</button>
          </form>
        </div>
      </mat-card>

      <mat-card class="assistant-body">
        <form [formGroup]="form" (ngSubmit)="send()">
          <mat-form-field appearance="outline" class="message-input">
            <mat-label>Pregunta</mat-label>
            <textarea matInput formControlName="message" rows="3" placeholder="Ej: ¿Cuántas tareas pendientes hay?"></textarea>
          </mat-form-field>
          <div class="actions-row">
            <button mat-raised-button color="primary" type="submit" [disabled]="loading()">Enviar</button>
            <mat-progress-spinner *ngIf="loading()" diameter="24" mode="indeterminate"></mat-progress-spinner>
          </div>
        </form>
      </mat-card>

      <!-- Vista CHAT -->
      <mat-card class="chat-card" *ngIf="viewMode === 'chat'">
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
        <div class="loading" *ngIf="loading()">
          <mat-progress-spinner mode="indeterminate" diameter="32"></mat-progress-spinner>
          <span>Procesando consulta...</span>
        </div>
      </mat-card>

      <!-- Vista DEVELOP -->
      <mat-card class="assistant-results" *ngIf="viewMode === 'develop' && lastResponse()">
        <h3>Resultado</h3>
        <div class="error-banner" *ngIf="lastResponse()!.success === false">
{{ lastResponse()!.error || 'No se pudo procesar la consulta.' }}
        </div>
        <p class="summary" *ngIf="lastResponse()!.summary && lastResponse()!.success !== false">{{ lastResponse()!.summary }}</p>
        <p class="notes" *ngIf="lastResponse()!.notes && lastResponse()!.success !== false">{{ lastResponse()!.notes }}</p>
        <mat-divider></mat-divider>
        <div class="sql" *ngIf="lastResponse()!.query?.sql && lastResponse()!.success !== false">
          <div class="sql-head">
            <h4>SQL generado</h4>
            <button type="button" class="copy-sql" (click)="copySql(lastResponse()!.query!.sql)">Copiar SQL</button>
          </div>
          <pre>{{ lastResponse()!.query!.sql }}</pre>
        </div>
        <div class="rows" *ngIf="lastResponse()!.result?.rows?.length && lastResponse()!.success !== false">
          <h4>Filas</h4>
          <div class="table-scroll">
            <table class="results-table">
              <thead>
                <tr>
                  <th *ngFor="let col of getColumns(lastResponse()!.result!.rows!)">{{ col }}</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let r of lastResponse()!.result!.rows!">
                  <td *ngFor="let col of getColumns(lastResponse()!.result!.rows!)">{{ r[col] }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </mat-card>
    </div>
  `,
  styles: [`
    .assistant-container { display: flex; flex-direction: column; gap: 16px; max-width: 960px; margin: 0 auto; margin-top: 48px;}
    .assistant-header, .assistant-body, .assistant-results { padding: 16px; }
    .assistant-header { background: #a3b5c6ff; color: #fff; }
    .assistant-title { color: #fff; margin: 0; }
    .assistant-subtitle { color: #e3f2fd; margin: 0; }
    .title-row { display: flex; align-items: center; justify-content: space-between; }
    .title-left { display: flex; align-items: center; gap: 12px; }
    .brand-icon { font-size: 32px; color: #fff; }
    .controls-row { display: flex; gap: 16px; margin-top: 12px; }
    .add-conn-row { margin-top: 12px; }
    .add-conn-form { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; }
    .conn-select { width: 320px; }
    .limit-input { width: 160px; }
    .conn-id { width: 150px; }
    .conn-name { width: 240px; }
    .conn-url { flex: 1; min-width: 280px; }
    .message-input { width: 100%; }
    .actions-row { display: flex; align-items: center; gap: 12px; }
    .view-toggle { background:#fff; border-radius:8px; }

    /* Estilos de tabla para vista Develop */
    .sql pre { background: #0f172a; color: #e2e8f0; padding: 12px; border-radius: 8px; white-space: pre-wrap; overflow-wrap:anywhere; word-break: break-word; overflow: auto; max-height: 280px; max-width: 100%; }
    .assistant-reply .sql pre { background: #0f172a; color: #e2e8f0; padding: 10px; border-radius: 8px; white-space: pre-wrap; overflow-wrap:anywhere; word-break: break-word; overflow:auto; max-height: 220px; max-width: 100%; }
    .sql-head { display:flex; align-items:center; justify-content: space-between; gap: 8px; }
    .copy-sql { font-size: 12px; padding: 4px 8px; border: 1px solid #cbd5e1; border-radius: 6px; background:#fff; color:#1f2937; cursor:pointer; }
    .copy-sql:hover { background:#f8fafc; }
    .table-scroll { overflow-x: auto; }
    .results-table { width: 100%; border-collapse: collapse; }
    .results-table th { background: #1976d2; color: #fff; padding: 8px; text-align: left; }
    .results-table td { padding: 8px; border-bottom: 1px solid #e0e0e0; }
    .summary { font-weight: 600; }
    .notes { color: #555; }

    /* Estilos del chat */
    .chat-card { border-radius: 16px; border: 1px solid #e4e8f7; box-shadow: 0 8px 24px rgba(16,24,40,0.08); }
    .error-banner { display:flex; align-items:center; gap:8px; color:#b91c1c; background:#fee2e2; border:1px solid #fecaca; padding:10px; border-radius:8px; }
    .chat-history { max-height: 54vh; overflow:auto; padding: 16px; background:#ffffff; border-radius:12px; }
    .empty-chat { display:flex; align-items:center; gap:10px; color:#6b7280; border:1px dashed #d7dce6; background:#f7f9fc; padding: 12px; border-radius: 12px; }
    .msg { display:flex; margin-bottom: 12px; }
    .msg .bubble { display:grid; grid-template-columns: 28px minmax(0, 1fr); gap:12px; padding:12px 14px; border-radius:12px; max-width:85%; line-height:1.45; font-size:14.5px; box-shadow: 0 1px 2px rgba(16,24,40,0.06); overflow-wrap:anywhere; word-break: break-word; }
    .msg.user .bubble { margin-left:auto; background:#E8F0FE; border:1px solid #C5D2F7; }
    .msg.assistant .bubble { margin-right:auto; background:#F1EBFF; border:1px solid #E0D7FF; }
    .msg.system .bubble { margin:0 auto; background:#F9FAFB; border:1px dashed #E5E7EB; }
    .role-icon { display:grid; place-items:center; width:28px; height:28px; border-radius:50%; background:#fff; border:1px solid #e4e8f7; }
    .content { color:#111827; overflow-wrap:anywhere; word-break: break-word; min-width: 0; }
    .loading { display:flex; align-items:center; gap:10px; padding:10px; }

    .assistant-reply .summary { font-weight:600; margin-bottom:8px; }
    .assistant-reply .sql pre { background: #0f172a; color: #e2e8f0; padding: 10px; border-radius: 8px; white-space: pre-wrap; overflow-wrap:anywhere; word-break: break-all; overflow:auto; max-height: 220px; max-width: 100%; }
    .assistant-reply .table-wrap { overflow:auto; border:1px solid #e4e8f7; border-radius: 10px; margin-top:8px; }
    .assistant-reply .result-table { border-collapse: separate; border-spacing: 0; width:100%; }
    .assistant-reply .result-table th { position: sticky; top: 0; background: #f9fafb; text-transform: uppercase; letter-spacing: 0.3px; font-size: 12px; }
    .assistant-reply .result-table tr:nth-child(even) td { background: #fcfdff; }
    .assistant-reply .result-table th, .assistant-reply .result-table td { border: 1px solid #ddd; padding: 6px; font-size: 13px; }
  `]
})
export class SimpleAiQueryAssistantComponent implements OnInit, OnDestroy {
  connections = signal<AiConnectionInfo[]>([]);
  selectedConnectionId: string = '';
  limit: number = 100;
  loading = signal<boolean>(false);
  lastResponse = signal<AiChatResponse | null>(null);

  viewMode: 'chat' | 'develop' = 'chat';
  messages = signal<ChatMessage[]>([]);

  // Initialize form in constructor to avoid using fb before it's available
  form!: FormGroup;
  connForm!: FormGroup;

  constructor(private fb: FormBuilder, private ai: SimpleAiQueryService) {
    this.form = this.fb.group({
      message: [''
      ]
    });
    this.connForm = this.fb.group({
      id: ['', Validators.required],
      name: ['', Validators.required],
      url: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    this.ai.getConnections().subscribe({
      next: (res) => {
        this.connections.set(res.connections || []);
        this.selectedConnectionId = res.connections?.[0]?.id || '';
        this.pushSystem('Conectado. Seguridad de solo lectura habilitada.');
      },
      error: () => {
        this.pushSystem('No hay conexiones configuradas. Consulte con el equipo de desarrollo.');
      }
    });
    document.addEventListener('click', this.onGlobalClick as any);
  }

  onViewChange(mode: 'chat' | 'develop') { this.viewMode = mode; }

  send(): void {
    const msg = (this.form.value.message || '').trim();
    if (!msg) return;

    // Detección simple de fuera de contexto / sin sentido
    const lower = msg.toLowerCase();
    const letters = (lower.match(/[a-záéíóúüñ]/g) || []).length;
    const vowels = (lower.match(/[aeiouáéíóúü]/g) || []).length;
    const tokens = lower.split(/\s+/).filter(Boolean) as string[];
    const domain: string[] = ['luz','luces','encender','apagar','alarma','sensor','cámara','termostato','calefacción','puerta','ventana','persiana','habitación','cocina','garaje','tarea','recordatorio','familia','usuario','notificación','clima','temperatura','humedad','energia','consumo','horario','evento','calendario','lista'];
    const hasDomain = tokens.some((t: string) => domain.some((k: string) => t.includes(k)));
    const isGibberish = letters < 3 || vowels < 1;
    const outOfContext = (!hasDomain && tokens.length < 2) || isGibberish;

    if (outOfContext) {
      if (this.viewMode === 'chat') {
        this.pushUser(msg);
        this.pushAssistant(`<div class='assistant-reply'><div class='error-banner'>${this.escapeHtml('Esta consulta esta fuera de mi alcance')}</div></div>`);
        this.scrollToBottom();
      }
      return;
    }

    if (this.viewMode === 'chat') {
      this.pushUser(msg);
    }

    this.loading.set(true);
    this.ai.chat({ message: msg, connectionId: this.selectedConnectionId, limit: this.limit }).subscribe({
      next: (resp) => {
        this.lastResponse.set(resp);
        if (this.viewMode === 'chat') {
          const html = this.buildAssistantHtml(resp);
          this.pushAssistant(html);
          this.scrollToBottom();
        }
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        if (this.viewMode === 'chat') {
          const msgErr = err?.error?.error || err?.message || 'No se pudo procesar la consulta.';
          this.pushAssistant(`<span style='color:#c62828'>${this.escapeHtml(msgErr)}</span>`);
        } else {
          this.lastResponse.set({ success: false, query: {}, error: err?.message } as any);
        }
      }
    });
  }

  addConnection(): void {
    if (this.connForm.invalid) return;
    const { id, name, url } = this.connForm.value;
    this.ai.addConnection({ id, name, url, type: 'postgres' }).subscribe({
      next: (res) => {
        this.connections.set(res.connections || []);
        this.selectedConnectionId = id;
        this.connForm.reset();
      },
      error: (err) => {
        console.error('Error agregando conexión', err);
      }
    });
  }

  getColumns(rows: any[]): string[] {
    if (!rows || !rows.length) return [];
    const set = new Set<string>();
    for (const r of rows) {
      Object.keys(r || {}).forEach((k) => set.add(k));
    }
    return Array.from(set);
  }

  private buildAssistantHtml(res: AiChatResponse): string {
    if ((res as any)?.success === false) {
      const err = this.escapeHtml((res as any)?.message || (res as any)?.error || 'No se pudo procesar la consulta.');
      return `<div class='assistant-reply'><div class='error-banner'>${err}</div></div>`;
    }
    const summary = this.escapeHtml(res.summary || this.buildLocalSummary(res));
    const rows = Array.isArray(res.result?.rows) ? res.result!.rows : [];
    const table = rows.length ? this.buildTableHtml(rows) : '';
    const notes = res.notes ? `<div class="notes">${this.escapeHtml(res.notes)}</div>` : '';
    const sqlBlock = '';
    return `<div class='assistant-reply'>
      <div class='summary'>${summary}</div>
      ${table}
      ${notes}
    </div>`;
  }

  private buildTableHtml(rows: any[]): string {
    const keys = Object.keys(rows[0] || {});
    const header = keys.map(k => `<th>${this.escapeHtml(k)}</th>`).join('');
    const body = rows.map(r => `<tr>${keys.map(k => `<td>${this.escapeHtml((r ?? {})[k])}</td>`).join('')}</tr>`).join('');
    return `<div class='table-wrap'><table class='result-table'><thead><tr>${header}</tr></thead><tbody>${body}</tbody></table></div>`;
  }

  private escapeHtml(val: any): string {
    const s = (val === null || val === undefined) ? '' : String(val);
    return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' } as any)[c]);
  }

  private buildLocalSummary(res: AiChatResponse): string {
    const rows = res.result?.rows || [];
    const count = rows.length;
    if (count === 0) return 'No se encontraron resultados para tu consulta.';
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

  private pushUser(text: string) { this.messages.set([...this.messages(), { role: 'user', content: this.escapeHtml(text) }]); }
  private pushAssistant(html: string, meta?: any) { this.messages.set([...this.messages(), { role: 'assistant', content: html, meta }]); }
  private pushSystem(text: string) { this.messages.set([...this.messages(), { role: 'system', content: this.escapeHtml(text) }]); }

  private scrollToBottom() {
    setTimeout(() => {
      const el = document.getElementById('chatHistory');
      if (el) el.scrollTop = el.scrollHeight;
    }, 50);
  }
  
  copySql(sql?: string) {
    const text = (sql || '').trim();
    if (!text) return;
    this.copyTextToClipboard(text);
  }
  
  private onGlobalClick = (ev: MouseEvent) => {
    const target = ev.target as HTMLElement;
    if (target && target.classList.contains('copy-sql')) {
      const sqlContainer = target.closest('.sql');
      const pre = sqlContainer?.querySelector('pre');
      const text = (pre?.textContent || '').trim();
      if (text) this.copyTextToClipboard(text);
    }
  };
  
  private async copyTextToClipboard(text: string) {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.left = '-1000px';
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      this.pushSystem('SQL copiado al portapapeles');
    } catch (e) {
      this.pushSystem('No se pudo copiar el SQL');
    }
  }
  
  ngOnDestroy(): void {
    document.removeEventListener('click', this.onGlobalClick as any);
  }
}