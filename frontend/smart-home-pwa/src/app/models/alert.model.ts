export type AlertType = 'info' | 'success' | 'error' | 'warning';

export interface Alert {
  id: string;
  type: AlertType;
  title: string;
  message?: string;
  loading?: boolean;
  dismissible?: boolean;
  duration?: number; // ms; if 0 or undefined and loading=true, do not auto-dismiss
  createdAt: number;
}