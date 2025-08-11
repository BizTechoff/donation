// silent-redirect.component.ts

import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { remult } from 'remult';

@Component({
  template: '' // אין צורך בתצוגה
})
export class SilentRedirectComponent implements OnInit {
  constructor(private router: Router, private route: ActivatedRoute) {}

  ngOnInit(): void {
    // בדוק אם המשתמש מחובר
    if (remult.user) {
      // משתמש מחובר - הפנה לרשימת תורמים
      this.router.navigate(['/רשימת תורמים']);
    } else {
      // משתמש לא מחובר - הפנה לדף הבית
      this.router.navigate(['/דף הבית']);
    }
  }
}
