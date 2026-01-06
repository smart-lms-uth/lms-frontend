import { Component, Input, forwardRef, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, FormsModule } from '@angular/forms';

@Component({
  selector: 'app-input',
  standalone: true,
  imports: [CommonModule, FormsModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => InputComponent),
      multi: true
    }
  ],
  template: `
    <div class="form-field" [class.form-field--error]="error" [class.form-field--disabled]="disabled">
      <label class="form-field__label" *ngIf="label">
        {{ label }}
        <span class="form-field__required" *ngIf="required">*</span>
      </label>
      
      <div class="form-field__wrapper">
        <span class="form-field__icon form-field__icon--left" *ngIf="iconLeft" [innerHTML]="iconLeft"></span>
        
        <input
          *ngIf="type !== 'textarea'"
          class="form-field__input"
          [class.form-field__input--with-icon-left]="iconLeft"
          [class.form-field__input--with-icon-right]="iconRight || type === 'password'"
          [type]="type === 'password' ? (showPassword() ? 'text' : 'password') : type"
          [placeholder]="placeholder"
          [disabled]="disabled"
          [readonly]="readonly"
          [(ngModel)]="value"
          (ngModelChange)="onValueChange($event)"
          (blur)="onTouched()">

        <textarea
          *ngIf="type === 'textarea'"
          class="form-field__input form-field__textarea"
          [class.form-field__input--with-icon-left]="iconLeft"
          [placeholder]="placeholder"
          [disabled]="disabled"
          [readonly]="readonly"
          [rows]="rows"
          [(ngModel)]="value"
          (ngModelChange)="onValueChange($event)"
          (blur)="onTouched()">
        </textarea>

        <span class="form-field__icon form-field__icon--right" *ngIf="iconRight" [innerHTML]="iconRight"></span>
        
        <!-- Password Toggle -->
        <button 
          *ngIf="type === 'password'" 
          type="button"
          class="form-field__password-toggle"
          (click)="togglePassword()">
          <svg *ngIf="!showPassword()" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/>
            <circle cx="12" cy="12" r="3"/>
          </svg>
          <svg *ngIf="showPassword()" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/>
            <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/>
            <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/>
            <line x1="2" x2="22" y1="2" y2="22"/>
          </svg>
        </button>
      </div>

      <span class="form-field__hint" *ngIf="hint && !error">{{ hint }}</span>
      <span class="form-field__error" *ngIf="error">{{ error }}</span>
    </div>
  `,
  styles: [`
    .form-field {
      margin-bottom: var(--spacing-5);
    }

    .form-field--disabled {
      opacity: 0.6;
      pointer-events: none;
    }

    .form-field__label {
      display: block;
      margin-bottom: var(--spacing-2);
      font-size: var(--font-size-sm);
      font-weight: var(--font-weight-medium);
      color: var(--gray-700);
    }

    .form-field__required {
      color: var(--error-500);
      margin-left: 2px;
    }

    .form-field__wrapper {
      position: relative;
      display: flex;
      align-items: center;
    }

    .form-field__input {
      width: 100%;
      padding: var(--spacing-3) var(--spacing-4);
      background: #ffffff;
      border: 2px solid var(--gray-300);
      border-radius: var(--border-radius-md);
      font-size: var(--font-size-base);
      color: var(--gray-800);
      transition: all var(--transition-fast);
    }

    .form-field__input::placeholder {
      color: var(--gray-400);
    }

    .form-field__input:hover:not(:disabled) {
      border-color: var(--gray-400);
    }

    .form-field__input:focus {
      outline: none;
      border-color: var(--primary-500);
      box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary-500) 15%, transparent);
    }

    .form-field__input:disabled {
      background: var(--gray-100);
      cursor: not-allowed;
    }

    .form-field__input--with-icon-left {
      padding-left: var(--spacing-10);
    }

    .form-field__input--with-icon-right {
      padding-right: var(--spacing-10);
    }

    .form-field__textarea {
      min-height: 120px;
      resize: vertical;
    }

    .form-field__icon {
      position: absolute;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--gray-400);
      pointer-events: none;
    }

    .form-field__icon--left {
      left: var(--spacing-3);
    }

    .form-field__icon--right {
      right: var(--spacing-3);
    }

    :host ::ng-deep .form-field__icon svg {
      width: 20px;
      height: 20px;
    }

    .form-field__password-toggle {
      position: absolute;
      right: var(--spacing-3);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: var(--spacing-1);
      background: transparent;
      border: none;
      color: var(--gray-400);
      cursor: pointer;
      transition: color var(--transition-fast);
    }

    .form-field__password-toggle:hover {
      color: var(--gray-600);
    }

    .form-field__hint {
      display: block;
      margin-top: var(--spacing-1);
      font-size: var(--font-size-sm);
      color: var(--gray-500);
    }

    .form-field__error {
      display: block;
      margin-top: var(--spacing-1);
      font-size: var(--font-size-sm);
      color: var(--error-500);
    }

    .form-field--error .form-field__input {
      border-color: var(--error-500);
    }

    .form-field--error .form-field__input:focus {
      box-shadow: 0 0 0 3px color-mix(in srgb, var(--error-500) 15%, transparent);
    }
  `]
})
export class InputComponent implements ControlValueAccessor {
  @Input() label?: string;
  @Input() placeholder: string = '';
  @Input() type: 'text' | 'email' | 'password' | 'number' | 'textarea' = 'text';
  @Input() hint?: string;
  @Input() error?: string;
  @Input() required: boolean = false;
  @Input() disabled: boolean = false;
  @Input() readonly: boolean = false;
  @Input() iconLeft?: string;
  @Input() iconRight?: string;
  @Input() rows: number = 4;

  value: string = '';
  showPassword = signal(false);

  onChange: (value: string) => void = () => {};
  onTouched: () => void = () => {};

  writeValue(value: string): void {
    this.value = value || '';
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  onValueChange(value: string): void {
    this.value = value;
    this.onChange(value);
  }

  togglePassword(): void {
    this.showPassword.update(v => !v);
  }
}
