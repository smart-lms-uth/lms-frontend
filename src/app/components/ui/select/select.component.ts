import { 
  Component, 
  Input, 
  Output, 
  EventEmitter, 
  forwardRef, 
  signal,
  computed
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, FormsModule } from '@angular/forms';

export interface SelectOption {
  value: any;
  label: string;
  icon?: string;
  disabled?: boolean;
}

@Component({
  selector: 'app-select',
  standalone: true,
  imports: [CommonModule, FormsModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => SelectComponent),
      multi: true
    }
  ],
  template: `
    <div class="select-field" [class.select-field--error]="error" [class.select-field--disabled]="disabled">
      <label *ngIf="label" class="select-field__label">
        {{ label }}
        <span *ngIf="required" class="select-field__required">*</span>
      </label>
      
      <div class="select-wrapper" 
           [class.select-wrapper--open]="isOpen()"
           (click)="toggleDropdown()">
        <div class="select-trigger">
          <span class="select-trigger__text" [class.select-trigger__text--placeholder]="!selectedOption()">
            {{ selectedOption()?.label || placeholder }}
          </span>
          <svg class="select-trigger__arrow" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </div>

        <div class="select-dropdown" *ngIf="isOpen()">
          <div class="select-search" *ngIf="searchable">
            <input 
              type="text" 
              class="select-search__input"
              [placeholder]="searchPlaceholder"
              [(ngModel)]="searchQuery"
              (click)="$event.stopPropagation()"
              (input)="onSearch()">
            <svg class="select-search__icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
          </div>

          <div class="select-options">
            <div 
              *ngFor="let option of filteredOptions()"
              class="select-option"
              [class.select-option--selected]="isSelected(option)"
              [class.select-option--disabled]="option.disabled"
              (click)="selectOption(option, $event)">
              <span class="select-option__label">{{ option.label }}</span>
              <svg *ngIf="isSelected(option)" class="select-option__check" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </div>

            <div class="select-empty" *ngIf="filteredOptions().length === 0">
              No options found
            </div>
          </div>
        </div>
      </div>

      <span *ngIf="hint && !error" class="select-field__hint">{{ hint }}</span>
      <span *ngIf="error" class="select-field__error">{{ error }}</span>
    </div>
  `,
  styles: [`
    .select-field {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-1);
    }

    .select-field__label {
      font-size: var(--font-size-sm);
      font-weight: var(--font-weight-medium);
      color: var(--gray-700);
    }

    .select-field__required {
      color: var(--error-500);
    }

    .select-field__hint {
      font-size: var(--font-size-xs);
      color: var(--gray-500);
    }

    .select-field__error {
      font-size: var(--font-size-xs);
      color: var(--error-500);
    }

    .select-field--error .select-wrapper {
      border-color: var(--error-500);
    }

    .select-field--error .select-wrapper:focus-within {
      box-shadow: 0 0 0 3px color-mix(in srgb, var(--error-500) 10%, transparent);
    }

    .select-field--disabled {
      opacity: 0.6;
      pointer-events: none;
    }

    .select-wrapper {
      position: relative;
      background: var(--white);
      border: var(--border-width-md) solid var(--gray-300);
      border-radius: var(--border-radius-md);
      cursor: pointer;
      transition: all var(--transition-fast);
    }

    .select-wrapper:hover {
      border-color: var(--primary-400);
    }

    .select-wrapper:focus-within,
    .select-wrapper--open {
      border-color: var(--primary-500);
      box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary-500) 10%, transparent);
    }

    .select-wrapper--open .select-trigger__arrow {
      transform: rotate(180deg);
    }

    .select-trigger {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: var(--spacing-2) var(--spacing-3);
      gap: var(--spacing-2);
    }

    .select-trigger__text {
      flex: 1;
      font-size: var(--font-size-sm);
      color: var(--gray-900);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .select-trigger__text--placeholder {
      color: var(--gray-400);
    }

    .select-trigger__arrow {
      flex-shrink: 0;
      color: var(--gray-400);
      transition: transform var(--transition-fast);
    }

    .select-dropdown {
      position: absolute;
      top: calc(100% + var(--spacing-1));
      left: 0;
      right: 0;
      background: var(--white);
      border: var(--border-width-md) solid var(--gray-200);
      border-radius: var(--border-radius-md);
      box-shadow: var(--shadow-lg);
      z-index: var(--z-index-dropdown);
      max-height: 240px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }

    .select-search {
      position: relative;
      padding: var(--spacing-2);
      border-bottom: 1px solid var(--gray-100);
    }

    .select-search__input {
      width: 100%;
      padding: var(--spacing-2) var(--spacing-3);
      padding-left: var(--spacing-8);
      font-size: var(--font-size-sm);
      border: 1px solid var(--gray-200);
      border-radius: var(--border-radius-sm);
      outline: none;
      transition: border-color var(--transition-fast);
    }

    .select-search__input:focus {
      border-color: var(--primary-500);
    }

    .select-search__input::placeholder {
      color: var(--gray-400);
    }

    .select-search__icon {
      position: absolute;
      left: var(--spacing-4);
      top: 50%;
      transform: translateY(-50%);
      color: var(--gray-400);
    }

    .select-options {
      overflow-y: auto;
      flex: 1;
    }

    .select-option {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: var(--spacing-2) var(--spacing-3);
      font-size: var(--font-size-sm);
      color: var(--gray-700);
      cursor: pointer;
      transition: background-color var(--transition-fast);
    }

    .select-option:hover:not(.select-option--disabled) {
      background: var(--gray-50);
    }

    .select-option--selected {
      background: color-mix(in srgb, var(--primary-500) 10%, transparent);
      color: var(--primary-600);
      font-weight: var(--font-weight-medium);
    }

    .select-option--selected:hover {
      background: color-mix(in srgb, var(--primary-500) 15%, transparent) !important;
    }

    .select-option--disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .select-option__label {
      flex: 1;
    }

    .select-option__check {
      flex-shrink: 0;
      color: var(--primary-500);
    }

    .select-empty {
      padding: var(--spacing-4);
      text-align: center;
      font-size: var(--font-size-sm);
      color: var(--gray-500);
    }
  `],
  host: {
    '(document:click)': 'onClickOutside($event)'
  }
})
export class SelectComponent implements ControlValueAccessor {
  @Input() options: SelectOption[] = [];
  @Input() label: string = '';
  @Input() placeholder: string = 'Select an option';
  @Input() hint: string = '';
  @Input() error: string = '';
  @Input() required: boolean = false;
  @Input() disabled: boolean = false;
  @Input() searchable: boolean = false;
  @Input() searchPlaceholder: string = 'Search...';

  @Output() selectionChange = new EventEmitter<SelectOption>();

  isOpen = signal(false);
  searchQuery: string = '';
  private value: any = null;

  private onChange: (value: any) => void = () => {};
  private onTouched: () => void = () => {};

  selectedOption = computed(() => {
    return this.options.find(opt => opt.value === this.value) || null;
  });

  filteredOptions = computed(() => {
    if (!this.searchQuery) return this.options;
    return this.options.filter(opt => 
      opt.label.toLowerCase().includes(this.searchQuery.toLowerCase())
    );
  });

  writeValue(value: any): void {
    this.value = value;
  }

  registerOnChange(fn: (value: any) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  toggleDropdown(): void {
    if (this.disabled) return;
    this.isOpen.update(v => !v);
    if (!this.isOpen()) {
      this.searchQuery = '';
    }
  }

  selectOption(option: SelectOption, event: Event): void {
    event.stopPropagation();
    if (option.disabled) return;
    
    this.value = option.value;
    this.onChange(this.value);
    this.onTouched();
    this.selectionChange.emit(option);
    this.isOpen.set(false);
    this.searchQuery = '';
  }

  isSelected(option: SelectOption): boolean {
    return this.value === option.value;
  }

  onSearch(): void {
    // Signal will automatically update filteredOptions
  }

  onClickOutside(event: Event): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.select-wrapper')) {
      this.isOpen.set(false);
      this.searchQuery = '';
    }
  }
}
