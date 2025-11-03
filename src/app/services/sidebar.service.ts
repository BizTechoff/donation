import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SidebarService {
  private fullscreenModeSubject = new BehaviorSubject<boolean>(false);
  fullscreenMode$ = this.fullscreenModeSubject.asObservable();

  private savedSidebarStateSubject = new BehaviorSubject<'open' | 'close' | null>(null);

  constructor() {}

  /**
   * Enter fullscreen mode - will trigger sidebar to close
   */
  enterFullscreen() {
    this.fullscreenModeSubject.next(true);
  }

  /**
   * Exit fullscreen mode - will trigger sidebar to restore previous state
   */
  exitFullscreen() {
    this.fullscreenModeSubject.next(false);
  }

  /**
   * Check if currently in fullscreen mode
   */
  isFullscreen(): boolean {
    return this.fullscreenModeSubject.value;
  }

  /**
   * Save the current sidebar state before entering fullscreen
   */
  saveSidebarState(state: 'open' | 'close') {
    this.savedSidebarStateSubject.next(state);
  }

  /**
   * Get the saved sidebar state
   */
  getSavedSidebarState(): 'open' | 'close' | null {
    return this.savedSidebarStateSubject.value;
  }
}
