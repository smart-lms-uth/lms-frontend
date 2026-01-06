import { Injectable, signal, computed } from '@angular/core';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class EditModeService {
  private _editMode = signal(false);
  
  editMode = this._editMode.asReadonly();
  
  constructor(private authService: AuthService) {}
  
  get isTeacher(): boolean {
    const user = this.authService.getCurrentUserSync();
    return user?.role === 'TEACHER' || user?.role === 'ADMIN';
  }
  
  toggleEditMode() {
    if (this.isTeacher) {
      this._editMode.update(v => !v);
    }
  }
  
  enableEditMode() {
    if (this.isTeacher) {
      this._editMode.set(true);
    }
  }
  
  disableEditMode() {
    this._editMode.set(false);
  }
}
