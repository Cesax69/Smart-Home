import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatTabsModule } from '@angular/material/tabs';
import { MatIconModule } from '@angular/material/icon';
import { ExpensesListComponent } from './expenses/expenses-list.component';
import { IncomesListComponent } from './incomes/incomes-list.component';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-finance-home',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatTabsModule, MatIconModule, ExpensesListComponent, IncomesListComponent],
  template: `
    <div class="finance-home-container">
      <mat-card class="tabs-card">
        <mat-tab-group animationDuration="300ms" [selectedIndex]="selectedTabIndex" class="modern-tabs">
          <mat-tab>
            <ng-template mat-tab-label>
              <mat-icon class="tab-icon">receipt_long</mat-icon>
              <span>Gastos</span>
            </ng-template>
            <app-expenses-list></app-expenses-list>
          </mat-tab>
          <mat-tab>
            <ng-template mat-tab-label>
              <mat-icon class="tab-icon">payments</mat-icon>
              <span>Ingresos</span>
            </ng-template>
            <app-incomes-list></app-incomes-list>
          </mat-tab>
        </mat-tab-group>
      </mat-card>
    </div>
  `,
  styles: [`
    .finance-home-container {
      height: 100%;
      background: #f3f4f6;
    }

    .tabs-card {
      border-radius: 0 !important;
      box-shadow: none !important;
      padding: 0 !important;
      background: transparent !important;
    }

    .modern-tabs {
      background: white;
      border-radius: 12px 12px 0 0;
    }

    .modern-tabs ::ng-deep .mat-mdc-tab-labels {
      background: #f9fafb;
      border-radius: 12px 12px 0 0;
      padding: 8px 16px 0;
    }

    .modern-tabs ::ng-deep .mat-mdc-tab {
      min-width: 160px;
      font-weight: 500;
    }

    .modern-tabs ::ng-deep .mat-mdc-tab.mdc-tab--active {
      background: white;
      border-radius: 8px 8px 0 0;
    }

    .tab-icon {
      margin-right: 8px;
      font-size: 20px;
      width: 20px;
      height: 20px;
    }

    :host {
      display: block;
      height: 100%;
    }
  `]
})
export class FinanceHomeComponent implements OnInit {
  selectedTabIndex = 0;

  constructor(private route: ActivatedRoute) { }

  ngOnInit(): void {
    this.route.queryParamMap.subscribe(params => {
      const tab = params.get('tab');
      this.selectedTabIndex = tab === 'incomes' ? 1 : 0;
    });
  }
}