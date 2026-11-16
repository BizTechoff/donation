import { Component } from '@angular/core';
import { AppVersionService } from '../../services/app-version.service';

/**
 * פס "גרסה חדשה של המערכת זמינה" - אחד, למחשב ולמובייל. עד היום הוא היה רק
 * ב-layout של המחשב, ולכן במובייל (/m) גרסה חדשה לא הודיעה על עצמה.
 * הבדיקה עצמה - AppVersionService.
 */
@Component({
  selector: 'app-new-version-bar',
  templateUrl: './new-version-bar.component.html',
  styleUrls: ['./new-version-bar.component.scss']
})
export class NewVersionBarComponent {
  constructor(public appVersion: AppVersionService) { }
}
