import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { AlertService } from '../../../services/alert.service';
import { Alert } from '../../../models/alert.model';

@Component({
  selector: 'app-alert-center',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './alert-center.component.html',
  styleUrl: './alert-center.component.scss'
})
export class AlertCenterComponent {
  constructor(public alerts: AlertService) {}

  trackById(_: number, item: Alert) { return item.id; }

  iconFor(type: Alert['type']): string {
    switch (type) {
      case 'success': return 'check_circle';
      case 'error': return 'error';
      case 'warning': return 'warning';
      default: return 'info';
    }
  }
}