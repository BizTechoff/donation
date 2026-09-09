import { Component, ElementRef, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { Subscription } from 'rxjs';
import { remult } from 'remult';
import { DonorGift, Donor, Gift, Reminder } from '../../../shared/entity';
import { User } from '../../../shared/entity/user';
import { ContactPerson } from '../../../shared/entity/contact-person';
import { I18nService } from '../../i18n/i18n.service';
import { UIToolsService } from '../../common/UIToolsService';
import { GlobalFilterService } from '../../services/global-filter.service';
import { BusyService } from '../../common-ui-elements/src/angular/wait/busy-service';
import { HebrewDateService } from '../../services/hebrew-date.service';
import { DonorGiftController, DonorGiftFilters } from '../../../shared/controllers/donor-gift.controller';
import { openDialog } from 'common-ui-elements';
import { DonorGiftDetailsModalComponent } from '../../routes/modals/donor-gift-details-modal/donor-gift-details-modal.component';
import { GiftCatalogModalComponent } from '../../routes/modals/gift-catalog-modal/gift-catalog-modal.component';
import { PrintService } from '../../services/print.service';
import { ExcelExportService } from '../../services/excel-export.service';
import { DonorController } from '../../../shared/controllers/donor.controller';
import { DonorMapController } from '../../../shared/controllers/donor-map.controller';
import { TableState, TableLoadRequest } from '../../common/table/table-state';

@Component({
  selector: 'app-donor-gifts-list',
  templateUrl: './donor-gifts-list.component.html',
  styleUrls: ['./donor-gifts-list.component.scss']
})
export class DonorGiftsListComponent implements OnInit, OnDestroy {
  // Summary block hidden per client request (08.09.2026) - the counters at the
  // top of this list are not used day to day and cost vertical space.
  // Same switch as donations-list (Z12): flip to true to bring it back;
  // the markup itself was not removed.
  showSummary = false;


  donorGifts: DonorGift[] = [];
  selectedDonor?: Donor;
  gifts: Gift[] = [];
  reminderMap = new Map<string, string>(); // donorGiftId -> reminderId

  donorGiftRepo = remult.repo(DonorGift);
  donorRepo = remult.repo(Donor);
  giftRepo = remult.repo(Gift);

  loading = false;
  private subscriptions = new Subscription();
  private filterTimeout: any;

  // Local filters
  selectedDonorId = '';
  selectedGiftId = '';
  selectedYear = '';
  searchDonorName = '';
  @ViewChild('searchInput') searchInput?: ElementRef<HTMLInputElement>;
  // Scrollable table body handle — reset to top on each refresh so paging
  // starts at the top of the new page (Israel Glikson, 1.7.2026).
  @ViewChild('scrollableTable') scrollableTable?: ElementRef<HTMLElement>;

  years: number[] = [];
  hebrewYearLabels: { [key: number]: string } = {};

  // O1 - sorting and paging come from the shared TableState instead of the
  // ~140 lines this component used to carry. 'donor' and 'gift' are ordered in
  // SQL through the sqlExpression fields on DonorGift, which is what makes
  // those two columns sort at all (see donor-gift.controller).
  readonly table = new TableState({
    pageSize: 50,
    settingsKey: 'donorGifts',
    sortableFields: ['donor', 'gift', 'deliveryDate', 'isDelivered'],
    scrollContainer: () => this.scrollableTable?.nativeElement,
    load: req => this.loadDonorGifts(req)
  });

  // Stats
  deliveredCount = 0;
  pendingCount = 0;

  constructor(
    public i18n: I18nService,
    private ui: UIToolsService,
    private globalFilterService: GlobalFilterService,
    private busy: BusyService,
    private hebrewDateService: HebrewDateService,
    private printService: PrintService,
    private excelExportService: ExcelExportService
  ) {}

  async ngOnInit() {
    await this.loadBase();

    // A global filter change alters the result set - back to page 1.
    this.subscriptions.add(
      this.globalFilterService.filters$.subscribe(() => {
        this.table.reloadFromFirstPage();
      })
    );

    // Saved sort first, then the first fetch - so the very first request
    // already carries the user's persisted sort (same order as donor-list).
    await this.table.loadSettings();
    await this.table.reload();
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
    if (this.filterTimeout) {
      clearTimeout(this.filterTimeout);
    }
  }

  /**
   * Load base data once - called only on component initialization
   */
  private async loadBase() {
    await this.loadGifts();
    this.generateYearsList();
  }

  /** The filters as the server expects them - built in one place. */
  private buildFilters(): DonorGiftFilters {
    return {
      searchDonorName: this.searchDonorName?.trim() || undefined,
      selectedDonorId: this.selectedDonorId?.trim() || undefined,
      selectedGiftId: this.selectedGiftId?.trim() || undefined,
      selectedYear: this.selectedYear?.trim() || undefined
    };
  }

  /** Reload the current page. Anything that changes the RESULT SET should call
   *  table.reloadFromFirstPage() instead, so the user does not land on a page
   *  that no longer exists. */
  async refreshData() {
    await this.table.reload();
  }

  /** Fetches one page. TableState owns page/pageSize/sort and hands them in;
   *  this component only owns its rows. Scroll-to-top is done by TableState. */
  private async loadDonorGifts(req: TableLoadRequest) {
    this.loading = true;
    await this.busy.doWhileShowingBusy(async () => {
      try {
        const localFilters = this.buildFilters();

        const [count, stats, gifts] = await Promise.all([
          DonorGiftController.countFilteredDonorGifts(localFilters),
          DonorGiftController.getStats(localFilters),
          DonorGiftController.findFilteredDonorGifts(localFilters, req.page, req.pageSize, req.sort)
        ]);

        this.table.totalCount = count;
        this.deliveredCount = stats.deliveredCount;
        this.pendingCount = stats.pendingCount;
        this.donorGifts = gifts;

        await this.loadReminders();
      } catch (error) {
        console.error('Error refreshing donor gifts:', error);
        this.donorGifts = [];
        this.table.totalCount = 0;
        this.deliveredCount = 0;
        this.pendingCount = 0;
      } finally {
        this.loading = false;
      }
    });
  }

  async openDonorSelectionModal() {
    try {
      const { openDialog } = await import('common-ui-elements');
      const { DonorSelectionModalComponent } = await import('../../routes/modals/donor-selection-modal/donor-selection-modal.component');

      const selectedDonor = await openDialog(
        DonorSelectionModalComponent,
        (modal: any) => {
          modal.args = {
            title: 'בחירת תורם לפילטר',
            multiSelect: false,
            allowCreate: false   // Z5 - filtering, not creating
          };
        }
      ) as Donor | null;

      if (selectedDonor) {
        this.selectedDonor = selectedDonor;
        this.selectedDonorId = selectedDonor.id;
        this.applyFilters();
      }
    } catch (error) {
      console.error('Error opening donor selection modal:', error);
      this.ui.error('שגיאה בפתיחת חלון בחירת תורם');
    }
  }

  clearDonorFilter() {
    this.selectedDonor = undefined;
    this.selectedDonorId = '';
    this.applyFilters();
  }

  async loadGifts() {
    this.gifts = await this.giftRepo.find({
      where: { isActive: true },
      orderBy: { name: 'asc' }
    });
  }

  async generateYearsList() {
    const currentHebrewYear = this.hebrewDateService.getCurrentHebrewYear();
    this.years = [];
    this.hebrewYearLabels = {};
    for (let i = currentHebrewYear; i >= currentHebrewYear - 10; i--) {
      this.years.push(i);
      // Get formatted Hebrew year label
      const label = await this.hebrewDateService.formatHebrewYear(i);
      this.hebrewYearLabels[i] = label;
    }
  }

  applyFilters() {
    if (this.filterTimeout) {
      clearTimeout(this.filterTimeout);
    }

    // Skip server search for very short text input (1 char matches too many).
    // Empty string allowed - clearing the search resets the list.
    const trimmed = (this.searchDonorName || '').trim();
    if (trimmed.length > 0 && trimmed.length < 2) {
      return;
    }

    this.filterTimeout = setTimeout(async () => {
      console.log('Filter changed, reloading donor gifts');
      await this.table.reloadFromFirstPage();
      this.restoreSearchFocus();
    }, 800); // 800ms debounce (was 300 - too fast for slow typists)
  }

  private restoreSearchFocus() {
    setTimeout(() => {
      const native = this.searchInput?.nativeElement;
      if (!native) return;
      const active = document.activeElement;
      const isInputAlready = active === native;
      const isOtherInteractive = active && (
        active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.tagName === 'SELECT'
      ) && active !== native;
      if (!isInputAlready && !isOtherInteractive) {
        native.focus();
        const len = native.value?.length ?? 0;
        try { native.setSelectionRange(len, len); } catch {}
      }
    }, 150);
  }

  clearFilters() {
    this.selectedDonorId = '';
    this.selectedGiftId = '';
    this.selectedYear = '';
    this.searchDonorName = '';
    this.table.reloadFromFirstPage();
  }

  // Sorting and paging live in `table` (TableState) - the ~140 lines that
  // used to sit here were one of the copies that drifted and caused O1.

  async manageGiftCatalog() {
    await openDialog(GiftCatalogModalComponent, () => {});
    // Reload gifts in case any were added/edited/deleted
    await this.loadGifts();
  }

  async createDonorGift() {
    const result = await openDialog(DonorGiftDetailsModalComponent, (it) => {
      it.args = { donorGiftId: 'new' };
    });

    if (result) {
      await this.refreshData();
    }
  }

  async editDonorGift(donorGift: DonorGift) {
    const result = await openDialog(DonorGiftDetailsModalComponent, (it) => {
      it.args = { donorGiftId: donorGift.id };
    });

    if (result) {
      await this.refreshData();
    }
  }

  async deleteDonorGift(donorGift: DonorGift) {
    const confirmed = await this.ui.yesNoQuestion(
      `האם למחוק את המתנה "${donorGift.gift?.name}" לתורם "${donorGift.donor?.firstName} ${donorGift.donor?.lastName}"?`
    );

    if (confirmed) {
      try {
        await this.donorGiftRepo.delete(donorGift);
        await this.refreshData();
        this.ui.info('המתנה נמחקה בהצלחה');
      } catch (error) {
        console.error('Error deleting donor gift:', error);
        this.ui.error('שגיאה במחיקת המתנה');
      }
    }
  }

  getDonorName(donorGift: DonorGift): string {
    if (!donorGift.donor) return '-';
    return donorGift.donor.lastAndFirstName
  }

  formatDate(date: Date | undefined): string {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('he-IL');
  }

  formatHebrewDate(date: Date | undefined): string {
    if (!date) return '-';
    try {
      const hebrewDate = this.hebrewDateService.convertGregorianToHebrew(new Date(date));
      return hebrewDate.formatted;
    } catch (error) {
      console.error('Error formatting Hebrew date:', error);
      return '-';
    }
  }

  async addReminder(donorGift: DonorGift) {
    if (!donorGift) return;

    try {
      const donorName = donorGift.donor ?
        `${donorGift.donor.firstName || ''} ${donorGift.donor.lastName || ''}`.trim() :
        'תורם';

      const reminderId = await this.ui.reminderDetailsDialog('new', {
        donorId: donorGift.donorId,
        reminderDate: donorGift.deliveryDate,
        sourceEntity: 'donor_gift',
        donorName: donorName,
        sourceEntityType: 'donor_gift',
        sourceEntityId: donorGift.id
      });

      if (reminderId && typeof reminderId === 'string') {
        // Reminder is now linked via sourceEntityType/sourceEntityId - no need to save gift
        await this.refreshData();
        console.log('Reminder created and linked to gift:', donorGift.id);
      }
    } catch (error) {
      console.error('Error opening reminder modal:', error);
      this.ui.error('שגיאה בפתיחת מודל התזכורת');
    }
  }

  async openReminder(donorGift: DonorGift) {
    if (!donorGift?.id) return;

    try {
      // Find reminder by sourceEntityType and sourceEntityId
      const reminder = await remult.repo(Reminder).findFirst({
        sourceEntityType: 'donor_gift',
        sourceEntityId: donorGift.id
      });

      if (reminder) {
        await this.ui.reminderDetailsDialog(reminder.id);
      } else {
        this.ui.error('לא נמצאה תזכורת למתנה זו');
      }
      // Refresh data in case reminder was updated or deleted
      await this.refreshData();
    } catch (error) {
      console.error('Error opening reminder modal:', error);
      this.ui.error('שגיאה בפתיחת מודל התזכורת');
    }
  }

  private async loadReminders() {
    if (this.donorGifts.length === 0) return;

    const donorGiftIds = this.donorGifts.map(g => g.id).filter(id => id);
    if (donorGiftIds.length === 0) return;

    try {
      const reminders = await remult.repo(Reminder).find({
        where: {
          sourceEntityType: 'donor_gift',
          sourceEntityId: { $in: donorGiftIds }
        }
      });

      this.reminderMap.clear();
      for (const reminder of reminders) {
        if (reminder.sourceEntityId) {
          this.reminderMap.set(reminder.sourceEntityId, reminder.id);
        }
      }
    } catch (error) {
      console.error('Error loading reminders:', error);
      this.reminderMap.clear();
    }
  }

  hasReminder(donorGift: DonorGift): boolean {
    return !!donorGift.id && this.reminderMap.has(donorGift.id);
  }

  async toggleDeliveryStatus(donorGift: DonorGift) {
    if (!donorGift) return;

    try {
      const wasDelivered = donorGift.isDelivered;
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // If marking as delivered
      if (!wasDelivered) {
        // Check if deliveryDate already exists and is different from today
        if (donorGift.deliveryDate) {
          const existingDate = new Date(donorGift.deliveryDate);
          existingDate.setHours(0, 0, 0, 0);

          // If date is different from today, ask user
          if (existingDate.getTime() !== today.getTime()) {
            const hebrewExistingDate = this.formatHebrewDate(donorGift.deliveryDate);

            const confirmed = await this.ui.yesNoQuestion(
              `המתנה סומנה כנמסרה! לגבי התאריך שרשום כרגע בשדה "תאריך מסירה" רשום שם: ${hebrewExistingDate}. האם לשנות את תאריך המסירה להיום?`,
            true);

            if (!confirmed) {
              // User wants to keep existing date, just mark as delivered
              donorGift.isDelivered = true;
              await this.donorGiftRepo.save(donorGift);
              await this.refreshData();
              this.ui.info('המתנה סומנה כנמסרה (התאריך הקיים נשמר)');
              return;
            }
          }
        }

        // Set today as delivery date and mark as delivered
        donorGift.deliveryDate = today;
        donorGift.isDelivered = true;
        await this.donorGiftRepo.save(donorGift);
        await this.refreshData();
        this.ui.info('המתנה סומנה כנמסרה עם תאריך של היום');
      } else {
        // Unmarking as delivered
        donorGift.isDelivered = false;
        await this.donorGiftRepo.save(donorGift);
        await this.refreshData();
        this.ui.info('הסימון כנמסר בוטל');
      }
    } catch (error) {
      console.error('Error toggling delivery status:', error);
      this.ui.error('שגיאה בעדכון סטטוס המסירה');
    }
  }

  async onPrint() {
    await this.busy.doWhileShowingBusy(async () => {
      try {
        const localFilters = this.buildFilters();

        // Fetch ALL donor gifts (no pagination)
        const allDonorGifts = await DonorGiftController.findFilteredDonorGifts(
          localFilters,
          undefined,
          undefined,
          this.table.sortColumns
        );

        // Prepare data for print
        const printData = allDonorGifts.map(donorGift => ({
          donor: this.getDonorName(donorGift),
          gift: donorGift.gift?.name || '-',
          deliveryDate: this.formatHebrewDate(donorGift.deliveryDate),
          status: donorGift.isDelivered ? this.i18n.currentTerms.delivered : this.i18n.currentTerms.pending,
          notes: donorGift.notes || '-'
        }));

        this.printService.print({
          title: this.i18n.currentTerms.donorGifts || 'מתנות לתורמים',
          subtitle: `${allDonorGifts.length} ${this.i18n.currentTerms.donorGifts || 'מתנות'}`,
          columns: [
            { header: this.i18n.currentTerms.donor || 'תורם', field: 'donor' },
            { header: this.i18n.currentTerms.gift || 'מתנה', field: 'gift' },
            { header: this.i18n.currentTerms.deliveryDate || 'תאריך מסירה', field: 'deliveryDate' },
            { header: this.i18n.currentTerms.status || 'סטטוס', field: 'status' },
            { header: this.i18n.currentTerms.notes || 'הערות', field: 'notes' }
          ],
          data: printData,
          direction: 'rtl'
        });
      } catch (error) {
        console.error('Error printing donor gifts:', error);
        this.ui.error('שגיאה בהדפסה');
      }
    });
  }

  // Helper method to translate marital status
  private getMaritalStatusText(status: string): string {
    const statusMap: Record<string, string> = {
      'married': this.i18n.currentTerms.married || 'נשוי/ה',
      'single': this.i18n.currentTerms.single || 'רווק/ה',
      'widowed': this.i18n.currentTerms.widowed || 'אלמן/ה',
      'divorced': this.i18n.currentTerms.divorced || 'גרוש/ה'
    };
    return statusMap[status] || '';
  }

  async onExport() {
    await this.busy.doWhileShowingBusy(async () => {
      try {
        const localFilters = this.buildFilters();

        // Fetch ALL donor gifts (no pagination)
        const allDonorGifts = await DonorGiftController.findFilteredDonorGifts(
          localFilters,
          undefined,
          undefined,
          this.table.sortColumns
        );

        // Load fundraisers and contact persons for lookup
        const { fundraisers, contactPersons } = await DonorController.getExportLookups();
        const fundraiserMap = new Map(fundraisers.map(f => [f.id, f.name]));
        const contactPersonMap = new Map(contactPersons.map(cp => [cp.id, cp.name]));

        // Load donor contacts (phone + mobile phones + email) for export columns
        const giftsDonorIds = [...new Set(allDonorGifts.map(g => g.donor?.id).filter(id => id))] as string[];
        const giftsContactData = giftsDonorIds.length > 0
          ? await DonorMapController.loadDonorsForExport(giftsDonorIds)
          : [];
        const giftsContactsMap = new Map(giftsContactData.map(d => [d.id, d]));

        await this.excelExportService.export({
          data: allDonorGifts,
          columns: [
            // Donor fields - Hebrew
            { header: this.i18n.currentTerms.title || 'תואר', mapper: (g) => g.donor?.title || '', width: 15 },
            { header: this.i18n.currentTerms.firstName || 'שם פרטי', mapper: (g) => g.donor?.firstName || '', width: 15 },
            { header: this.i18n.currentTerms.lastName || 'שם משפחה', mapper: (g) => g.donor?.lastName || '', width: 15 },
            { header: this.i18n.currentTerms.suffix || 'סיומת', mapper: (g) => g.donor?.suffix || '', width: 10 },
            // Donor fields - English
            { header: this.i18n.currentTerms.titleEnglish || 'Title', mapper: (g) => g.donor?.titleEnglish || '', width: 12 },
            { header: this.i18n.currentTerms.firstNameEnglish || 'First Name', mapper: (g) => g.donor?.firstNameEnglish || '', width: 15 },
            { header: this.i18n.currentTerms.lastNameEnglish || 'Last Name', mapper: (g) => g.donor?.lastNameEnglish || '', width: 15 },
            { header: this.i18n.currentTerms.suffixEnglish || 'Suffix', mapper: (g) => g.donor?.suffixEnglish || '', width: 10 },
            // Fundraiser & Contact Person + donor phone (mobiles preferred via shared helper)
            { header: this.i18n.currentTerms.fundraiser || 'מתרים', mapper: (g) => g.donor?.fundraiserId ? fundraiserMap.get(g.donor.fundraiserId) || '' : '', width: 15 },
            { header: this.i18n.currentTerms.contactPerson || 'איש קשר', mapper: (g) => g.donor?.contactPersonId ? contactPersonMap.get(g.donor.contactPersonId) || '' : '', width: 15 },
            { header: this.i18n.currentTerms.phone || 'טלפון', mapper: (g) => giftsContactsMap.get(g.donor?.id || '')?.phone || '-', width: 20, align: 'left' },
            // Donor characteristics
            { header: this.i18n.currentTerms.maritalStatus || 'מצב משפחתי', mapper: (g) => this.getMaritalStatusText(g.donor?.maritalStatus || ''), width: 12 },
            { header: this.i18n.currentTerms.anash || 'אנ"ש', mapper: (g) => g.donor?.isAnash ? '✓' : '', width: 8 },
            { header: this.i18n.currentTerms.alumni || 'תלמידנו', mapper: (g) => g.donor?.isAlumni ? '✓' : '', width: 8 },
            // Gift fields
            { header: this.i18n.currentTerms.gift || 'מתנה', mapper: (g) => g.gift?.name || '-', width: 20 },
            { header: this.i18n.currentTerms.deliveryDate || 'תאריך מסירה', mapper: (g) => this.formatHebrewDate(g.deliveryDate), width: 15 },
            { header: this.i18n.currentTerms.status || 'סטטוס', mapper: (g) => g.isDelivered ? this.i18n.currentTerms.delivered : this.i18n.currentTerms.pending, width: 12 },
            { header: this.i18n.currentTerms.notes || 'הערות', mapper: (g) => g.notes || '-', width: 30 }
          ],
          sheetName: this.i18n.currentTerms.donorGifts || 'מתנות לתורמים',
          fileName: this.excelExportService.generateFileName(this.i18n.currentTerms.donorGifts || 'מתנות לתורמים')
        });
      } catch (error) {
        console.error('Error exporting donor gifts:', error);
        this.ui.error('שגיאה בייצוא');
      }
    });
  }
}
