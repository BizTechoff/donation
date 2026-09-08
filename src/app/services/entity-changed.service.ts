import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { filter } from 'rxjs/operators';

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

@Injectable({ providedIn: 'root' })
export class EntityChangedService {
  private readonly changes = new Subject<EntityChange>();

  /** Announce that an entity was created/updated/deleted. */
  notify(entity: ChangedEntity, id?: string): void {
    this.changes.next({ entity, id });
  }

  /** Stream of changes for one entity kind - subscribe in the list component. */
  on(entity: ChangedEntity): Observable<EntityChange> {
    return this.changes.asObservable().pipe(filter(c => c.entity === entity));
  }
}
