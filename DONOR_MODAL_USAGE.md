# DonorDetailsModal Component Usage Guide

הקומפוננטה `DonorDetailsModalComponent` היא קומפוננטה מודולרית ועצמאית לניהול פרטי תורמים שניתן לקרוא לה מכל מקום בפלטפורמה.

## מיקום
```
src/app/routes/modals/donor-details-modal/
```

## ממשק (Interface)

### קלט (Input Parameters)
- `donorId: string` - קוד התורם או 'new' לתורם חדש
- `returnUrl: string` - URL לחזור אליו (ברירת מחדל: '/donor-list')
- `isVisible: boolean` - האם המודל נראה

### פלט (Output Events)
- `onResult: DonorDetailsModalResult` - מחזיר תוצאה עם מידע האם השתנה
- `onCancel: void` - אירוע ביטול

### DonorDetailsModalResult Interface
```typescript
{
  changed: boolean;      // האם היו שינויים
  donor?: Donor;         // אובייקט התורם
  action?: 'saved' | 'deleted' | 'cancelled'; // פעולה שבוצעה
}
```

## דוגמאות שימוש

### 1. שימוש בתוך קומפוננטה אחרת (כמו donor-list)

#### TypeScript:
```typescript
import { DonorDetailsModalResult } from '../../routes/modals/donor-details-modal/donor-details-modal.component';

export class SomeComponent {
  showDonorModal = false;
  currentDonorId?: string;
  returnUrl = '/current-page';

  // פתיחת מודל לתורם חדש
  createNewDonor() {
    this.currentDonorId = 'new';
    this.showDonorModal = true;
  }

  // פתיחת מודל לתורם קיים
  editDonor(donorId: string) {
    this.currentDonorId = donorId;
    this.showDonorModal = true;
  }

  // טיפול בתוצאה
  onDonorResult(result: DonorDetailsModalResult) {
    if (result.changed) {
      console.log('Donor changed:', result.donor);
      // רענון רשימה או עדכון UI
      this.refreshData();
    }
    this.closeModal();
  }

  closeModal() {
    this.showDonorModal = false;
    this.currentDonorId = undefined;
  }
}
```

#### HTML:
```html
<button (click)="createNewDonor()">תורם חדש</button>
<button (click)="editDonor('donor123')">ערוך תורם</button>

<app-donor-details-modal
  [donorId]="currentDonorId"
  [returnUrl]="returnUrl"
  [isVisible]="showDonorModal"
  (onResult)="onDonorResult($event)"
  (onCancel)="closeModal()">
</app-donor-details-modal>
```

### 2. שימוש מתוך קומפוננטה אחרת עם navigation

```typescript
// במקום מודל, ניתן לנווט לדף עצמאי
navigateToDonorDetails(donorId: string) {
  // זה יעבוד כאשר הקומפוננטה תהיה זמינה כראוט עצמאי
  this.router.navigate(['/donor-modal', donorId], { 
    queryParams: { returnUrl: this.router.url }
  });
}
```

### 3. תרחישי שימוש שונים

```typescript
// תורם חדש מהדף הראשי
openNewDonorFromHomePage() {
  this.currentDonorId = 'new';
  this.returnUrl = '/home';
  this.showDonorModal = true;
}

// עריכת תורם מדף תרומות
editDonorFromDonations(donorId: string) {
  this.currentDonorId = donorId;
  this.returnUrl = '/donations-list';
  this.showDonorModal = true;
}

// צפייה בתורם מדף דוחות
viewDonorFromReports(donorId: string) {
  this.currentDonorId = donorId;
  this.returnUrl = '/reports';
  this.showDonorModal = true;
}
```

## יתרונות הגישה המודולרית

1. **עצמאי** - הקומפוננטה טוענת את הנתונים בעצמה על בסיס donorId
2. **גמיש** - ניתן לפתוח מכל מקום עם returnUrl מותאם
3. **מעקב שינויים** - מחזיר בדיוק מה השתנה
4. **ניתוק תלות** - לא תלוי בקומפוננטה האב לטעינת נתונים
5. **עיצוב אחיד** - אותו עיצוב בכל מקום שמשתמשים בו

## הערות חשובות

- הקומפוננטה כבר רשומה ב-`app.module.ts`
- תומך בכל תכונות i18n (עברית/אנגלית)
- כולל validation ו-loading states
- מטפל בשגיאות בצורה אחידה
- שומר על עקביות עיצוב עם שאר המערכת