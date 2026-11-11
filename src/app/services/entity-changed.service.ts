import { Injectable } from '@angular/core';
import { ClassType } from 'remult';
import { Observable } from 'rxjs';
import { Campaign, Certificate, Donation, Donor, DonorGift, Reminder } from '../../shared/entity';
import { announceEntityChange, entityChanges, entityKeyOf } from '../common/entity-changes';

/**
 * entity-changed.service.ts
 *
 * A one-line event bus: a card that saved something announces it, and any open
 * list that shows that kind of entity refreshes itself - WITHOUT the card
 * having to close first.
 *
 * Why: the client's rule (Zoom 24.08.2026, W13/W16) is that "save" keeps the
 * card open and the list behind it updates immediately. Until now a list only
 * learned about a change from the dialog's close result, so a donor saved in
 * an open card was invisible in the list until the card was closed.
 *
 * This is also the seam for Z17 (automatic refresh between screens after any
 * update) - every list subscribes once, every writer notifies once.
 */
export type ChangedEntity = 'donor' | 'donation' | 'reminder' | 'gift' | 'campaign' | 'certificate';

export interface EntityChange {
  entity: ChangedEntity;
  id?: string;
}

/** השמות הישנים של השירות -> היישות. שלב ג׳ 9.4: הכול עובר בערוץ האחד (common/entity-changes). */
const ENTITY_OF: Record<ChangedEntity, ClassType<any>> = {
  donor: Donor,
  donation: Donation,
  reminder: Reminder,
  gift: DonorGift,
  campaign: Campaign,
  certificate: Certificate
};

@Injectable({ providedIn: 'root' })
export class EntityChangedService {
  /** Announce that an entity was created/updated/deleted. */
  notify(entity: ChangedEntity, _id?: string): void {
    announceEntityChange(entityKeyOf(ENTITY_OF[entity]));
  }

  /** Stream of changes for one entity kind - subscribe in the list component. */
  on(entity: ChangedEntity): Observable<void> {
    return entityChanges([ENTITY_OF[entity]]);
  }
}
