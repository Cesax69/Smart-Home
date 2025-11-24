import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSortModule, Sort } from '@angular/material/sort';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FinanceService } from '../../../services/finance.service';
import { Income, IncomesListResponse, CurrencyBalance, CurrencyCode } from '../../../models/finance.model';
import { INCOME_SOURCES, CatalogMaps } from '../../../catalogs/catalogs';
import { AuthService } from '../../../services/auth.service';
import { User } from '../../../models/user.model';
import { IncomeFormComponent } from './income-form.component';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog.component';

@Component({
  selector: 'app-incomes-list',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatProgressSpinnerModule,
    MatDialogModule,
    MatTooltipModule
  ],
  template: `
    <div class="incomes-container">
      <!-- Balance Summary Card -->
      <mat-card class="balance-summary-card">
        <div class="balance-header" (click)="toggleBalance()" style="cursor: pointer">
          <div style="display: flex; align-items: center; gap: 12px;">
            <mat-icon>account_balance_wallet</mat-icon>
            <h3>Resumen Financiero (MXN)</h3>
          </div>
          <mat-icon>{{ showBalance() ? 'expand_less' : 'expand_more' }}</mat-icon>
        </div>
        
        <div class="balance-content" [class.expanded]="showBalance()">
          <ng-container *ngIf="mxnBalance(); else noBalance">
            <div class="balance-grid">
              <div class="balance-item income">
                <div class="balance-label">Total Ingresos</div>
                <div class="balance-value positive">{{ mxnBalance()!.totalIncomes | number:'1.2-2' }}</div>
              </div>
              <div class="balance-item expense">
                <div class="balance-label">Total Gastos</div>
                <div class="balance-value negative">{{ mxnBalance()!.totalExpenses | number:'1.2-2' }}</div>
              </div>
              <div class="balance-item">
                <div class="balance-label">Balance</div>
                <div class="balance-value" [class.positive]="mxnBalance()!.balance >= 0" [class.negative]="mxnBalance()!.balance < 0">
                  {{ mxnBalance()!.balance | number:'1.2-2' }}
                </div>
              </div>
            </div>
          </ng-container>

          <ng-template #noBalance>
            <div class="balance-grid">
              <div class="balance-item income">
                <div class="balance-label">Total Ingresos</div>
                <div class="balance-value positive">0.00</div>
              </div>
              <div class="balance-item expense">
                <div class="balance-label">Total Gastos</div>
                <div class="balance-value negative">0.00</div>
              </div>
              <div class="balance-item">
                <div class="balance-label">Balance</div>
                <div class="balance-value">0.00</div>
              </div>
            </div>
          </ng-template>
        </div>
      </mat-card>
      <!-- Header Card -->
      <mat-card class="header-card">
        <div class="header-content">
          <div class="title-section">
            <mat-icon class="feature-icon">payments</mat-icon>
            <div>
              <h1 class="page-title">Ingresos</h1>
              <p class="page-subtitle">Administra y filtra tus ingresos</p>
            </div>
          </div>
          <button mat-raised-button color="accent" class="add-button" (click)="openIncomeDialog()">
            <mat-icon>add_circle</mat-icon>
            <span>Nuevo Ingreso</span>
          </button>
        </div>
      </mat-card>

      <!-- Filters Card -->
      <mat-card class="filters-card">
        <h3 class="section-title">
          <mat-icon>filter_list</mat-icon>
          Filtros
        </h3>
        <form [formGroup]="filters" class="filters">
          <mat-form-field appearance="outline" class="filter-field">
            <mat-label>Desde</mat-label>
            <input matInput [matDatepicker]="pickerFrom" formControlName="from">
            <mat-datepicker-toggle matSuffix [for]="pickerFrom"></mat-datepicker-toggle>
            <mat-datepicker #pickerFrom></mat-datepicker>
            <mat-icon matPrefix>event</mat-icon>
          </mat-form-field>

          <mat-form-field appearance="outline" class="filter-field">
            <mat-label>Hasta</mat-label>
            <input matInput [matDatepicker]="pickerTo" formControlName="to">
            <mat-datepicker-toggle matSuffix [for]="pickerTo"></mat-datepicker-toggle>
            <mat-datepicker #pickerTo></mat-datepicker>
            <mat-icon matPrefix>event</mat-icon>
          </mat-form-field>

          <mat-form-field appearance="outline" class="filter-field">
            <mat-label>Fuente</mat-label>
            <mat-select formControlName="sourceId">
              <mat-option [value]="">Todas</mat-option>
              <mat-option *ngFor="let s of incomeSources" [value]="s.id">{{ s.name }}</mat-option>
            </mat-select>
            <mat-icon matPrefix>account_balance_wallet</mat-icon>
          </mat-form-field>

          <mat-form-field appearance="outline" class="filter-field">
            <mat-label>Miembro</mat-label>
            <mat-select formControlName="memberId">
              <mat-option [value]="">Todos</mat-option>
              <mat-option *ngFor="let u of users" [value]="u.id">{{ (u.firstName + ' ' + u.lastName).trim() || u.username }}</mat-option>
            </mat-select>
            <mat-icon matPrefix>person</mat-icon>
          </mat-form-field>

          <mat-form-field appearance="outline" class="filter-field">
            <mat-label>Moneda</mat-label>
            <mat-select formControlName="currency">
              <mat-option [value]="">Todas</mat-option>
              <mat-option *ngFor="let c of currencies" [value]="c">{{ c }}</mat-option>
            </mat-select>
            <mat-icon matPrefix>attach_money</mat-icon>
          </mat-form-field>

          <button mat-raised-button color="primary" class="filter-button" (click)="applyFilters()">
            <mat-icon>search</mat-icon>
            Filtrar
          </button>
        </form>
      </mat-card>

      <!-- Table Card -->
      <mat-card class="table-card" *ngIf="!loading(); else loadingTpl">
        <div class="table-header">
          <h3 class="section-title">
            <mat-icon>list</mat-icon>
            Listado de Ingresos
          </h3>
          <div class="total-badge">Total: {{ meta().totalItems || 0 }} registros</div>
        </div>

        <div class="table-container">
          <table mat-table [dataSource]="items()" class="modern-table" matSort (matSortChange)="onSortChange($event)">
            <ng-container matColumnDef="date">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>
                <mat-icon class="header-icon">event</mat-icon>
                Fecha
              </th>
              <td mat-cell *matCellDef="let i">
                <span class="date-cell">{{ i.date | date:'dd/MM/yyyy' }}</span>
              </td>
            </ng-container>

            <ng-container matColumnDef="amount">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>
                <mat-icon class="header-icon">attach_money</mat-icon>
                Monto
              </th>
              <td mat-cell *matCellDef="let i">
                <span class="amount-cell positive">{{ i.amount | number:'1.2-2' }} <span class="currency">{{ i.currency }}</span></span>
              </td>
            </ng-container>

            <ng-container matColumnDef="source">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>
                <mat-icon class="header-icon">account_balance_wallet</mat-icon>
                Fuente
              </th>
              <td mat-cell *matCellDef="let i">
                <span class="source-badge">{{ getSourceName(i) }}</span>
              </td>
            </ng-container>

            <ng-container matColumnDef="member">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>
                <mat-icon class="header-icon">person</mat-icon>
                Miembro
              </th>
              <td mat-cell *matCellDef="let i">
                <span class="member-chip">{{ getMemberName(i) }}</span>
              </td>
            </ng-container>

            <ng-container matColumnDef="actions">
              <th mat-header-cell *matHeaderCellDef>Acciones</th>
              <td mat-cell *matCellDef="let i">
                <button mat-icon-button color="primary" class="action-button" (click)="openIncomeDialog(i.id)" matTooltip="Editar ingreso">
                  <mat-icon>edit</mat-icon>
                </button>
                <button mat-icon-button color="warn" class="action-button delete-button" (click)="deleteIncome(i.id)" matTooltip="Eliminar ingreso">
                  <mat-icon>delete</mat-icon>
                </button>
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
            <tr mat-row *matRowDef="let row; columns: displayedColumns;" class="table-row"></tr>
          </table>
        </div>

        <mat-paginator
          class="modern-paginator"
          [length]="meta().totalItems || 0"
          [pageIndex]="(meta().page || 1) - 1"
          [pageSize]="filters.value.limit || 10"
          [pageSizeOptions]="[5,10,25,50]"
          (page)="onPaginator($event)">
        </mat-paginator>
      </mat-card>

      <!-- Loading State -->
      <ng-template #loadingTpl>
        <mat-card class="loading-card">
          <div class="loading">
            <mat-progress-spinner mode="indeterminate" diameter="50" color="accent"></mat-progress-spinner>
            <p class="loading-text">Cargando ingresos...</p>
          </div>
        </mat-card>
      </ng-template>
    </div>
  `,
  styles: [`
    .incomes-container {
      max-width: 1400px;
      margin: 0 auto;
      padding: 24px;
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    /* Balance Summary Card */
    .balance-summary-card {
      border-radius: 16px !important;
      background: linear-gradient(135deg, #10b981 0%, #059669 100%) !important;
      color: white !important;
      box-shadow: 0 8px 24px rgba(16, 185, 129, 0.2) !important;
      overflow: hidden;
    }

    .balance-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 20px 24px;
    }

    .balance-header h3 {
      margin: 0;
      font-size: 20px;
      font-weight: 600;
    }

    .balance-content {
      max-height: 0;
      overflow: hidden;
      transition: max-height 0.3s ease;
      padding: 0 24px;
    }

    .balance-content.expanded {
      max-height: 500px;
      padding: 0 24px 24px 24px;
    }

    .balance-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
    }

    .balance-item {
      background: rgba(255, 255, 255, 0.15);
      padding: 16px;
      border-radius: 12px;
      backdrop-filter: blur(10px);
    }

    .balance-label {
      font-size: 13px;
      opacity: 0.9;
      margin-bottom: 8px;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .balance-value {
      font-size: 28px;
      font-weight: 700;
      letter-spacing: -0.5px;
    }

    .balance-value.positive {
      color: #d1fae5;
    }

    .balance-value.negative {
      color: #fecaca;
    }


    /* Header Card - Green gradient for income theme */
    .header-card {
      background: linear-gradient(135deg, #10b981 0%, #059669 100%) !important;
      color: white !important;
      border-radius: 16px !important;
      box-shadow: 0 8px 24px rgba(16, 185, 129, 0.3) !important;
    }

    .header-content {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 12px;
    }

    .title-section {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .feature-icon {
      font-size: 48px !important;
      width: 48px !important;
      height: 48px !important;
      opacity: 0.9;
    }

    .page-title {
      margin: 0;
      font-size: 28px;
      font-weight: 600;
      letter-spacing: -0.5px;
    }

    .page-subtitle {
      margin: 4px 0 0 0;
      opacity: 0.9;
      font-size: 14px;
    }

    .add-button {
      border-radius: 28px !important;
      padding: 0 24px !important;
      height: 48px !important;
      font-weight: 500 !important;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15) !important;
      transition: all 0.3s ease !important;
    }

    .add-button:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 16px rgba(0,0,0,0.2) !important;
    }

    .add-button mat-icon {
      margin-right: 8px;
    }

    /* Filters Card */
    .filters-card {
      border-radius: 12px !important;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08) !important;
    }

    .section-title {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 0 0 16px 0;
      font-size: 18px;
      font-weight: 500;
      color: #1f2937;
    }

    .section-title mat-icon {
      color: #10b981;
    }

    .filters {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
      align-items: center;
    }

    .filter-field {
      margin: 0 !important;
    }

    .filter-button {
      height: 48px;
      border-radius: 8px !important;
      font-weight: 500 !important;
    }

    /* Table Card */
    .table-card {
      border-radius: 12px !important;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08) !important;
      overflow: hidden;
    }

    .table-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 16px;
      border-bottom: 1px solid #e5e7eb;
      margin-bottom: 16px;
    }

    .total-badge {
      background: #10b981;
      color: white;
      padding: 6px 16px;
      border-radius: 16px;
      font-size: 14px;
      font-weight: 500;
    }

    .table-container {
      overflow-x: auto;
      border-radius: 8px;
      border: 1px solid #e5e7eb;
    }

    /* Modern Table Styles */
    .modern-table {
      width: 100%;
      background: white;
    }

    .modern-table th {
      background: #f9fafb !important;
      color: #374151 !important;
      font-weight: 600 !important;
      font-size: 13px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border-bottom: 2px solid #e5e7eb !important;
      padding: 16px 12px !important;
    }

    .modern-table td {
      border-bottom: 1px solid #f3f4f6 !important;
      padding: 16px 12px !important;
    }

    .header-icon {
      font-size: 18px !important;
      width: 18px !important;
      height: 18px !important;
      margin-right: 6px;
      vertical-align: middle;
      color: #10b981;
    }

    .table-row {
      transition: background-color 0.2s ease;
      cursor: pointer;
    }

    .table-row:hover {
      background-color: #f9fafb !important;
    }

    .date-cell {
      font-weight: 500;
      color: #374151;
      font-size: 14px;
    }

    .amount-cell {
      font-weight: 600;
      font-size: 16px;
    }

    .amount-cell.positive {
      color: #059669;
    }

    .currency {
      font-size: 12px;
      opacity: 0.7;
      margin-left: 4px;
    }

    .source-badge {
      display: inline-block;
      padding: 4px 12px;
      background: #d1fae5;
      color: #065f46;
      border-radius: 12px;
      font-size: 13px;
      font-weight: 500;
    }

    .member-chip {
      display: inline-flex;
      align-items: center;
      padding: 4px 12px;
      background: #dbeafe;
      color: #1e40af;
      border-radius: 12px;
      font-size: 13px;
      font-weight: 500;
    }

    .action-button {
      transition: all 0.2s ease;
    }

    .action-button:hover {
      background-color: #d1fae5 !important;
      transform: scale(1.1);
    }

    .modern-paginator {
      border-top: 1px solid #e5e7eb;
      margin-top: 16px;
    }

    /* Loading State */
    .loading-card {
      border-radius: 12px !important;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08) !important;
    }

    .loading {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 48px 24px;
      gap: 16px;
    }

    .loading-text {
      margin: 0;
      color: #6b7280;
      font-size: 16px;
    }

    /* Responsive Design */
    @media (max-width: 768px) {
      .incomes-container {
        padding: 16px;
      }

      .header-content {
        flex-direction: column;
        gap: 16px;
      }

      .title-section {
        width: 100%;
        justify-content: center;
        text-align: center;
      }

      .add-button {
        width: 100%;
      }

      .filters {
        grid-template-columns: 1fr;
      }

      .modern-table {
        font-size: 13px;
      }

      .modern-table th,
      .modern-table td {
        padding: 12px 8px !important;
      }
    }
  `]
})
export class IncomesListComponent implements OnInit {
  displayedColumns = ['date', 'amount', 'source', 'member', 'actions'];
  filters: FormGroup;
  items = signal<Income[]>([]);
  loading = signal<boolean>(false);
  meta = signal<{ page: number; totalPages: number; hasNextPage: boolean; hasPrevPage: boolean; totalItems: number }>({ page: 1, totalPages: 1, hasNextPage: false, hasPrevPage: false, totalItems: 0 });
  mxnBalance = signal<CurrencyBalance | null>(null);
  showBalance = signal<boolean>(false);
  sortActive: string = 'date';
  sortDirection: 'asc' | 'desc' = 'desc';

  constructor(private fb: FormBuilder, private finance: FinanceService, private dialog: MatDialog, private auth: AuthService) {
    this.filters = this.fb.group({
      from: [undefined],
      to: [undefined],
      sourceId: [''],
      memberId: [''],
      currency: ['USD'],
      page: [1],
      limit: [10]
    });
  }

  incomeSources = INCOME_SOURCES;
  currencies: CurrencyCode[] = ['USD', 'EUR', 'PEN', 'MXN', 'COP', 'CLP'];
  users: User[] = [];
  private usersById: Record<number, string> = {};
  catalog = CatalogMaps;


  ngOnInit(): void {
    // Cargar usuarios registrados para filtros y etiquetas
    this.auth.getFamilyMembers().subscribe({
      next: (users) => {
        this.users = users || [];
        const map: Record<number, string> = {};
        (this.users || []).forEach(u => {
          const name = [u.firstName, u.lastName].filter(Boolean).join(' ').trim() || u.username || `Usuario ${u.id}`;
          map[Number(u.id)] = name;
        });
        this.usersById = map;
      },
      error: () => {
        this.users = [];
        this.usersById = {};
      }
    });
    this.load();
    this.loadBalance();
  }
  applyFilters(): void { this.filters.patchValue({ page: 1 }); this.load(); }
  onPaginator(e: PageEvent): void { this.filters.patchValue({ page: (e.pageIndex + 1), limit: e.pageSize }); this.load(); }
  onSortChange(e: Sort): void { this.sortActive = e.active || 'date'; this.sortDirection = (e.direction as any) || 'asc'; this.load(); }

  getSourceName(i: Income): string {
    const id = i?.sourceId || (i as any)?.source;
    if (!id) return '-';
    return this.catalog.incomeSourcesMap[id] || id;
  }

  getMemberName(i: Income): string {
    const id = i?.memberId;
    if (id === undefined || id === null || id === '') return '-';
    const num = Number(id);
    if (!isNaN(num)) {
      return this.usersById[num] || `Usuario ${num}`;
    }
    return String(id);
  }

  private load(): void {
    this.loading.set(true);
    const { from, to, sourceId, memberId, currency, page, limit } = this.filters.value;
    const query: any = {
      from: from ? new Date(from).toISOString().slice(0, 10) : undefined,
      to: to ? new Date(to).toISOString().slice(0, 10) : undefined,
      sourceId: sourceId || undefined,
      memberId: memberId || undefined,
      currency: currency || undefined,
      page: page || 1,
      limit: limit || 10,
      sort: `${this.sortActive}:${this.sortDirection}`
    };

    this.finance.listIncomes(query).subscribe({
      next: (res: IncomesListResponse) => {
        this.items.set(res.data.items);
        this.meta.set({
          page: res.meta.page,
          totalPages: res.meta.totalPages,
          hasNextPage: res.meta.hasNextPage,
          hasPrevPage: res.meta.hasPrevPage,
          totalItems: res.meta.totalItems
        });
        this.loading.set(false);
      },
      error: () => {
        this.items.set([]);
        this.meta.set({ page: 1, totalPages: 1, hasNextPage: false, hasPrevPage: false, totalItems: 0 });
        this.loading.set(false);
      }
    });
  }

  openIncomeDialog(id?: string): void {
    const ref = this.dialog.open(IncomeFormComponent, {
      width: '600px',
      data: id ? { id } : undefined,
      autoFocus: true
    } as any);
    ref.afterClosed().subscribe((changed) => { if (changed) { this.load(); this.loadBalance(); } });
  }

  toggleBalance(): void {
    this.showBalance.update(v => !v);
  }

  private loadBalance(): void {
    this.finance.getBalance().subscribe({
      next: (response) => {
        // Backend already returns totals in MXN after conversion
        // Create a CurrencyBalance object from the main totals
        this.mxnBalance.set({
          currency: 'MXN',
          totalIncomes: response.data.totalIncomes,
          totalExpenses: response.data.totalExpenses,
          balance: response.data.balance
        });
      },
      error: (error) => {
        console.error('Error loading balance:', error);
      }
    });
  }

  deleteIncome(id: string): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '450px',
      data: {
        title: 'Eliminar Ingreso',
        message: '�Est�s seguro de que deseas eliminar este ingreso? Esta acci�n no se puede deshacer.',
        confirmText: 'Eliminar',
        cancelText: 'Cancelar',
        type: 'danger'
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (!result) return;

      this.loading.set(true);
      this.finance.deleteIncome(id).subscribe({
        next: () => {
          this.loading.set(false);
          this.load();
          this.loadBalance();
        },
        error: (err) => {
          this.loading.set(false);
          alert('Error al eliminar el ingreso: ' + (err.message || 'Error desconocido'));
        }
      });
    });
  }
}

