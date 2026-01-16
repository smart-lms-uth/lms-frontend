import { Component, computed, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToastContainerComponent } from './components/ui';
import { ChatWidgetComponent } from './components/chat-widget/chat-widget.component';
import { AuthService } from './services/auth.service';
import { toSignal } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ToastContainerComponent, ChatWidgetComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('lms-frontend');

  private authService = inject(AuthService);
  private currentUser = toSignal(this.authService.currentUser$);

  // Show chat widget only for TEACHER and ADMIN roles (not for students)
  protected showChatWidget = computed(() => {
    const user = this.currentUser();
    return user?.role === 'TEACHER' || user?.role === 'ADMIN';
  });
}
