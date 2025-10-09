import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AlertCenterComponent } from './components/shared/alert-center/alert-center.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, AlertCenterComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('smart-home-pwa');
}
