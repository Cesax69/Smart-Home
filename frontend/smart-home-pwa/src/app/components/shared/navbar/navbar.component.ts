import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [
    CommonModule,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule
  ],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.scss'
})
export class NavbarComponent implements OnInit {
  currentUser = signal<any>(null);

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.currentUser.set(this.authService.getCurrentUser());
  }

  navigate(path: string): void {
    this.router.navigate([path]);
  }

  goToDashboard(): void {
    const user = this.authService.getCurrentUser();
    if (user?.role === 'head_of_household') {
      this.router.navigate(['/dashboard/admin']);
    } else {
      this.router.navigate(['/dashboard/member']);
    }
  }
  
  // Alias para mantener compatibilidad con el código existente
  goHome = this.goToDashboard;

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}