import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { NavbarComponent } from '../navbar/navbar.component';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, NavbarComponent],
  template: `
    <app-navbar></app-navbar>
    <div class="layout-content">
      <router-outlet></router-outlet>
    </div>
  `,
  styles: [`
    .layout-content {
      /* Usar dvh para evitar saltos por UI del navegador y fallback a vh */
      min-height: calc(100dvh - 64px);
      min-height: calc(100vh - 64px);
      background-color: #f5f5f5;
    }
  `]
})
export class AppLayoutComponent {}