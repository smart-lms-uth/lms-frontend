import { Directive, HostListener, Input, ElementRef } from '@angular/core';
import { ActivityService } from '../services/activity.service';

/**
 * Directive to track click events on elements
 * Usage: <button trackClick="button-id" trackText="Button Text">Click me</button>
 */
@Directive({
  selector: '[trackClick]',
  standalone: true
})
export class TrackClickDirective {
  @Input('trackClick') elementId: string = '';
  @Input() trackText: string = '';
  @Input() trackMetadata: any;

  constructor(
    private activityService: ActivityService,
    private elementRef: ElementRef
  ) {}

  @HostListener('click', ['$event'])
  onClick(event: Event): void {
    const element = this.elementRef.nativeElement;
    const text = this.trackText || element.textContent?.trim() || '';
    const id = this.elementId || element.id || element.className || 'unknown';

    this.activityService.trackClick(id, text, this.trackMetadata);
  }
}

/**
 * Directive to track form submissions
 * Usage: <form trackForm="form-id">...</form>
 */
@Directive({
  selector: '[trackForm]',
  standalone: true
})
export class TrackFormDirective {
  @Input('trackForm') formId: string = '';

  constructor(private activityService: ActivityService) {}

  @HostListener('submit', ['$event'])
  onSubmit(event: Event): void {
    this.activityService.trackFormSubmit(this.formId, true);
  }
}

/**
 * Directive to track link clicks
 * Usage: <a trackLink href="/page">Link</a>
 */
@Directive({
  selector: '[trackLink]',
  standalone: true
})
export class TrackLinkDirective {
  constructor(
    private activityService: ActivityService,
    private elementRef: ElementRef
  ) {}

  @HostListener('click', ['$event'])
  onClick(event: Event): void {
    const element = this.elementRef.nativeElement;
    const href = element.href || element.getAttribute('routerLink') || '';
    const text = element.textContent?.trim() || '';

    this.activityService.trackLinkClick(href, text);
  }
}
