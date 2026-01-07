import { Pipe, PipeTransform } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Pipe({
  name: 'markdown',
  standalone: true
})
export class MarkdownPipe implements PipeTransform {
  constructor(private sanitizer: DomSanitizer) {}

  transform(value: string): SafeHtml {
    if (!value || value.trim() === '') {
      return this.sanitizer.bypassSecurityTrustHtml('');
    }

    let html = value;

    // Code blocks first (preserve content)
    html = html.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
      const escapedCode = this.escapeHtml(code.trim());
      const langClass = lang ? ` class="language-${lang}"` : '';
      return `<pre${langClass}><code>${escapedCode}</code></pre>`;
    });

    // Inline code
    html = html.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');

    // Headers (with emoji support) - process from h6 to h1
    html = html.replace(/^###### (.*$)/gim, '<h6 class="md-h6">$1</h6>');
    html = html.replace(/^##### (.*$)/gim, '<h5 class="md-h5">$1</h5>');
    html = html.replace(/^#### (.*$)/gim, '<h4 class="md-h4">$1</h4>');
    html = html.replace(/^### (.*$)/gim, '<h3 class="md-h3">$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2 class="md-h2">$1</h2>');
    html = html.replace(/^# (.*$)/gim, '<h1 class="md-h1">$1</h1>');

    // Bold and Italic (only * syntax - underscore causes issues with variable names)
    html = html.replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>');
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');

    // Links
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');

    // Horizontal rule
    html = html.replace(/^---$/gim, '<hr class="md-hr">');

    // Process lists properly
    html = this.processLists(html);

    // Paragraphs - wrap remaining text blocks
    html = html.split('\n\n').map(block => {
      block = block.trim();
      if (!block) return '';
      // Don't wrap if already a block element
      if (block.startsWith('<h') || block.startsWith('<ul') || block.startsWith('<ol') || 
          block.startsWith('<pre') || block.startsWith('<hr') || block.startsWith('<p')) {
        return block;
      }
      // Convert single newlines to <br> within paragraphs
      return '<p>' + block.replace(/\n/g, '<br>') + '</p>';
    }).join('\n');

    return this.sanitizer.bypassSecurityTrustHtml(html);
  }

  private processLists(html: string): string {
    const lines = html.split('\n');
    const result: string[] = [];
    let inUl = false;
    let inOl = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const ulMatch = line.match(/^- (.*)$/);
      const olMatch = line.match(/^\d+\. (.*)$/);

      if (ulMatch) {
        if (!inUl) {
          if (inOl) { result.push('</ol>'); inOl = false; }
          result.push('<ul class="md-ul">');
          inUl = true;
        }
        result.push(`<li>${ulMatch[1]}</li>`);
      } else if (olMatch) {
        if (!inOl) {
          if (inUl) { result.push('</ul>'); inUl = false; }
          result.push('<ol class="md-ol">');
          inOl = true;
        }
        result.push(`<li>${olMatch[1]}</li>`);
      } else {
        if (inUl) { result.push('</ul>'); inUl = false; }
        if (inOl) { result.push('</ol>'); inOl = false; }
        result.push(line);
      }
    }

    if (inUl) result.push('</ul>');
    if (inOl) result.push('</ol>');

    return result.join('\n');
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}
