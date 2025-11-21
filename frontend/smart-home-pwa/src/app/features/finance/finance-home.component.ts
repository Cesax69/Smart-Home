import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatTabsModule } from '@angular/material/tabs';
import { ExpensesListComponent } from './expenses/expenses-list.component';
import { IncomesListComponent } from './incomes/incomes-list.component';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-finance-home',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatTabsModule, ExpensesListComponent, IncomesListComponent],
  template: `
    <mat-card class="finance-tabs">
      <mat-tab-group animationDuration="300ms" [selectedIndex]="selectedTabIndex">
        <mat-tab label="Gastos">
          <app-expenses-list></app-expenses-list>
        </mat-tab>
        <mat-tab label="Ingresos">
          <app-incomes-list></app-incomes-list>
        </mat-tab>
      </mat-tab-group>
    </mat-card>
  `,
  styles: [`
    .finance-tabs { padding: 0; }
    :host { display: block; }
  `]
})
export class FinanceHomeComponent implements OnInit {
  selectedTabIndex = 0;

  constructor(private route: ActivatedRoute) {}

  ngOnInit(): void {
    this.route.queryParamMap.subscribe(params => {
      const tab = params.get('tab');
      this.selectedTabIndex = tab === 'incomes' ? 1 : 0;
    });
  }
}