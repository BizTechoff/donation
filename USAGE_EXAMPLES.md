# שימוש בדיאלוג פרטי תורם - DonorDetailsDialog

הדיאלוג זמין כעת מכל מקום בפלטפורמה באמצעות UIToolsService!

## דוגמאות שימוש

### 1. מכל קומפוננטה בפלטפורמה

```typescript
import { UIToolsService } from '../common/UIToolsService';

export class AnyComponent {
  constructor(private ui: UIToolsService) {}

  // תורם חדש
  async addNewDonor() {
    const changed = await this.ui.donorDetailsDialog('new');
    if (changed) {
      // רענון נתונים אם נשמרו שינויים
      await this.refreshData();
    }
  }

  // עריכת תורם קיים
  async editDonor(donorId: string) {
    const changed = await this.ui.donorDetailsDialog(donorId);
    if (changed) {
      await this.refreshData();
    }
  }
}
```

### 2. מקומפוננטת התרומות

```typescript
// donations-list.component.ts
export class DonationsListComponent {
  constructor(private ui: UIToolsService) {}

  // פתיחה מתוך רשימת התרומות
  async viewDonorFromDonation(donation: Donation) {
    if (donation.donor?.id) {
      const changed = await this.ui.donorDetailsDialog(donation.donor.id);
      if (changed) {
        // רענון התרומה בעלת התורם שהשתנה
        await this.loadDonations();
      }
    }
  }
}
```

### 3. מקומפוננטת הדוחות

```typescript
// reports.component.ts
export class ReportsComponent {
  constructor(private ui: UIToolsService) {}

  // צפייה בתורם מתוך דוח
  async viewDonorFromReport(donorId: string) {
    await this.ui.donorDetailsDialog(donorId);
    // אין צורך לרענן כי זה רק צפייה
  }
}
```

### 4. מקומפוננטת המפה

```typescript
// donors-map.component.ts
export class DonorsMapComponent {
  constructor(private ui: UIToolsService) {}

  // לחיצה על סמן במפה
  async onMarkerClick(donorId: string) {
    const changed = await this.ui.donorDetailsDialog(donorId);
    if (changed) {
      // עדכון מיקום התורם במפה
      await this.updateMarkerData(donorId);
    }
  }
}
```

### 5. מקומפוננטת התזכורות

```typescript
// reminders.component.ts
export class RemindersComponent {
  constructor(private ui: UIToolsService) {}

  // פתיחה מתזכורת
  async openDonorFromReminder(donorId: string) {
    const changed = await this.ui.donorDetailsDialog(donorId);
    if (changed) {
      // רענון הרשימה אם התורם השתנה
      await this.loadReminders();
    }
  }
}
```

## יתרונות השיטה החדשה

### 🚀 פשטות מקסימלית
```typescript
// במקום כל הקוד הארוך הזה:
showModal = false;
editingDonor = null;
openModal() { this.showModal = true; }
closeModal() { this.showModal = false; }

// פשוט קו אחד:
const changed = await this.ui.donorDetailsDialog(donorId);
```

### 🔄 מעקב שינויים אוטומטי
```typescript
const changed = await this.ui.donorDetailsDialog('new');
if (changed) {
  // הדיאלוג מחזיר true אם היו שינויים
  donor.reload(); // או כל פעולה אחרת
}
```

### 🎯 שימוש מכל מקום
```typescript
// מקומפוננטת הבית
const changed = await this.ui.donorDetailsDialog('new');

// מקומפוננטת התרומות  
const changed = await this.ui.donorDetailsDialog(donation.donorId);

// מקומפוננטת הדוחות
const changed = await this.ui.donorDetailsDialog(reportItem.donorId);
```

## הערות חשובות

1. **הזרקה**: יש להזריק את `UIToolsService` לקונסטרקטור
2. **טעינה עצלה**: הקומפוננטה נטענת באופן דינמי כשנדרש
3. **ביצועים**: לא מעמיס על הזיכרון כשלא בשימוש
4. **עקביות**: אותו עיצוב ויכולות בכל מקום

## דוגמה מלאה

```typescript
import { Component } from '@angular/core';
import { UIToolsService } from '../common/UIToolsService';
import { Donor } from '../../shared/entity';

@Component({
  selector: 'app-example',
  template: `
    <button (click)="createNewDonor()">תורם חדש</button>
    <button (click)="editDonor('123')" *ngFor="let donor of donors">
      ערוך {{donor.name}}
    </button>
  `
})
export class ExampleComponent {
  donors: Donor[] = [];

  constructor(private ui: UIToolsService) {}

  async createNewDonor() {
    const changed = await this.ui.donorDetailsDialog('new');
    if (changed) {
      console.log('נוצר תורם חדש!');
      await this.loadDonors();
    }
  }

  async editDonor(donorId: string) {
    const changed = await this.ui.donorDetailsDialog(donorId);
    if (changed) {
      console.log('התורם עודכן!');
      await this.loadDonors();
    }
  }

  async loadDonors() {
    // טעינת נתונים...
  }
}
```