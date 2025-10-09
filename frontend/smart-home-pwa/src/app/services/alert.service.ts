import { Injectable, signal } from '@angular/core';
import { Alert, AlertType } from '../models/alert.model';

@Injectable({ providedIn: 'root' })
export class AlertService {
  private readonly alertsSignal = signal<Alert[]>([]);

  alerts() {
    return this.alertsSignal();
  }

  // Exponer como signal para plantillas
  readonly alertsList = this.alertsSignal;

  private genId(): string {
    return Math.random().toString(36).slice(2) + Date.now().toString(36);
  }

  private addAlertInternal(alert: Omit<Alert, 'id' | 'createdAt'>): string {
    const id = this.genId();
    const createdAt = Date.now();
    const fullAlert: Alert = { id, createdAt, ...alert };
    const list = this.alertsSignal();
    this.alertsSignal.set([fullAlert, ...list]);

    const duration = fullAlert.duration ?? (fullAlert.loading ? 0 : 4000);
    if (duration && duration > 0) {
      setTimeout(() => this.dismiss(id), duration);
    }
    return id;
  }

  show(type: AlertType, title: string, message?: string, opts?: {
    loading?: boolean;
    dismissible?: boolean;
    duration?: number;
  }): string {
    return this.addAlertInternal({ type, title, message, ...opts });
  }

  info(title: string, message?: string, opts?: { loading?: boolean; dismissible?: boolean; duration?: number }): string {
    return this.show('info', title, message, opts);
  }

  success(title: string, message?: string, opts?: { dismissible?: boolean; duration?: number }): string {
    return this.show('success', title, message, opts);
  }

  warning(title: string, message?: string, opts?: { dismissible?: boolean; duration?: number }): string {
    return this.show('warning', title, message, opts);
  }

  error(title: string, message?: string, opts?: { dismissible?: boolean; duration?: number }): string {
    return this.show('error', title, message, opts);
  }

  update(id: string, patch: Partial<Alert>): void {
    const list = this.alertsSignal();
    const idx = list.findIndex(a => a.id === id);
    if (idx === -1) return;
    const updated = { ...list[idx], ...patch } as Alert;
    const newList = [...list];
    newList[idx] = updated;
    this.alertsSignal.set(newList);

    const duration = updated.duration ?? (updated.loading ? 0 : 4000);
    if (duration && duration > 0) {
      setTimeout(() => this.dismiss(id), duration);
    }
  }

  dismiss(id: string): void {
    const list = this.alertsSignal();
    this.alertsSignal.set(list.filter(a => a.id !== id));
  }

  clear(): void {
    this.alertsSignal.set([]);
  }
}