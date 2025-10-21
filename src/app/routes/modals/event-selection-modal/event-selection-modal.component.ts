import { Component, OnInit } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { DialogConfig } from 'common-ui-elements';
import { Event } from '../../../../shared/entity';
import { remult } from 'remult';
import { I18nService } from '../../../i18n/i18n.service';

export interface EventSelectionModalArgs {
  availableEvents: Event[];
  title?: string;
}

@DialogConfig({
  hasBackdrop: true
})
@Component({
  selector: 'app-event-selection-modal',
  templateUrl: './event-selection-modal.component.html',
  styleUrls: ['./event-selection-modal.component.scss']
})
export class EventSelectionModalComponent implements OnInit {
  args!: EventSelectionModalArgs;
  selectedEvent: Event | null = null;

  // Events system
  availableEvents: Event[] = [];
  eventRepo = remult.repo(Event);

  // Search and creation
  eventSearchTerm = '';
  showCreateNewEvent = false;
  newEventDescription = '';

  constructor(
    public i18n: I18nService,
    public dialogRef: MatDialogRef<any>
  ) {}

  async ngOnInit() {
    this.availableEvents = this.args.availableEvents || [];
  }

  // Filter events based on search term
  getFilteredEvents(): Event[] {
    if (!this.eventSearchTerm.trim()) {
      return this.availableEvents;
    }

    return this.availableEvents.filter(event =>
      event.description.toLowerCase().includes(this.eventSearchTerm.toLowerCase())
    );
  }

  // Select event and close dialog immediately
  selectEvent(event: Event) {
    this.selectedEvent = event;
    // Use setTimeout to ensure the dialog closes after the selection is processed
    setTimeout(() => {
      this.dialogRef.close(event);
    }, 100);
  }

  // Create a new event and save to database
  async createNewEvent() {
    if (!this.newEventDescription.trim()) {
      alert('יש להזין תיאור לאירוע החדש');
      return;
    }

    try {
      const newEvent = this.eventRepo.create({
        description: this.newEventDescription.trim(),
        type: 'personal',
        isRequired: false,
        isActive: true,
        sortOrder: 999,
        category: 'אישי'
      });

      await newEvent.save();

      // Add to available events list
      this.availableEvents.push(newEvent);

      // Reset form
      this.newEventDescription = '';
      this.showCreateNewEvent = false;

      // Select the new event
      this.selectEvent(newEvent);

    } catch (error) {
      console.error('Error creating new event:', error);
      alert('שגיאה ביצירת האירוע החדש');
    }
  }

  // Toggle create new event form
  toggleCreateNewEvent() {
    this.showCreateNewEvent = !this.showCreateNewEvent;
    if (this.showCreateNewEvent) {
      this.newEventDescription = '';
    }
  }

  // Clear search
  clearSearch() {
    this.eventSearchTerm = '';
  }

  // Close dialog without selection
  closeDialog() {
    this.dialogRef.close(null);
  }

  getEventCategories(): string[] {
    const categories = new Set<string>();
    this.getFilteredEvents().forEach(event => {
      categories.add(event.category || 'אחר');
    });
    return Array.from(categories).sort();
  }

  getEventsByCategory(category: string): Event[] {
    return this.getFilteredEvents().filter(event =>
      (event.category || 'אחר') === category
    );
  }
}