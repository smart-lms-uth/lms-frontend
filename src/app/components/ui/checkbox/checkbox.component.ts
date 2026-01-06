import { Component, Input, forwardRef, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, FormsModule } from '@angular/forms';

@Component({
  selector: 'app-checkbox',
  standalone: true,
  imports: [CommonModule, FormsModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => CheckboxComponent),
      multi: true
    }
  ],
  template: `
    <label class="checkbox" [class.checkbox--disabled]="disabled" [class.checkbox--error]="error">
      <input 
        type="checkbox"
        class="checkbox__input"
        [checked]="checked()"
        [disabled]="disabled"
        (change)="onCheckChange($event)">
      
      <span class="checkbox__box">
        <svg class="checkbox__check" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
      </span>
      
      <span class="checkbox__label" *ngIf="label">
        {{ label }}
        <span *ngIf="required" class="checkbox__required">*</span>
      </span>
    </label>
    <span *ngIf="error" class="checkbox__error-text">{{ error }}</span>
  `,
  styles: [`
    :host {
      display: block;
    }

    .checkbox {
      display: inline-flex;
      align-items: flex-start;
      gap: var(--spacing-2);
      cursor: pointer;
      user-select: none;
    }

    .checkbox--disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .checkbox--disabled .checkbox__box {
      background: var(--gray-100);
    }

    .checkbox--error .checkbox__box {
      border-color: var(--error-500);
    }

    .checkbox__input {
      position: absolute;
      opacity: 0;
      width: 0;
      height: 0;
    }

    .checkbox__input:checked + .checkbox__box {
      background: var(--primary-500);
      border-color: var(--primary-500);
    }

    .checkbox__input:checked + .checkbox__box .checkbox__check {
      opacity: 1;
      transform: scale(1);
    }

    .checkbox__input:focus-visible + .checkbox__box {
      box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary-500) 20%, transparent);
    }

    .checkbox__box {
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      width: 20px;
      height: 20px;
      background: var(--white);
      border: var(--border-width-md) solid var(--gray-300);
      border-radius: var(--border-radius-sm);
      transition: all var(--transition-fast);
    }

    .checkbox__check {
      color: var(--white);
      opacity: 0;
      transform: scale(0.5);
      transition: all var(--transition-fast);
    }

    .checkbox__label {
      font-size: var(--font-size-sm);
      color: var(--gray-700);
      line-height: 20px;
    }

    .checkbox__required {
      color: var(--error-500);
    }

    .checkbox__error-text {
      display: block;
      font-size: var(--font-size-xs);
      color: var(--error-500);
      margin-top: var(--spacing-1);
      margin-left: 28px;
    }
  `]
})
export class CheckboxComponent implements ControlValueAccessor {
  @Input() label: string = '';
  @Input() required: boolean = false;
  @Input() disabled: boolean = false;
  @Input() error: string = '';

  checked = signal(false);

  private onChange: (value: boolean) => void = () => {};
  private onTouched: () => void = () => {};

  writeValue(value: boolean): void {
    this.checked.set(!!value);
  }

  registerOnChange(fn: (value: boolean) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  onCheckChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.checked.set(target.checked);
    this.onChange(target.checked);
    this.onTouched();
  }
}
