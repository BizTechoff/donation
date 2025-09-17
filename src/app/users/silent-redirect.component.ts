// silent-redirect.component.ts

import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { remult } from 'remult';
import { I18nService } from '../i18n';

@Component({
  template: '' // אין צורך בתצוגה
})
export class SilentRedirectComponent implements OnInit {
  constructor(private router: Router, private route: ActivatedRoute, public i18n: I18nService) { }

  ngOnInit(): void {
    // בדוק אם המשתמש מחובר
    if (remult.user) {
      console.log('routeTo: ' + this.i18n.currentTerms.donorList  )
      // משתמש מחובר - הפנה לרשימת תורמים
      this.router.navigate([`/${this.i18n.currentTerms.donorList}`]);
    } else {
      console.log('routeTo: HOME'  )
      // משתמש לא מחובר - הפנה לדף הבית
      this.router.navigate([`/${this.i18n.currentTerms.home}`]);
    }
  }
}
