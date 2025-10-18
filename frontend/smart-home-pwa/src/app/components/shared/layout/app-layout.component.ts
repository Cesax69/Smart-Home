import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { NavbarComponent } from '../navbar/navbar.component';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, NavbarComponent, MatButtonModule, MatIconModule, MatTooltipModule],
  template: `
    <app-navbar></app-navbar>
    <div class="layout-content">
      <router-outlet></router-outlet>
    </div>
    <a class="floating-chat" [routerLink]="['/ai-assistant']" mat-fab color="primary" matTooltip="Asistente de Datos">
      <mat-icon>smart_toy</mat-icon>
    </a>
  `,
  styles: [`
    .layout-content {
      /* Usar dvh para evitar saltos por UI del navegador y fallback a vh */
      min-height: calc(100dvh - 64px);
      min-height: calc(100vh - 64px);
      background-color: #f5f5f5;
    }
    .floating-chat {
      position: fixed;
      right: 24px;
      bottom: 24px;
      z-index: 1000;
      box-shadow: 0 8px 24px rgba(0,0,0,0.18);
      border-radius: 50%;
    }
  `]
})
export class AppLayoutComponent {}