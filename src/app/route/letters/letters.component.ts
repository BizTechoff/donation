import { Component, OnDestroy, OnInit } from '@angular/core';
import { openDialog } from 'common-ui-elements';
import { CustomLetter, DonationFile, Donor } from '../../../shared/entity';
import { Letter } from '../../../shared/enum/letter';
import { customIdOf } from '../../../shared/utils/letter-catalog';
import { entityChanges } from '../../common/entity-changes';
import { UIToolsService } from '../../common/UIToolsService';
import { I18nService } from '../../i18n/i18n.service';
import { DonorSelectionModalComponent } from '../../routes/modals/donor-selection-modal/donor-selection-modal.component';
import { LetterService } from '../../services/letter.service';
import { UserNameService } from '../../services/user-name.service';

/** קטגוריה במסך: "שמחות", "ניחום אבלים", "תרומות"... */
interface LetterGroup {
  category: string;
  letters: Letter[];
}

/**
 * שלב ג׳ 5.4 - מסך המכתבים: הפקת מכתבי אירועים לתורם, והוספה ועריכה של נוסח.
 *
 * הנוסח נערך ב-Word: מורידים את התבנית, עורכים, ומעלים. התבנית נבדקת בשרת
 * לפני שהיא נכנסת (server/letter-templates). מכתב חדש - שכפול של קיים.
 * הכללים ב-LetterService; כאן רק התצוגה.
 */
@Component({
  selector: 'app-letters',
  templateUrl: './letters.component.html',
  styleUrls: ['./letters.component.scss']
})
export class LettersComponent implements OnInit, OnDestroy {
  groups: LetterGroup[] = [];
  uploaded = new Map<string, DonationFile>();
  search = '';
  busyId = '';
  error = '';
  private letters: Letter[] = [];
  private readonly changes = entityChanges([CustomLetter, DonationFile]).subscribe(() => void this.load());

  constructor(
    public i18n: I18nService,
    private ui: UIToolsService,
    private letterService: LetterService,
    public userNames: UserNameService
  ) { }

  async ngOnInit() {
    void this.userNames.load();
    await this.load();
  }

  ngOnDestroy() {
    this.changes.unsubscribe();
  }

  async load() {
    [this.letters, this.uploaded] = await Promise.all([
      this.letterService.loadCatalog(),
      this.letterService.uploadedTemplates()
    ]);
    this.applySearch();
  }

  applySearch() {
    const term = this.search.trim().toLowerCase();
    const map = new Map<string, Letter[]>();
    for (const l of this.letters) {
      if (term && !l.caption.toLowerCase().includes(term)) continue;
      const category = Letter.category(l);
      map.set(category, [...(map.get(category) || []), l]);
    }
    this.groups = [...map.entries()].map(([category, letters]) => ({ category, letters }));
  }

  /** השם בלי הקטגוריה - היא כבר בכותרת הקבוצה. */
  shortName(letter: Letter): string {
    return letter.caption.split(' / ').slice(1).join(' / ') || letter.caption;
  }

  isEventLetter(letter: Letter): boolean {
    return !Letter.isDonationLetter(letter);
  }

  isCustom(letter: Letter): boolean {
    return !!customIdOf(letter.id);
  }

  /** "נוסח מותאם · הועלה ע"י X · תאריך", או '' לתבנית המקורית. */
  templateNote(letter: Letter): string {
    const file = this.uploaded.get(letter.id);
    if (!file) return '';
    const stamp = this.userNames.stampText(file);
    return `נוסח מותאם${stamp ? ' · ' + stamp : ''}`;
  }

  async produce(letter: Letter) {
    const donor = await openDialog(DonorSelectionModalComponent, (modal: DonorSelectionModalComponent) => {
      modal.args = { title: this.i18n.currentTerms.donorSelection, multiSelect: false };
    }) as Donor | null;
    if (donor) await this.ui.donorLetterDialog(donor.id, letter.id);
  }

  async download(letter: Letter) {
    await this.run(letter, () => this.letterService.downloadTemplate(letter));
  }

  async upload(letter: Letter, input: HTMLInputElement) {
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    await this.run(letter, async () => {
      await this.letterService.uploadTemplate(letter, file);
      this.ui.info('הנוסח עודכן');
    });
  }

  async restore(letter: Letter) {
    if (!await this.ui.yesNoQuestion(`לחזור לנוסח המקורי של "${letter.caption}"?`)) return;
    await this.run(letter, () => this.letterService.restoreTemplate(letter));
  }

  async duplicate(letter: Letter) {
    const name = prompt(`שם למכתב החדש (ב"${Letter.category(letter)}"):`, `${this.shortName(letter).split(' / ').pop()} - עותק`);
    if (!name?.trim()) return;
    await this.run(letter, () => this.letterService.duplicate(letter, name));
  }

  async hide(letter: Letter) {
    if (!await this.ui.yesNoQuestion(`להסתיר את "${letter.caption}"?`)) return;
    await this.run(letter, () => this.letterService.hide(letter));
  }

  /** פעולה על מכתב: מצב "עובד" על השורה, ושגיאה (למשל תבנית שנדחתה) בראש המסך. */
  private async run(letter: Letter, action: () => Promise<unknown>) {
    this.busyId = letter.id;
    this.error = '';
    try {
      await action();
    } catch (e: any) {
      this.error = `${letter.caption}: ${e?.message || e}`;
    } finally {
      this.busyId = '';
    }
  }
}
