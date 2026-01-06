import { Component, OnInit, Input, signal, inject, effect, WritableSignal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CourseService, Section, Module } from '../../services/course.service';
import { GradeService, CourseGradesResponse, GradeModuleInfo, StudentGradeResponse, ModuleGradeConfigRequest, SaveGradeTableRequest, StudentGradeUpdate, CalculatedGradeResponse } from '../../services/grade.service';
import { CardComponent } from '../../components/ui';

// Interfaces for grades (mapped from API)
export interface AssignmentModule {
  id: number;
  title: string;
  sectionTitle: string;
  maxScore: number;
  scoreWeight?: number;
  gradeType?: 'PROCESS' | 'FINAL';
  isShowInGradeTable?: boolean;
  isVirtual?: boolean;  // true nếu là module ảo (CC, Bonus)
  virtualType?: 'ATTENDANCE' | 'BONUS';  // Loại module ảo
}

export interface StudentGrade {
  id: number;
  studentId: string;          // Student code (MSSV)
  studentIdNum: number;       // Student ID (number)
  enrollmentId: number;       // Enrollment ID for API
  fullName: string;
  email: string;
  grades: { [moduleId: number]: number | null };
  attendance?: number | null; // Điểm chuyên cần (0-10)
  bonus?: number | null;      // Điểm cộng (0-10)
  averageScore?: number | null; // Điểm học phần
  letterGrade?: string | null;  // Điểm chữ (A, B+,...)
  isBanned?: boolean;           // Cấm thi
}

@Component({
  selector: 'app-teacher-course-grades',
  standalone: true,
  imports: [CommonModule, FormsModule, CardComponent],
  templateUrl: './teacher-course-grades.component.html',
  styleUrls: ['./teacher-course-grades.component.scss']
})
export class TeacherCourseGradesComponent {
  @Input() courseId!: number;
  @Input() sections!: WritableSignal<Section[]>;

  // Virtual module IDs (negative to avoid collision with real module IDs)
  static readonly ATTENDANCE_MODULE_ID = -1;
  static readonly BONUS_MODULE_ID = -2;

  private courseService = inject(CourseService);
  private gradeService = inject(GradeService);
  private gradesLoaded = false;

  // Config trọng số CC và Bonus (từ Course hoặc local)
  attendanceWeight = signal<number>(0);  // % điểm CC trong QT
  bonusWeight = signal<number>(0);       // % điểm cộng trong QT

  // Grades data
  studentsLoading = signal(false);
  students = signal<StudentGrade[]>([]);
  assignmentModules = signal<AssignmentModule[]>([]);

  // Grade type selection mode
  isSelectingProcessGrades = signal(false);
  isSelectingFinalGrades = signal(false);
  selectedModulesForGradeType = signal<Set<number>>(new Set());
  
  // Weight editing
  editingWeightModuleId = signal<number | null>(null);
  tempWeight = signal<number>(0);
  
  // Grade editing - inline edit mode
  isEditMode = signal(false);  // Toggle edit mode for grades
  editingCell = signal<{studentIndex: number, moduleId: number} | null>(null);
  tempGrade = signal<string>('');
  
  // Pending grade changes (for batch save)
  pendingGradeChanges = signal<Map<string, {enrollmentId: number, moduleId: number, score: number | null}>>(new Map());
  
  // Pending changes for save - single save button
  pendingChanges = signal<Map<number, ModuleGradeConfigRequest>>(new Map());
  isSaving = signal(false);
  
  hasPendingChanges(): boolean {
    return this.pendingChanges().size > 0;
  }

  // Watch for sections changes and load grades when sections are available
  private sectionsEffect = effect(() => {
    const currentSections = this.sections();
    // Only load grades once when sections become available
    if (currentSections.length > 0 && !this.gradesLoaded) {
      this.gradesLoaded = true;
      this.loadGrades();
    }
  });

  async loadGrades() {
    this.studentsLoading.set(true);
    this.pendingChanges.set(new Map()); // Reset pending changes
    
    try {
      // Call real API to get course grades
      const gradesData = await this.gradeService.getCourseGrades(this.courseId).toPromise();
      
      if (gradesData) {
        // Map modules from API response
        const assignments: AssignmentModule[] = gradesData.modules.map(mod => ({
          id: mod.id,
          title: mod.title,
          sectionTitle: mod.sectionTitle,
          maxScore: mod.maxScore,
          scoreWeight: mod.scoreWeight,
          gradeType: mod.gradeType,
          isShowInGradeTable: mod.isShowInGradeTable ?? true,
          isVirtual: false
        }));

        // Add virtual modules for Attendance (CC) and Bonus at the beginning
        // These will appear alongside regular modules and can be selected for PROCESS
        // Nếu weight > 0 thì coi như đã được chọn (gradeType = 'PROCESS')
        const savedAttendanceWeight = (gradesData as any).attendanceWeight ?? 0;
        const savedBonusWeight = (gradesData as any).bonusWeight ?? 0;
        
        const attendanceModule: AssignmentModule = {
          id: TeacherCourseGradesComponent.ATTENDANCE_MODULE_ID,
          title: 'Điểm CC',
          sectionTitle: 'Điểm thưởng',
          maxScore: 10,
          scoreWeight: savedAttendanceWeight > 0 ? savedAttendanceWeight : 10, // Default 10% nếu chưa config
          gradeType: savedAttendanceWeight > 0 ? 'PROCESS' : undefined, // Chỉ PROCESS nếu đã được chọn
          isShowInGradeTable: true,
          isVirtual: true,
          virtualType: 'ATTENDANCE'
        };

        const bonusModule: AssignmentModule = {
          id: TeacherCourseGradesComponent.BONUS_MODULE_ID,
          title: 'Điểm cộng',
          sectionTitle: 'Điểm thưởng',
          maxScore: 10,
          scoreWeight: savedBonusWeight > 0 ? savedBonusWeight : 5, // Default 5% nếu chưa config
          gradeType: savedBonusWeight > 0 ? 'PROCESS' : undefined, // Chỉ PROCESS nếu đã được chọn
          isShowInGradeTable: true,
          isVirtual: true,
          virtualType: 'BONUS'
        };

        // Add virtual modules at the start (or end, depending on preference)
        const allAssignments = [attendanceModule, bonusModule, ...assignments];
        this.assignmentModules.set(allAssignments);

        // Store course-level weights
        this.attendanceWeight.set((gradesData as any).attendanceWeight ?? 0);
        this.bonusWeight.set((gradesData as any).bonusWeight ?? 0);

        // Map students from API response
        const studentGrades: StudentGrade[] = gradesData.students.map((student, index) => {
          // Convert grades object with string keys to number keys
          const grades: { [moduleId: number]: number | null } = {};
          for (const [key, value] of Object.entries(student.grades)) {
            grades[parseInt(key, 10)] = value;
          }
          
          // Add virtual module scores to grades map
          const attendanceScore = (student as any).attendanceScore ?? null;
          const bonusScore = (student as any).bonusScore ?? null;
          grades[TeacherCourseGradesComponent.ATTENDANCE_MODULE_ID] = attendanceScore;
          grades[TeacherCourseGradesComponent.BONUS_MODULE_ID] = bonusScore;
          
          return {
            id: index + 1,
            studentId: student.studentCode,
            studentIdNum: student.studentId,
            enrollmentId: (student as any).enrollmentId ?? 0,
            fullName: student.fullName,
            email: student.email,
            grades: grades,
            attendance: attendanceScore,
            bonus: bonusScore,
            averageScore: student.averageScore,
            letterGrade: (student as any).letterGrade ?? null,
            isBanned: (student as any).isBanned ?? false
          };
        });
        this.students.set(studentGrades);
      }
    } catch (error) {
      console.error('Error loading grades:', error);
      // Fallback to loading modules from sections if API fails
      await this.loadGradesFromSections();
    } finally {
      this.studentsLoading.set(false);
    }
  }

  private async loadGradesFromSections() {
    // Fallback: load modules for all sections
    const currentSections = this.sections();
    const sectionsWithModules = await Promise.all(
      currentSections.map(async (section) => {
        if (!section.modules) {
          const modules = await this.courseService.getModulesBySection(section.id).toPromise();
          return { ...section, modules: modules || [] };
        }
        return section;
      })
    );

    const assignments: AssignmentModule[] = [];
    for (const section of sectionsWithModules) {
      if (section.modules) {
        for (const mod of section.modules) {
          if (mod.type === 'ASSIGNMENT' || mod.type === 'QUIZ') {
            assignments.push({
              id: mod.id,
              title: mod.title,
              sectionTitle: section.title,
              maxScore: 100
            });
          }
        }
      }
    }
    this.assignmentModules.set(assignments);
    this.students.set([]);
  }

  getStudentAverage(student: StudentGrade): string {
    // Điểm TB được tính từ Backend sử dụng công thức:
    // processScore = Σ(score × moduleWeight) / Σ(processModuleWeights) cho PROCESS modules
    // finalScore = Σ(score × moduleWeight) / Σ(finalModuleWeights) cho FINAL modules  
    // averageScore = (processScore × processWeight% + finalScore × finalWeight%) / 100
    
    if (student.averageScore !== null && student.averageScore !== undefined) {
      // Cộng thêm điểm cộng (bonus) nếu có
      let avg = student.averageScore;
      if (student.bonus !== null && student.bonus !== undefined) {
        avg += student.bonus;
      }
      // Giữ thang 100, giới hạn max 100
      avg = Math.min(avg, 100);
      return avg.toFixed(1);
    }

    return '-';
  }

  // isShowInGradeTable: true = expanded, false = collapsed
  toggleColumnCollapse(moduleId: number) {
    const module = this.assignmentModules().find(m => m.id === moduleId);
    if (!module) return;

    const currentShow = module.isShowInGradeTable ?? true;
    const newShow = !currentShow;
    
    // Update local state
    this.assignmentModules.update(modules =>
      modules.map(m => m.id === moduleId ? { ...m, isShowInGradeTable: newShow } : m)
    );
    
    // Add to pending changes
    this.addPendingChange(moduleId, { isShowInGradeTable: newShow });
  }

  isColumnCollapsed(moduleId: number): boolean {
    const module = this.assignmentModules().find(m => m.id === moduleId);
    return !(module?.isShowInGradeTable ?? true); // false = collapsed
  }
  
  // Add change to pending changes map
  private addPendingChange(moduleId: number, change: Partial<ModuleGradeConfigRequest>) {
    this.pendingChanges.update(map => {
      const newMap = new Map(map);
      const existing = newMap.get(moduleId) || { moduleId };
      newMap.set(moduleId, { ...existing, ...change });
      return newMap;
    });
  }

  // === Grade Type Selection Methods ===
  
  startSelectingProcessGrades() {
    this.isSelectingProcessGrades.set(true);
    this.isSelectingFinalGrades.set(false);
    // Pre-select modules that are already PROCESS type
    const processModules = this.assignmentModules()
      .filter(m => m.gradeType === 'PROCESS')
      .map(m => m.id);
    this.selectedModulesForGradeType.set(new Set(processModules));
  }

  startSelectingFinalGrades() {
    this.isSelectingFinalGrades.set(true);
    this.isSelectingProcessGrades.set(false);
    // Pre-select modules that are already FINAL type
    const finalModules = this.assignmentModules()
      .filter(m => m.gradeType === 'FINAL')
      .map(m => m.id);
    this.selectedModulesForGradeType.set(new Set(finalModules));
  }

  cancelGradeTypeSelection() {
    this.isSelectingProcessGrades.set(false);
    this.isSelectingFinalGrades.set(false);
    this.selectedModulesForGradeType.set(new Set());
  }

  toggleModuleSelection(moduleId: number) {
    this.selectedModulesForGradeType.update(set => {
      const newSet = new Set(set);
      if (newSet.has(moduleId)) {
        newSet.delete(moduleId);
      } else {
        newSet.add(moduleId);
      }
      return newSet;
    });
  }

  isModuleSelected(moduleId: number): boolean {
    return this.selectedModulesForGradeType().has(moduleId);
  }

  applyGradeTypeSelection() {
    const selectedIds = this.selectedModulesForGradeType();
    const gradeType = this.isSelectingProcessGrades() ? 'PROCESS' : 'FINAL';
    
    // Update local state and add to pending changes
    this.assignmentModules.update(modules => 
      modules.map(m => {
        if (selectedIds.has(m.id)) {
          // Virtual modules (CC, Bonus) don't need pending changes - only update state
          if (!m.isVirtual && m.id > 0) {
            this.addPendingChange(m.id, { gradeType });
          }
          return { ...m, gradeType };
        }
        // If was this gradeType but now unselected, set to undefined
        if (m.gradeType === gradeType && !selectedIds.has(m.id)) {
          // Virtual modules (CC, Bonus) don't need pending changes
          if (!m.isVirtual && m.id > 0) {
            this.addPendingChange(m.id, { gradeType: undefined });
          }
          return { ...m, gradeType: undefined };
        }
        return m;
      })
    );

    this.cancelGradeTypeSelection();
  }

  // === Weight Editing Methods ===
  
  startEditingWeight(moduleId: number, currentWeight?: number) {
    this.editingWeightModuleId.set(moduleId);
    this.tempWeight.set(currentWeight ?? 0);
  }

  cancelEditingWeight() {
    this.editingWeightModuleId.set(null);
    this.tempWeight.set(0);
  }

  applyWeight(moduleId: number) {
    const newWeight = this.tempWeight();
    const module = this.assignmentModules().find(m => m.id === moduleId);
    
    // Update local state
    this.assignmentModules.update(modules =>
      modules.map(m => m.id === moduleId ? { ...m, scoreWeight: newWeight } : m)
    );
    
    // Add to pending changes only for real modules (not virtual)
    if (module && !module.isVirtual && moduleId > 0) {
      this.addPendingChange(moduleId, { scoreWeight: newWeight });
    }

    this.cancelEditingWeight();
  }

  // === Save All Changes (Single Save Button) ===
  
  async saveAllChanges() {
    this.isSaving.set(true);
    
    try {
      // Nếu đang trong chế độ selection, tự động apply trước khi lưu
      if (this.isSelectingProcessGrades() || this.isSelectingFinalGrades()) {
        this.applyGradeTypeSelection();
      }
      
      // 1. Cập nhật config module (gradeType, scoreWeight) nếu có pending changes cho real modules
      const realModuleChanges = Array.from(this.pendingChanges().entries())
        .filter(([id, _]) => id > 0) // Chỉ lấy real modules (id > 0)
        .map(([_, change]) => change);
      
      if (realModuleChanges.length > 0) {
        console.log('Saving grade config:', realModuleChanges);
        await this.gradeService.updateModuleGradeConfig(this.courseId, { modules: realModuleChanges }).toPromise();
        console.log('Grade config saved successfully');
      }
      
      // 2. Lưu các thay đổi điểm của từng module (pending grade changes)
      const gradeChanges = Array.from(this.pendingGradeChanges().values())
        .filter(change => change.moduleId > 0); // Chỉ lấy real modules
      
      if (gradeChanges.length > 0) {
        console.log('Saving grade changes:', gradeChanges);
        // Gọi API update điểm cho từng thay đổi
        for (const change of gradeChanges) {
          if (change.score !== null) {
            await this.gradeService.updateGrade(this.courseId, {
              enrollmentId: change.enrollmentId,
              moduleId: change.moduleId,
              score: change.score
            }).toPromise();
          }
        }
        console.log('Grade changes saved successfully');
      }
      
      // 3. Gọi API lưu bảng điểm và tự động tính điểm học phần
      const modules = this.assignmentModules();
      const students = this.students();
      
      // Lấy danh sách module QT và KT (loại bỏ virtual modules)
      const processModuleIds = modules
        .filter(m => m.gradeType === 'PROCESS' && !m.isVirtual && m.id > 0)
        .map(m => m.id);
      const finalModuleIds = modules
        .filter(m => m.gradeType === 'FINAL' && !m.isVirtual && m.id > 0)
        .map(m => m.id);
      
      // Lấy weight của CC và Bonus từ virtual modules
      // CHỈ TÍNH NẾU ĐÃ ĐƯỢC TICK (gradeType = 'PROCESS')
      const attendanceModule = modules.find(m => m.id === TeacherCourseGradesComponent.ATTENDANCE_MODULE_ID);
      const bonusModule = modules.find(m => m.id === TeacherCourseGradesComponent.BONUS_MODULE_ID);
      
      // Nếu không tick (gradeType !== 'PROCESS') thì weight = 0, không tính vào điểm
      const attendanceWeight = attendanceModule?.gradeType === 'PROCESS' ? (attendanceModule.scoreWeight ?? 0) : 0;
      const bonusWeight = bonusModule?.gradeType === 'PROCESS' ? (bonusModule.scoreWeight ?? 0) : 0;
      
      // Build request để gọi API tính điểm
      const request: SaveGradeTableRequest = {
        courseId: this.courseId,
        attendanceWeight: attendanceWeight,
        bonusWeight: bonusWeight,
        students: students.map(s => ({
          studentId: s.studentIdNum,
          enrollmentId: s.enrollmentId,
          processModuleIds: processModuleIds,
          finalModuleIds: finalModuleIds,
          attendanceScore: s.grades[TeacherCourseGradesComponent.ATTENDANCE_MODULE_ID] ?? s.attendance ?? undefined,
          bonusScore: s.grades[TeacherCourseGradesComponent.BONUS_MODULE_ID] ?? s.bonus ?? undefined,
          isBanned: s.isBanned ?? false
        }))
      };
      
      console.log('Saving grade table and calculating scores:', request);
      const results = await this.gradeService.saveGradeTable(this.courseId, request).toPromise();
      console.log('Grade calculation results:', results);
      
      // 4. Cập nhật điểm hiển thị từ kết quả
      if (results) {
        this.updateStudentScoresFromResults(results);
      }
      
      // 5. Clear all pending changes and turn off edit mode
      this.pendingChanges.set(new Map());
      this.pendingGradeChanges.set(new Map());
      this.isEditMode.set(false);
      
      // 6. Reload grades
      await this.loadGrades();
      
    } catch (error) {
      console.error('Error saving changes:', error);
    } finally {
      this.isSaving.set(false);
    }
  }

  /**
   * Cập nhật điểm hiển thị từ kết quả tính toán
   */
  private updateStudentScoresFromResults(results: CalculatedGradeResponse[]) {
    const resultMap = new Map(results.map(r => [r.enrollmentId, r]));
    
    this.students.update(students => 
      students.map(s => {
        const result = resultMap.get(s.enrollmentId);
        if (result) {
          return {
            ...s,
            averageScore: result.totalScore * 10, // Chuyển về thang 100
            letterGrade: result.letterGrade
          };
        }
        return s;
      })
    );
  }
  
  discardAllChanges() {
    // Reload from API to discard local changes
    this.loadGrades();
  }

  // Tính tổng weight của modules đã có gradeType = PROCESS
  getProcessModulesWeight(): number {
    return this.assignmentModules()
      .filter(m => m.gradeType === 'PROCESS')
      .reduce((sum, m) => sum + (m.scoreWeight ?? 0), 0);
  }

  // Tính tổng weight của modules đã có gradeType = FINAL
  getFinalModulesWeight(): number {
    return this.assignmentModules()
      .filter(m => m.gradeType === 'FINAL')
      .reduce((sum, m) => sum + (m.scoreWeight ?? 0), 0);
  }

  // Tính tổng weight của các module đang được tick trong selection mode
  getSelectedModulesWeight(): number {
    const selectedIds = this.selectedModulesForGradeType();
    return this.assignmentModules()
      .filter(m => selectedIds.has(m.id))
      .reduce((sum, m) => sum + (m.scoreWeight ?? 0), 0);
  }

  // Hiển thị weight cho button - nếu đang selection thì hiện tổng đang tick, không thì hiện tổng đã lưu
  getDisplayProcessWeight(): number {
    if (this.isSelectingProcessGrades()) {
      return this.getSelectedModulesWeight();
    }
    return this.getProcessModulesWeight();
  }

  getDisplayFinalWeight(): number {
    if (this.isSelectingFinalGrades()) {
      return this.getSelectedModulesWeight();
    }
    return this.getFinalModulesWeight();
  }

  // Kiểm tra mỗi nhóm (QT/KT) phải = 100% riêng
  isProcessWeightValid(): boolean {
    const processWeight = this.isSelectingProcessGrades() 
      ? this.getSelectedModulesWeight() 
      : this.getProcessModulesWeight();
    // Nếu không có module PROCESS thì coi như valid
    const hasProcessModules = this.isSelectingProcessGrades()
      ? this.selectedModulesForGradeType().size > 0
      : this.assignmentModules().some(m => m.gradeType === 'PROCESS');
    return !hasProcessModules || processWeight === 100;
  }

  isFinalWeightValid(): boolean {
    const finalWeight = this.isSelectingFinalGrades()
      ? this.getSelectedModulesWeight()
      : this.getFinalModulesWeight();
    // Nếu không có module FINAL thì coi như valid
    const hasFinalModules = this.isSelectingFinalGrades()
      ? this.selectedModulesForGradeType().size > 0
      : this.assignmentModules().some(m => m.gradeType === 'FINAL');
    return !hasFinalModules || finalWeight === 100;
  }

  isWeightValid(): boolean {
    return this.isProcessWeightValid() && this.isFinalWeightValid();
  }

  // ==================== GRADE EDITING METHODS ====================

  /**
   * Toggle edit mode cho bảng điểm
   */
  toggleEditMode() {
    this.isEditMode.update(v => !v);
    if (!this.isEditMode()) {
      // Khi tắt edit mode, clear editing cell
      this.editingCell.set(null);
      this.tempGrade.set('');
    }
  }

  /**
   * Bắt đầu edit một ô điểm
   */
  startEditingGrade(studentIndex: number, moduleId: number, currentValue: number | null) {
    this.editingCell.set({ studentIndex, moduleId });
    this.tempGrade.set(currentValue !== null && currentValue !== undefined ? currentValue.toString() : '');
  }

  /**
   * Kiểm tra xem ô có đang được edit không
   */
  isEditingGrade(studentIndex: number, moduleId: number): boolean {
    const cell = this.editingCell();
    return cell !== null && cell.studentIndex === studentIndex && cell.moduleId === moduleId;
  }

  /**
   * Hủy edit ô hiện tại
   */
  cancelEditingGrade() {
    this.editingCell.set(null);
    this.tempGrade.set('');
  }

  /**
   * Apply giá trị đã edit và lưu vào pending changes
   */
  applyGradeEdit(studentIndex: number, moduleId: number) {
    const students = this.students();
    const student = students[studentIndex];
    if (!student) return;

    const inputValue = this.tempGrade().trim();
    let newScore: number | null = null;

    if (inputValue !== '' && inputValue !== '-') {
      const parsed = parseFloat(inputValue);
      if (!isNaN(parsed)) {
        // Clamp value between 0 and maxScore
        const module = this.assignmentModules().find(m => m.id === moduleId);
        const maxScore = module?.maxScore ?? 100;
        newScore = Math.max(0, Math.min(parsed, maxScore));
      }
    }

    // Update local state
    this.students.update(list => 
      list.map((s, idx) => {
        if (idx === studentIndex) {
          const newGrades = { ...s.grades, [moduleId]: newScore };
          
          // Cập nhật attendance và bonus nếu là virtual module
          let newAttendance = s.attendance;
          let newBonus = s.bonus;
          if (moduleId === TeacherCourseGradesComponent.ATTENDANCE_MODULE_ID) {
            newAttendance = newScore;
          } else if (moduleId === TeacherCourseGradesComponent.BONUS_MODULE_ID) {
            newBonus = newScore;
          }
          
          return { ...s, grades: newGrades, attendance: newAttendance, bonus: newBonus };
        }
        return s;
      })
    );

    // Add to pending grade changes
    const key = `${student.enrollmentId}-${moduleId}`;
    this.pendingGradeChanges.update(map => {
      const newMap = new Map(map);
      newMap.set(key, {
        enrollmentId: student.enrollmentId,
        moduleId: moduleId,
        score: newScore
      });
      return newMap;
    });

    // Clear editing state
    this.cancelEditingGrade();
  }

  /**
   * Handle keydown events trong input edit
   */
  onGradeKeydown(event: KeyboardEvent, studentIndex: number, moduleId: number) {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.applyGradeEdit(studentIndex, moduleId);
      
      // Move to next cell (same column, next row)
      const students = this.students();
      if (studentIndex < students.length - 1) {
        const nextStudent = students[studentIndex + 1];
        this.startEditingGrade(studentIndex + 1, moduleId, nextStudent.grades[moduleId]);
      }
    } else if (event.key === 'Escape') {
      this.cancelEditingGrade();
    } else if (event.key === 'Tab') {
      event.preventDefault();
      this.applyGradeEdit(studentIndex, moduleId);
      
      // Move to next column (same row)
      const modules = this.assignmentModules().filter(m => !this.isColumnCollapsed(m.id));
      const currentModuleIndex = modules.findIndex(m => m.id === moduleId);
      if (currentModuleIndex >= 0 && currentModuleIndex < modules.length - 1) {
        const nextModule = modules[currentModuleIndex + 1];
        const student = this.students()[studentIndex];
        this.startEditingGrade(studentIndex, nextModule.id, student.grades[nextModule.id]);
      }
    }
  }

  /**
   * Kiểm tra có pending grade changes không
   */
  hasPendingGradeChanges(): boolean {
    return this.pendingGradeChanges().size > 0;
  }

  // ==================== BAN FROM EXAM METHODS ====================

  /**
   * Toggle cấm thi cho sinh viên
   */
  toggleBanStudent(studentIndex: number) {
    this.students.update(list =>
      list.map((s, idx) => {
        if (idx === studentIndex) {
          return { ...s, isBanned: !s.isBanned };
        }
        return s;
      })
    );
  }

  /**
   * Kiểm tra sinh viên có bị cấm thi không
   */
  isStudentBanned(studentIndex: number): boolean {
    const student = this.students()[studentIndex];
    return student?.isBanned ?? false;
  }
}
