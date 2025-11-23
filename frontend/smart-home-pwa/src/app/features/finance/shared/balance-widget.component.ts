import { Component, OnInit, signal, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FinanceService } from '../../../services/finance.service';
import { BalanceData, CurrencyBalance } from '../../../models/finance.model';

@Component({
  selector: 'app-balance-widget',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatButtonModule,
    MatTooltipModule
  ],
  template: `
    <mat-card class="balance-widget">
      @if (loading()) {
        <div class="loading">
          <mat-progress-spinner mode="indeterminate" diameter="40"></mat-progress-spinner>
          <p>Cargando balance...</p>
        </div>
      } @else if (balanceData()) {
        <div class="balance-container">
          <!-- Header con toggle -->
          <div class="widget-header">
            <h3 class="widget-title">
              <mat-icon>account_balance_wallet</mat-icon>
              Resumen Financiero
            </h3>
            <button 
              mat-icon-button 
              (click)="toggleCurrencyView()" 
              matTooltip="Ver desglose por moneda"
              class="toggle-button">
              <mat-icon>{{ showByCurrency() ? 'compress' : 'expand' }}</mat-icon>
            </button>
          </div>

          <!-- Vista Total (siempre visible) -->
          <div class="balance-grid">
            <div class="balance-item incomes">
              <div class="icon-wrapper">
                <mat-icon>trending_up</mat-icon>
              </div>
              <div class="content">
                <div class="label">Total Ingresos</div>
                <div class="amount positive">{{ balanceData()?.totalIncomes ?? 0 | number:'1.2-2' }}</div>
              </div>
            </div>

            <div class="balance-item expenses">
              <div class="icon-wrapper">
                <mat-icon>trending_down</mat-icon>
              </div>
              <div class="content">
                <div class="label">Total Gastos</div>
                <div class="amount negative">{{ balanceData()?.totalExpenses ?? 0 | number:'1.2-2' }}</div>
              </div>
            </div>

            <div class="balance-item balance" [class.negative-balance]="(balanceData()?.balance ?? 0) < 0">
              <div class="icon-wrapper">
                <mat-icon>account_balance_wallet</mat-icon>
              </div>
              <div class="content">
                <div class="label">Balance Disponible</div>
                <div class="amount balance-value" [class.positive]="(balanceData()?.balance ?? 0) >= 0" [class.negative]="(balanceData()?.balance ?? 0) < 0">
                  {{ balanceData()?.balance ?? 0 | number:'1.2-2' }}
                </div>
              </div>
            </div>
          </div>

          <!-- Desglose por moneda (colapsable) -->
          @if (showByCurrency() && (balanceData()?.byCurrency?.length ?? 0) > 0) {
            <div class="currency-breakdown">
              <h4 class="breakdown-title">Desglose por Moneda</h4>
              <div class="currency-grid">
                @for (curr of (balanceData()?.byCurrency ?? []); track curr.currency) {
                  <div class="currency-card">
                    <div class="currency-header">
                      <span class="currency-code">{{ curr.currency }}</span>
                      <span class="currency-balance" [class.positive]="curr.balance >= 0" [class.negative]="curr.balance < 0">
                        {{ curr.balance | number:'1.2-2' }}
                      </span>
                    </div>
                    <div class="currency-details">
                      <div class="detail-row">
                        <span class="detail-label">Ingresos:</span>
                        <span class="detail-value positive">{{ curr.totalIncomes | number:'1.2-2' }}</span>
                      </div>
                      <div class="detail-row">
                        <span class="detail-label">Gastos:</span>
                        <span class="detail-value negative">{{ curr.totalExpenses | number:'1.2-2' }}</span>
                      </div>
                    </div>
                  </div>
                }
              </div>
            </div>
          }
        </div>
      } @else {
        <div class="error">
          <mat-icon>error_outline</mat-icon>
          <p>No se pudo cargar el balance</p>
        </div>
      }
    </mat-card>
  `,
  styles: [`
    .balance-widget {
      margin-bottom: 24px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
      color: white;
      border-radius: 16px !important;
      box-shadow: 0 10px 30px rgba(0,0,0,0.2) !important;
    }

    .loading, .error {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 40px;
      gap: 16px;
      color: white;
    }

    .balance-container {
      padding: 8px;
    }

    .widget-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
      padding: 0 8px;
    }

    .widget-title {
      display: flex;
      align-items: center;
      gap: 12px;
      margin: 0;
      font-size: 1.5rem;
      font-weight: 600;
      color: white;
    }

    .widget-title mat-icon {
      font-size: 32px;
      width: 32px;
      height: 32px;
    }

    .toggle-button {
      color: white !important;
    }

    .balance-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 16px;
      margin-bottom: 16px;
    }

    .balance-item {
      background: rgba(255, 255, 255, 0.15);
      backdrop-filter: blur(10px);
      border-radius: 12px;
      padding: 20px;
      display: flex;
      align-items: center;
      gap: 16px;
      transition: all 0.3s ease;
      border: 1px solid rgba(255, 255, 255, 0.2);
    }

    .balance-item:hover {
      background: rgba(255, 255, 255, 0.25);
      transform: translateY(-2px);
      box-shadow: 0 8px 20px rgba(0,0,0,0.15);
    }

    .icon-wrapper {
      background: rgba(255, 255, 255, 0.2);
      border-radius: 50%;
      width: 56px;
      height: 56px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .icon-wrapper mat-icon {
      font-size: 32px;
      width: 32px;
      height: 32px;
      color: white;
    }

    .content {
      flex: 1;
    }

    .label {
      font-size: 0.875rem;
      opacity: 0.9;
      margin-bottom: 4px;
      font-weight: 500;
    }

    .amount {
      font-size: 1.75rem;
      font-weight: 700;
      font-family: 'Roboto Mono', monospace;
    }

    .amount.positive {
      color: #4ade80;
    }

    .amount.negative {
      color: #fb7185;
    }

    .amount.balance-value {
      font-size: 2rem;
    }

    .balance-item.negative-balance {
      background: rgba(251, 113, 133, 0.2);
      border-color: rgba(251, 113, 133, 0.4);
    }

    /* Currency Breakdown */
    .currency-breakdown {
      margin-top: 24px;
      padding-top: 24px;
      border-top: 1px solid rgba(255, 255, 255, 0.2);
      animation: slideDown 0.3s ease;
    }

    @keyframes slideDown {
      from {
        opacity: 0;
        transform: translateY(-10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .breakdown-title {
      margin: 0 0 16px 0;
      font-size: 1.125rem;
      font-weight: 600;
      color: white;
      opacity: 0.95;
    }

    .currency-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 12px;
    }

    .currency-card {
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 8px;
      padding: 16px;
      transition: all 0.2s ease;
    }

    .currency-card:hover {
      background: rgba(255, 255, 255, 0.15);
      transform: scale(1.02);
    }

    .currency-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
      padding-bottom: 8px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.15);
    }

    .currency-code {
      font-weight: 700;
      font-size: 1.125rem;
      color: white;
    }

    .currency-balance {
      font-weight: 700;
      font-size: 1.25rem;
      font-family: 'Roboto Mono', monospace;
    }

    .currency-details {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .detail-row {
      display: flex;
      justify-content: space-between;
      font-size: 0.875rem;
    }

    .detail-label {
      opacity: 0.8;
    }

    .detail-value {
      font-weight: 600;
      font-family: 'Roboto Mono', monospace;
    }

    /* Responsive */
    @media (max-width: 768px) {
      .balance-grid {
        grid-template-columns: 1fr;
      }

      .currency-grid {
        grid-template-columns: 1fr;
      }

      .widget-title {
        font-size: 1.25rem;
      }

      .amount {
        font-size: 1.5rem;
      }
    }
  `]
})
export class BalanceWidgetComponent implements OnInit {
  @Input() autoRefresh = false;

  loading = signal<boolean>(false);
  balanceData = signal<BalanceData | null>(null);
  showByCurrency = signal<boolean>(false);

  constructor(private financeService: FinanceService) { }

  ngOnInit(): void {
    this.loadBalance();
  }

  loadBalance(): void {
    this.loading.set(true);
    this.financeService.getBalance().subscribe({
      next: (response) => {
        this.balanceData.set(response.data);
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error loading balance:', error);
        this.loading.set(false);
      }
    });
  }

  toggleCurrencyView(): void {
    this.showByCurrency.set(!this.showByCurrency());
  }

  // Public method for parent components to trigger refresh
  refresh(): void {
    this.loadBalance();
  }
}
