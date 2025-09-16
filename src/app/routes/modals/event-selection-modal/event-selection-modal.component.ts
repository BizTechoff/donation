import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Event } from '../../../../shared/entity';
import { remult } from 'remult';
import { I18nService } from '../../../i18n/i18n.service';

export interface EventSelectionModalArgs {
  availableEvents: Event[];
  title?: string;
}

@Component({
  selector: 'app-event-selection-modal',
  templateUrl: './event-selection-modal.component.html',
  styleUrls: ['./event-selection-modal.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule
  ]
})
export class EventSelectionModalComponent implements OnInit {
  args!: EventSelectionModalArgs;
  selectedEvent: Event | null = null;
  changed = false;

  // Events system
  availableEvents: Event[] = [];
  eventRepo = remult.repo(Event);

  // Search and creation
  eventSearchTerm = '';
  showCreateNewEvent = false;
  newEventDescription = '';

  constructor(public i18n: I18nService) {}

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

  // Select event and close dialog
  selectEvent(event: Event) {
    this.selectedEvent = event;
    this.changed = true;
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

  // Cancel dialog
  cancel() {
    this.selectedEvent = null;
    this.changed = false;
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