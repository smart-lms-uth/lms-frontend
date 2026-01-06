import { Component, Input, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

export type TabOrientation = 'horizontal' | 'vertical';

export interface TabItem {
  id: string;
  label: string;
  icon?: string;
  disabled?: boolean;
  badge?: string | number;
}

@Component({
  selector: 'app-tabs',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="tabs" [ngClass]="['tabs--' + orientation]">
      <div class="tabs__list" role="tablist">
        <button
          *ngFor="let tab of tabs; let i = index"
          class="tabs__tab"
          [class.tabs__tab--active]="activeTab() === tab.id"
          [class.tabs__tab--disabled]="tab.disabled"
          [attr.role]="'tab'"
          [attr.aria-selected]="activeTab() === tab.id"
          [attr.tabindex]="tab.disabled ? -1 : 0"
          (click)="!tab.disabled && selectTab(tab.id)">
          
          <ng-container *ngIf="tab.icon">
            <span class="tabs__tab-icon" [innerHTML]="tab.icon"></span>
          </ng-container>
          
          <span class="tabs__tab-label">{{ tab.label }}</span>
          
          <span *ngIf="tab.badge" class="tabs__tab-badge">{{ tab.badge }}</span>
        </button>
      </div>

      <div class="tabs__content">
        <ng-content></ng-content>
      </div>
    </div>
  `,
  styles: [`
    .tabs {
      display: flex;
      flex-direction: column;
    }

    .tabs--vertical {
      flex-direction: row;
    }

    .tabs--vertical .tabs__list {
      flex-direction: column;
      border-bottom: none;
      border-right: 1px solid var(--gray-200);
      padding-right: var(--spacing-1);
    }

    .tabs--vertical .tabs__tab {
      justify-content: flex-start;
      border-bottom: none;
      border-left: 2px solid transparent;
      border-radius: 0 var(--border-radius-md) var(--border-radius-md) 0;
    }

    .tabs--vertical .tabs__tab--active {
      border-bottom-color: transparent;
      border-left-color: var(--primary-500);
      background: color-mix(in srgb, var(--primary-500) 8%, transparent);
    }

    .tabs--vertical .tabs__content {
      flex: 1;
      padding-left: var(--spacing-4);
    }

    .tabs__list {
      display: flex;
      gap: var(--spacing-1);
      border-bottom: 1px solid var(--gray-200);
      margin-bottom: var(--spacing-4);
    }

    .tabs__tab {
      display: flex;
      align-items: center;
      gap: var(--spacing-2);
      padding: var(--spacing-2) var(--spacing-4);
      background: transparent;
      border: none;
      border-bottom: 2px solid transparent;
      font-family: inherit;
      font-size: var(--font-size-sm);
      font-weight: var(--font-weight-medium);
      color: var(--gray-500);
      cursor: pointer;
      transition: all var(--transition-fast);
      white-space: nowrap;
    }

    .tabs__tab:hover:not(.tabs__tab--disabled) {
      color: var(--gray-700);
      background: var(--gray-50);
    }

    .tabs__tab--active {
      color: var(--primary-600);
      border-bottom-color: var(--primary-500);
    }

    .tabs__tab--active:hover {
      color: var(--primary-600) !important;
    }

    .tabs__tab--disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .tabs__tab-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 18px;
      height: 18px;
    }

    .tabs__tab-icon :deep(svg) {
      width: 100%;
      height: 100%;
    }

    .tabs__tab-label {
      flex: 1;
    }

    .tabs__tab-badge {
      display: flex;
      align-items: center;
      justify-content: center;
      min-width: 18px;
      height: 18px;
      padding: 0 var(--spacing-1);
      background: var(--primary-500);
      border-radius: var(--border-radius-full);
      font-size: 10px;
      font-weight: var(--font-weight-semibold);
      color: var(--white);
    }

    .tabs__content {
      flex: 1;
    }
  `]
})
export class TabsComponent {
  @Input() tabs: TabItem[] = [];
  @Input() defaultTab: string = '';
  @Input() orientation: TabOrientation = 'horizontal';

  activeTab = signal<string>('');

  ngOnInit(): void {
    if (this.defaultTab) {
      this.activeTab.set(this.defaultTab);
    } else if (this.tabs.length > 0) {
      const firstEnabled = this.tabs.find(t => !t.disabled);
      if (firstEnabled) {
        this.activeTab.set(firstEnabled.id);
      }
    }
  }

  selectTab(tabId: string): void {
    this.activeTab.set(tabId);
  }
}

@Component({
  selector: 'app-tab-panel',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div 
      class="tab-panel" 
      [class.tab-panel--active]="isActive()"
      role="tabpanel">
      <ng-content></ng-content>
    </div>
  `,
  styles: [`
    .tab-panel {
      display: none;

      &--active {
        display: block;
        animation: fadeIn 0.2s ease-out;
      }

      @keyframes fadeIn {
        from {
          opacity: 0;
        }
        to {
          opacity: 1;
        }
      }
    }
  `]
})
export class TabPanelComponent {
  @Input() id: string = '';
  @Input() activeTab: string = '';

  isActive = computed(() => this.id === this.activeTab);
}
