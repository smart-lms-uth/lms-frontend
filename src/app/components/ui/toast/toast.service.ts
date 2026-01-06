import { Injectable, signal, computed } from '@angular/core';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
  dismissible?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  private toasts = signal<Toast[]>([]);
  
  readonly toastList = computed(() => this.toasts());

  private generateId(): string {
    return Math.random().toString(36).substring(2, 9);
  }

  show(toast: Omit<Toast, 'id'>): string {
    const id = this.generateId();
    const newToast: Toast = {
      id,
      duration: 5000,
      dismissible: true,
      ...toast
    };

    this.toasts.update(list => [...list, newToast]);

    if (newToast.duration && newToast.duration > 0) {
      setTimeout(() => this.dismiss(id), newToast.duration);
    }

    return id;
  }

  success(title: string, message?: string): string {
    return this.show({ type: 'success', title, message });
  }

  error(title: string, message?: string): string {
    return this.show({ type: 'error', title, message, duration: 8000 });
  }

  warning(title: string, message?: string): string {
    return this.show({ type: 'warning', title, message });
  }

  info(title: string, message?: string): string {
    return this.show({ type: 'info', title, message });
  }

  dismiss(id: string): void {
    this.toasts.update(list => list.filter(t => t.id !== id));
  }

  dismissAll(): void {
    this.toasts.set([]);
  }
}
