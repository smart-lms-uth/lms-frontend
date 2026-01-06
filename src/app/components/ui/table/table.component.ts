import { Component, Input, Output, EventEmitter, ContentChild, TemplateRef, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface TableColumn {
  key: string;
  header: string;
  sortable?: boolean;
  width?: string;
  align?: 'left' | 'center' | 'right';
}

export interface SortState {
  column: string;
  direction: 'asc' | 'desc';
}

@Component({
  selector: 'app-table',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="table-wrapper" [class.table-wrapper--loading]="loading">
      <table class="table">
        <thead class="table__head">
          <tr>
            <th 
              *ngFor="let col of columns"
              class="table__th"
              [style.width]="col.width"
              [style.text-align]="col.align || 'left'"
              [class.table__th--sortable]="col.sortable"
              (click)="col.sortable && toggleSort(col.key)">
              
              <div class="table__th-content">
                <span>{{ col.header }}</span>
                <div class="table__sort-icons" *ngIf="col.sortable">
                  <svg 
                    class="table__sort-icon" 
                    [class.table__sort-icon--active]="sortState()?.column === col.key && sortState()?.direction === 'asc'"
                    width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="18 15 12 9 6 15"></polyline>
                  </svg>
                  <svg 
                    class="table__sort-icon" 
                    [class.table__sort-icon--active]="sortState()?.column === col.key && sortState()?.direction === 'desc'"
                    width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                </div>
              </div>
            </th>
          </tr>
        </thead>

        <tbody class="table__body">
          <tr 
            *ngFor="let row of data; let i = index"
            class="table__row"
            [class.table__row--clickable]="rowClickable"
            [class.table__row--selected]="selectedRows.includes(i)"
            (click)="onRowClick(row, i)">
            
            <td 
              *ngFor="let col of columns"
              class="table__td"
              [style.text-align]="col.align || 'left'">
              
              <ng-container *ngIf="cellTemplate; else defaultCell">
                <ng-container 
                  *ngTemplateOutlet="cellTemplate; context: { $implicit: row, column: col.key, value: row[col.key] }">
                </ng-container>
              </ng-container>
              
              <ng-template #defaultCell>
                {{ row[col.key] }}
              </ng-template>
            </td>
          </tr>

          <tr *ngIf="data.length === 0 && !loading" class="table__row table__row--empty">
            <td [attr.colspan]="columns.length" class="table__td table__td--empty">
              <div class="table__empty">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M21 9.5V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h7.5"></path>
                  <path d="M3 10h18"></path>
                  <path d="M16 19h6"></path>
                </svg>
                <p>{{ emptyText }}</p>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <div class="table__loading" *ngIf="loading">
        <div class="table__spinner"></div>
      </div>
    </div>
  `,
  styles: [`
    .table-wrapper {
      position: relative;
      overflow-x: auto;
      border: var(--border-width-md) solid var(--gray-200);
      border-radius: var(--border-radius-lg);
      background: var(--white);
    }

    .table-wrapper--loading .table {
      opacity: 0.5;
      pointer-events: none;
    }

    .table {
      width: 100%;
      border-collapse: collapse;
      font-size: var(--font-size-sm);
    }

    .table__head {
      background: var(--gray-50);
      border-bottom: 1px solid var(--gray-200);
    }

    .table__th {
      padding: var(--spacing-3) var(--spacing-4);
      font-weight: var(--font-weight-semibold);
      color: var(--gray-700);
      white-space: nowrap;
    }

    .table__th--sortable {
      cursor: pointer;
      user-select: none;
    }

    .table__th--sortable:hover {
      background: var(--gray-100);
    }

    .table__th-content {
      display: flex;
      align-items: center;
      gap: var(--spacing-2);
    }

    .table__sort-icons {
      display: flex;
      flex-direction: column;
      gap: -2px;
    }

    .table__sort-icon {
      color: var(--gray-300);
      transition: color var(--transition-fast);
    }

    .table__sort-icon--active {
      color: var(--primary-500);
    }

    .table__body .table__row {
      border-bottom: 1px solid var(--gray-100);
    }

    .table__body .table__row:last-child {
      border-bottom: none;
    }

    .table__body .table__row:hover:not(.table__row--empty) {
      background: var(--gray-50);
    }

    .table__row--clickable {
      cursor: pointer;
    }

    .table__row--selected {
      background: color-mix(in srgb, var(--primary-500) 8%, transparent) !important;
    }

    .table__row--empty:hover {
      background: transparent !important;
    }

    .table__td {
      padding: var(--spacing-3) var(--spacing-4);
      color: var(--gray-900);
    }

    .table__td--empty {
      padding: var(--spacing-8);
    }

    .table__empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--spacing-3);
      color: var(--gray-400);
    }

    .table__empty svg {
      color: var(--gray-300);
    }

    .table__empty p {
      margin: 0;
      font-size: var(--font-size-sm);
    }

    .table__loading {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      background: color-mix(in srgb, var(--white) 70%, transparent);
    }

    .table__spinner {
      width: 32px;
      height: 32px;
      border: 2px solid var(--gray-200);
      border-top-color: var(--primary-500);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }
  `]
})
export class TableComponent {
  @Input() columns: TableColumn[] = [];
  @Input() data: any[] = [];
  @Input() loading: boolean = false;
  @Input() emptyText: string = 'No data available';
  @Input() rowClickable: boolean = false;
  @Input() selectedRows: number[] = [];

  @Output() sortChange = new EventEmitter<SortState>();
  @Output() rowClick = new EventEmitter<{ row: any; index: number }>();

  @ContentChild('cellTemplate') cellTemplate?: TemplateRef<any>;

  sortState = signal<SortState | null>(null);

  toggleSort(column: string): void {
    const current = this.sortState();
    let newState: SortState;

    if (current?.column === column) {
      newState = {
        column,
        direction: current.direction === 'asc' ? 'desc' : 'asc'
      };
    } else {
      newState = { column, direction: 'asc' };
    }

    this.sortState.set(newState);
    this.sortChange.emit(newState);
  }

  onRowClick(row: any, index: number): void {
    if (this.rowClickable) {
      this.rowClick.emit({ row, index });
    }
  }
}
