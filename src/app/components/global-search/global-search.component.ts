import { Component, OnInit, OnDestroy, HostListener, ElementRef } from '@angular/core';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { remult } from 'remult';
import { Donor } from '../../../shared/entity/donor';
import { Donation } from '../../../shared/entity/donation';
import { Campaign } from '../../../shared/entity/campaign';
import { Certificate } from '../../../shared/entity/certificate';
import { Reminder } from '../../../shared/entity/reminder';
import { User } from '../../../shared/entity/user';
import { openDialog } from 'common-ui-elements';
import { DonorDetailsModalComponent } from '../../routes/modals/donor-details-modal/donor-details-modal.component';
import { DonationDetailsModalComponent } from '../../routes/modals/donation-details-modal/donation-details-modal.component';
import { CampaignDetailsModalComponent } from '../../routes/modals/campaign-details-modal/campaign-details-modal.component';
import { CertificateDetailsModalComponent } from '../../routes/modals/certificate-details-modal/certificate-details-modal.component';
import { ReminderDetailsModalComponent } from '../../routes/modals/reminder-details-modal/reminder-details-modal.component';

interface SearchResult {
  type: 'donor' | 'donation' | 'campaign' | 'certificate' | 'reminder';
  id: string;
  title: string;
  subtitle?: string;
  icon: string;
  entity: any;
}

@Component({
  selector: 'app-global-search',
  templateUrl: './global-search.component.html',
  styleUrls: ['./global-search.component.scss']
})
export class GlobalSearchComponent implements OnInit, OnDestroy {
  isVisible = false;
  isMinimized = false;
  searchTerm = '';
  searchResults: SearchResult[] = [];
  isLoading = false;
  selectedIndex = -1;

  // Position
  position = { x: window.innerWidth - 400, y: 100 };
  isDragging = false;
  dragOffset = { x: 0, y: 0 };

  private searchSubject = new Subject<string>();
  private subscription = new Subscription();

  private donorRepo = remult.repo(Donor);
  private donationRepo = remult.repo(Donation);
  private campaignRepo = remult.repo(Campaign);
  private certificateRepo = remult.repo(Certificate);
  private reminderRepo = remult.repo(Reminder);
  private userRepo = remult.repo(User);
  private saveTimeout: any;
  private resizeObserver?: ResizeObserver;

  constructor(private elementRef: ElementRef) { }

  async ngOnInit() {
    // Load saved settings
    await this.loadSettings();

    // Setup debounced search
    this.subscription.add(
      this.searchSubject.pipe(
        debounceTime(300),
        distinctUntilChanged()
      ).subscribe(term => {
        this.performSearch(term);
      })
    );

    // Setup resize observer to detect manual resizing
    this.setupResizeObserver();
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
    // Save settings on destroy
    this.saveSettings();
  }

  // Keyboard shortcuts
  @HostListener('window:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent) {
    // Ctrl+K or Cmd+K or Ctrl+ל (Hebrew) to toggle (case insensitive)
    const key = event.key.toLowerCase();
    if ((event.ctrlKey || event.metaKey) && (key === 'k' || key === 'K' || event.key === 'ל')) {
      event.preventDefault();
      this.toggle();
    }

    // Escape to close (only if search is open and focused)
    if (event.key === 'Escape' && this.isVisible && !this.isMinimized) {
      this.close();
    }

    // Arrow navigation in results
    if (this.isVisible && !this.isMinimized && this.searchResults.length > 0) {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        this.selectedIndex = Math.min(this.selectedIndex + 1, this.searchResults.length - 1);
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        this.selectedIndex = Math.max(this.selectedIndex - 1, -1);
      } else if (event.key === 'Enter' && this.selectedIndex >= 0) {
        event.preventDefault();
        this.openResult(this.searchResults[this.selectedIndex]);
      }
    }
  }

  toggle() {
    if (this.isVisible) {
      this.isMinimized = !this.isMinimized;
    } else {
      this.isVisible = true;
      this.isMinimized = false;
      // Focus search input after a short delay
      setTimeout(() => {
        const input = document.querySelector('.global-search-input') as HTMLInputElement;
        if (input) input.focus();
      }, 100);
    }
  }

  close() {
    this.isVisible = false;
    this.isMinimized = false;
    this.searchTerm = '';
    this.searchResults = [];
    this.selectedIndex = -1;
    this.saveSettings(); // Save on close
  }

  onSearchChange(term: string) {
    this.searchTerm = term;
    this.selectedIndex = -1;
    if (term.trim().length < 2) {
      this.searchResults = [];
      return;
    }
    this.searchSubject.next(term);
  }

  async performSearch(term: string) {
    this.isLoading = true;
    this.searchResults = [];

    try {
      const trimmedTerm = term.trim().toLowerCase();

      // Search in parallel
      const [donors, donations, campaigns, certificates, reminders] = await Promise.all([
        this.searchDonors(trimmedTerm),
        this.searchDonations(trimmedTerm),
        this.searchCampaigns(trimmedTerm),
        this.searchCertificates(trimmedTerm),
        this.searchReminders(trimmedTerm)
      ]);

      // Combine and limit results
      this.searchResults = [
        ...donors.slice(0, 3),
        ...donations.slice(0, 3),
        ...campaigns.slice(0, 3),
        ...certificates.slice(0, 2),
        ...reminders.slice(0, 2)
      ];

    } catch (error) {
      console.error('Search error:', error);
    } finally {
      this.isLoading = false;
    }
  }

  private async searchDonors(term: string): Promise<SearchResult[]> {
    const donors = await this.donorRepo.find({
      where: {
        $or: [
          { firstName: { $contains: term } },
          { lastName: { $contains: term } },
          { fullName: { $contains: term } }
        ]
      },
      limit: 5
    });

    return donors.map(donor => ({
      type: 'donor' as const,
      id: donor.id,
      title: donor.fullName || `${donor.firstName} ${donor.lastName}`,
      subtitle: '', // No email/phone shown in subtitle for privacy
      icon: 'person',
      entity: donor
    }));
  }

  private async searchDonations(term: string): Promise<SearchResult[]> {
    // Try to parse as number for amount search
    const amountSearch = parseFloat(term);
    const isNumber = !isNaN(amountSearch);

    // Search donations - need to get more since we filter by related entities
    const donations = await this.donationRepo.find({
      where: isNumber ? { amount: amountSearch } : undefined,
      include: { donor: true, campaign: true },
      limit: 20 // Get more since we'll filter by donor/campaign name
    });

    // Filter by donor name or campaign name if not a number
    const filtered = isNumber ? donations : donations.filter(d => {
      const donorName = d.donor?.fullName || '';
      const campaignName = d.campaign?.name || '';
      return donorName.toLowerCase().includes(term) ||
             campaignName.toLowerCase().includes(term);
    });

    return filtered.slice(0, 5).map(donation => ({
      type: 'donation' as const,
      id: donation.id!,
      title: `תרומה - ${donation.amount} ${donation.currency}`,
      subtitle: `${donation.donor?.fullName || ''} ${donation.campaign?.name ? '• ' + donation.campaign.name : ''}`,
      icon: 'payments',
      entity: donation
    }));
  }

  private async searchCampaigns(term: string): Promise<SearchResult[]> {
    const campaigns = await this.campaignRepo.find({
      where: {
        name: { $contains: term }
      },
      limit: 5
    });

    return campaigns.map(campaign => ({
      type: 'campaign' as const,
      id: campaign.id,
      title: campaign.name,
      subtitle: campaign.description || '',
      icon: 'campaign',
      entity: campaign
    }));
  }

  private async searchCertificates(term: string): Promise<SearchResult[]> {
    const certificates = await this.certificateRepo.find({
      where: {
        $or: [
          { recipientName: { $contains: term } },
          { eventName: { $contains: term } }
        ]
      },
      include: { donor: true },
      limit: 5
    });

    return certificates.map(cert => ({
      type: 'certificate' as const,
      id: cert.id!,
      title: `תעודה - ${cert.recipientName || cert.eventName}`,
      subtitle: cert.donor?.fullName || '',
      icon: 'description',
      entity: cert
    }));
  }

  private async searchReminders(term: string): Promise<SearchResult[]> {
    const reminders = await this.reminderRepo.find({
      where: {
        $or: [
          { title: { $contains: term } },
          { description: { $contains: term } }
        ]
      },
      include: { donor: true },
      limit: 5
    });

    return reminders.map(reminder => ({
      type: 'reminder' as const,
      id: reminder.id!,
      title: `תזכורת - ${reminder.title || reminder.donor?.fullName || ''}`,
      subtitle: reminder.description || '',
      icon: 'notifications',
      entity: reminder
    }));
  }

  openResult(result: SearchResult) {
    switch (result.type) {
      case 'donor':
        openDialog(DonorDetailsModalComponent, (dlg) => {
          dlg.args = { donorId: result.id };
        });
        break;
      case 'donation':
        openDialog(DonationDetailsModalComponent, (dlg) => {
          dlg.args = { donationId: result.id };
        });
        break;
      case 'campaign':
        openDialog(CampaignDetailsModalComponent, (dlg) => {
          dlg.args = { campaignId: result.id };
        });
        break;
      case 'certificate':
        openDialog(CertificateDetailsModalComponent, (dlg) => {
          dlg.args = { certificateId: result.id };
        });
        break;
      case 'reminder':
        openDialog(ReminderDetailsModalComponent, (dlg) => {
          dlg.args = { reminderId: result.id };
        });
        break;
    }
  }

  // Dragging functionality
  onMouseDown(event: MouseEvent) {
    if ((event.target as HTMLElement).closest('.search-header')) {
      this.isDragging = true;
      this.dragOffset = {
        x: event.clientX - this.position.x,
        y: event.clientY - this.position.y
      };
    }
  }

  @HostListener('window:mousemove', ['$event'])
  onMouseMove(event: MouseEvent) {
    if (this.isDragging) {
      this.updatePosition(
        event.clientX - this.dragOffset.x,
        event.clientY - this.dragOffset.y
      );
    }
  }

  @HostListener('window:mouseup')
  onMouseUp() {
    if (this.isDragging) {
      this.isDragging = false;
      this.saveSettings(); // Save after dragging
    }
  }

  getTypeIcon(type: string): string {
    const icons: { [key: string]: string } = {
      donor: 'person',
      donation: 'payments',
      campaign: 'campaign',
      certificate: 'description',
      reminder: 'notifications'
    };
    return icons[type] || 'search';
  }

  getTypeLabel(type: string): string {
    const labels: { [key: string]: string } = {
      donor: 'תורם',
      donation: 'תרומה',
      campaign: 'קמפיין',
      certificate: 'תעודה',
      reminder: 'תזכורת'
    };
    return labels[type] || '';
  }

  // Load settings from user preferences
  private async loadSettings() {
    try {
      const userId = remult.user?.id;
      if (!userId) return;

      const user = await this.userRepo.findId(userId);
      const settings = user?.settings?.globalSearch;

      if (settings) {
        if (settings.x !== undefined && settings.y !== undefined) {
          this.position = { x: settings.x, y: settings.y };
        }
        if (settings.minimized !== undefined) {
          this.isMinimized = settings.minimized;
        }
        // Width and height will be applied via CSS if saved
        if (settings.width && settings.height) {
          setTimeout(() => {
            const element = this.elementRef.nativeElement.querySelector('.search-window');
            if (element) {
              element.style.width = `${settings.width}px`;
              element.style.height = `${settings.height}px`;
            }
          }, 100);
        }
      }
    } catch (error) {
      console.error('Failed to load global search settings:', error);
    }
  }

  // Save settings to user preferences (debounced)
  private debouncedSave() {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
    this.saveTimeout = setTimeout(() => {
      this.saveSettings();
    }, 1000); // Save after 1 second of no changes
  }

  private async saveSettings() {
    try {
      const userId = remult.user?.id;
      if (!userId) return;

      const user = await this.userRepo.findId(userId);
      if (!user) return;

      // Get current dimensions from the element
      const element = this.elementRef.nativeElement.querySelector('.search-window');
      const width = element ? element.offsetWidth : 480;
      const height = element ? element.offsetHeight : undefined;

      if (!user.settings) {
        user.settings = {
          openModal: 'dialog',
          calendar_heb_holidays_jews_enabled: true,
          calendar_open_heb_and_eng_parallel: false
        };
      }

      user.settings.globalSearch = {
        x: this.position.x,
        y: this.position.y,
        width: width,
        height: height,
        minimized: this.isMinimized
      };

      await this.userRepo.save(user);
    } catch (error) {
      console.error('Failed to save global search settings:', error);
    }
  }

  // Override position change to trigger save
  private updatePosition(x: number, y: number) {
    this.position = { x, y };
    this.debouncedSave();
  }

  // Override minimize/maximize to trigger save
  minimize() {
    this.isMinimized = true;
    this.saveSettings(); // Save immediately on minimize
  }

  maximize() {
    this.isMinimized = false;
    setTimeout(() => {
      const input = document.querySelector('.global-search-input') as HTMLInputElement;
      if (input) input.focus();
    }, 100);
    this.saveSettings(); // Save immediately on maximize
  }

  // Setup resize observer for manual window resizing
  private setupResizeObserver() {
    setTimeout(() => {
      const element = this.elementRef.nativeElement.querySelector('.search-window');
      if (element && 'ResizeObserver' in window) {
        this.resizeObserver = new ResizeObserver(() => {
          this.debouncedSave();
        });
        this.resizeObserver.observe(element);
      }
    }, 100);
  }
}
