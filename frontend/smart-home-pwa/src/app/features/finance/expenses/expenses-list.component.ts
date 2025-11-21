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
import { FinanceService } from '../../../services/finance.service';
import { ExpenseFormComponent } from './expense-form.component';
import { Expense, ExpensesListResponse } from '../../../models/finance.model';
import { EXPENSE_CATEGORIES, HOUSEHOLD_MEMBERS, CatalogMaps } from '../../../catalogs/catalogs';

@Component({
  selector: 'app-expenses-list',
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
    MatDialogModule
  ],
  template: `
    <mat-card>
      <mat-card-header>
        <mat-card-title>Gastos</mat-card-title>
        <mat-card-subtitle>Lista con filtros y paginación</mat-card-subtitle>
      </mat-card-header>
      <mat-card-content>
        <form [formGroup]="filters" class="filters">
          <mat-form-field appearance="outline">
            <mat-label>Desde</mat-label>
            <input matInput [matDatepicker]="pickerFrom" formControlName="from">
            <mat-datepicker-toggle matSuffix [for]="pickerFrom"></mat-datepicker-toggle>
            <mat-datepicker #pickerFrom></mat-datepicker>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Hasta</mat-label>
            <input matInput [matDatepicker]="pickerTo" formControlName="to">
            <mat-datepicker-toggle matSuffix [for]="pickerTo"></mat-datepicker-toggle>
            <mat-datepicker #pickerTo></mat-datepicker>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Categoría</mat-label>
            <mat-select formControlName="categoryId">
              <mat-option [value]="">Todas</mat-option>
              <mat-option *ngFor="let c of expenseCategories" [value]="c.id">{{ c.name }}</mat-option>
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Miembro</mat-label>
            <mat-select formControlName="memberId">
              <mat-option [value]="">Todos</mat-option>
              <mat-option *ngFor="let m of members" [value]="m.id">{{ m.name }}</mat-option>
            </mat-select>
          </mat-form-field>

            <button mat-raised-button color="primary" (click)="applyFilters()">
              <mat-icon>search</mat-icon>
              Filtrar
            </button>
            <button mat-button color="accent" (click)="openExpenseDialog()">
              <mat-icon>add</mat-icon>
              Nuevo gasto
            </button>
          </form>

        <div class="table-container" *ngIf="!loading(); else loadingTpl">
          <table mat-table [dataSource]="items()" class="mat-elevation-z1" matSort (matSortChange)="onSortChange($event)">
            <ng-container matColumnDef="date">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>Fecha</th>
              <td mat-cell *matCellDef="let e">{{ e.date | date:'yyyy-MM-dd' }}</td>
            </ng-container>
            <ng-container matColumnDef="amount">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>Monto</th>
              <td mat-cell *matCellDef="let e">{{ e.amount }} {{ e.currency }}</td>
            </ng-container>
            <ng-container matColumnDef="category">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>Categoría</th>
              <td mat-cell *matCellDef="let e">{{ getCategoryName(e) }}</td>
            </ng-container>
            <ng-container matColumnDef="member">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>Miembro</th>
              <td mat-cell *matCellDef="let e">{{ getMemberName(e) }}</td>
            </ng-container>
            <ng-container matColumnDef="actions">
              <th mat-header-cell *matHeaderCellDef>Acciones</th>
              <td mat-cell *matCellDef="let e">
                <button mat-button color="primary" (click)="openExpenseDialog(e.id)">Editar</button>
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
            <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
          </table>
          <mat-paginator
            [length]="meta().totalItems || 0"
            [pageIndex]="(meta().page || 1) - 1"
            [pageSize]="filters.value.limit || 10"
            [pageSizeOptions]="[5,10,25,50]"
            (page)="onPaginator($event)"></mat-paginator>
        </div>

        <ng-template #loadingTpl>
          <div class="loading">
            <mat-progress-spinner mode="indeterminate"></mat-progress-spinner>
          </div>
        </ng-template>
      </mat-card-content>
      
    </mat-card>
  `,
  styles: [`
    .filters { display: grid; grid-template-columns: repeat(auto-fit,minmax(220px,1fr)); gap: 12px; align-items: end; }
    .table-container { overflow: auto; }
    .loading { display: flex; justify-content: center; padding: 24px; }
    .paginator { display: flex; gap: 12px; align-items: center; }
  `]
})
export class ExpensesListComponent implements OnInit {
  displayedColumns = ['date', 'amount', 'category', 'member', 'actions'];
  filters: FormGroup;
  items = signal<Expense[]>([]);
  loading = signal<boolean>(false);
  meta = signal<{ page: number; totalPages: number; hasNextPage: boolean; hasPrevPage: boolean; totalItems: number }>({ page: 1, totalPages: 1, hasNextPage: false, hasPrevPage: false, totalItems: 0 });
  sortActive: string = 'date';
  sortDirection: 'asc' | 'desc' = 'desc';

  constructor(private fb: FormBuilder, private finance: FinanceService, private dialog: MatDialog) {
    this.filters = this.fb.group({
      from: [undefined],
      to: [undefined],
      categoryId: [''],
      memberId: [''],
      page: [1],
      limit: [10]
    });
  }

  expenseCategories = EXPENSE_CATEGORIES;
  members = HOUSEHOLD_MEMBERS;
  catalog = CatalogMaps;

  ngOnInit(): void {
    this.load();
  }

  applyFilters(): void {
    this.filters.patchValue({ page: 1 });
    this.load();
  }

  onPaginator(e: PageEvent): void {
    this.filters.patchValue({ page: (e.pageIndex + 1), limit: e.pageSize });
    this.load();
  }

  onSortChange(e: Sort): void {
    this.sortActive = e.active || 'date';
    this.sortDirection = (e.direction as any) || 'asc';
    this.load();
  }

  getCategoryName(e: Expense): string {
    const id = e?.categoryId;
    if (!id) return '-';
    return this.catalog.expenseCategoriesMap[id] || id;
  }

  getMemberName(e: Expense): string {
    const id = e?.memberId;
    if (!id) return '-';
    return this.catalog.membersMap[id] || id;
  }

  private load(): void {
    this.loading.set(true);
    const { from, to, categoryId, memberId, page, limit } = this.filters.value;
    const query: any = {
      from: from ? new Date(from).toISOString().slice(0, 10) : undefined,
      to: to ? new Date(to).toISOString().slice(0, 10) : undefined,
      categoryId: categoryId || undefined,
      memberId: memberId || undefined,
      page: page || 1,
      limit: limit || 10,
      sort: `${this.sortActive}:${this.sortDirection}`
    };

    this.finance.listExpenses(query).subscribe({
      next: (res: ExpensesListResponse) => {
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

  openExpenseDialog(id?: string): void {
    const ref = this.dialog.open(ExpenseFormComponent, {
      width: '600px',
      data: id ? { id } : undefined,
      autoFocus: true
    } as any);
    ref.afterClosed().subscribe((changed) => { if (changed) this.load(); });
  }
}