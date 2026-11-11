import { AfterViewInit, Component, ElementRef, EventEmitter, Input, Output, ViewChild } from '@angular/core';

/**
 * שדה הזנה / עריכה של שם בקטלוג (סוג תזכורת, אירוע...) - קומפוננטה אחת
 * לכל הקטלוגים. Enter שומר, Esc מבטל. הניקוי ובדיקת הכפילות בשרת
 * (shared/utils/catalog-name.ts); השגיאה מוצגת כאן, מתחת לשדה.
 */
@Component({
  selector: 'app-catalog-name-edit',
  templateUrl: './catalog-name-edit.component.html',
  styleUrls: ['./catalog-name-edit.component.scss']
})
export class CatalogNameEditComponent implements AfterViewInit {
  @Input() value = '';
  @Input() placeholder = '';
  /** מקבל את השם ומחזיר Promise - שגיאה ממנו מוצגת בשדה והעריכה נשארת פתוחה. */
  @Input() save!: (name: string) => Promise<unknown>;
  @Output() done = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();
  @ViewChild('input') input?: ElementRef<HTMLInputElement>;

  error = '';
  busy = false;

  ngAfterViewInit() {
    setTimeout(() => this.input?.nativeElement.focus());
  }

  async onSave() {
    const name = (this.value || '').trim();
    if (!name || this.busy) return;
    this.busy = true;
    this.error = '';
    try {
      await this.save(name);
      this.done.emit();
    } catch (e: any) {
      this.error = e?.message || 'שגיאה בשמירה';
    } finally {
      this.busy = false;
    }
  }
}
