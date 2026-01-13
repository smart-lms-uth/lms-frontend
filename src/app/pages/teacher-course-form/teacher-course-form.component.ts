import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { AuthService, User } from '../../services/auth.service';
import { CourseService, Semester, Subject, CourseStatus, CreateCourseRequest } from '../../services/course.service';
import { MainLayoutComponent } from '../../components/layout';
import { CardComponent } from '../../components/ui';

@Component({
  selector: 'app-teacher-course-form',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    ReactiveFormsModule,
    MainLayoutComponent,
    CardComponent
  ],
  templateUrl: './teacher-course-form.component.html',
  styleUrls: ['./teacher-course-form.component.scss']
})
export class TeacherCourseFormComponent implements OnInit {
  loading = signal(true);
  submitting = signal(false);
  isEdit = signal(false);
  courseId = signal<number | null>(null);
  errorMessage = signal<string | null>(null);
  
  semesters = signal<Semester[]>([]);
  subjects = signal<Subject[]>([]);
  currentUser = signal<User | null>(null);

  courseForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private courseService: CourseService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.courseForm = this.fb.group({
      courseCode: ['', [Validators.required, Validators.maxLength(50)]],
      subjectId: ['', Validators.required],
      semesterId: ['', Validators.required],
      room: [''],
      maxStudents: [50, [Validators.required, Validators.min(1)]],
      status: ['OPEN', Validators.required]
    });
  }

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id && id !== 'create') {
      this.isEdit.set(true);
      this.courseId.set(parseInt(id));
    }
    
    this.loadData();
  }

  async loadData() {
    this.loading.set(true);
    
    try {
      const user = this.authService.getCurrentUserSync();
      this.currentUser.set(user);

      const [semesters, subjects] = await Promise.all([
        this.courseService.getSemesters().toPromise(),
        this.courseService.getSubjects().toPromise()
      ]);

      this.semesters.set(semesters || []);
      this.subjects.set(subjects || []);

      // If editing, load course data
      if (this.isEdit() && this.courseId()) {
        const course = await this.courseService.getCourseById(this.courseId()!).toPromise();
        if (course) {
          this.courseForm.patchValue({
            courseCode: course.courseCode,
            subjectId: course.subjectId.toString(),
            semesterId: course.semesterId.toString(),
            room: course.room,
            maxStudents: course.maxStudents,
            status: course.status
          });
        }
      } else {
        // Pre-select current semester
        const currentSemester = (semesters || []).find(s => s.isCurrent);
        if (currentSemester) {
          this.courseForm.patchValue({ semesterId: currentSemester.id.toString() });
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
      this.errorMessage.set('Không thể tải dữ liệu. Vui lòng thử lại.');
    } finally {
      this.loading.set(false);
    }
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.courseForm.get(fieldName);
    return field ? field.invalid && (field.dirty || field.touched) : false;
  }

  async onSubmit() {
    if (this.courseForm.invalid) {
      Object.keys(this.courseForm.controls).forEach(key => {
        this.courseForm.get(key)?.markAsTouched();
      });
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set(null);

    try {
      const formValue = this.courseForm.value;
      const request: CreateCourseRequest = {
        courseCode: formValue.courseCode,
        subjectId: parseInt(formValue.subjectId),
        semesterId: parseInt(formValue.semesterId),
        instructorId: this.currentUser()?.id || 0,
        room: formValue.room || '',
        maxStudents: formValue.maxStudents,
        status: formValue.status as CourseStatus
      };

      if (this.isEdit() && this.courseId()) {
        await this.courseService.updateCourse(this.courseId()!, request).toPromise();
      } else {
        await this.courseService.createCourse(request).toPromise();
      }

      this.router.navigate(['/teacher/dashboard']);
    } catch (error: any) {
      console.error('Error saving course:', error);
      this.errorMessage.set(error?.error?.message || 'Không thể lưu lớp học phần. Vui lòng thử lại.');
    } finally {
      this.submitting.set(false);
    }
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
