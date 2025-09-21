import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { SeedController } from '../../../server/SeedController';

@Component({
  selector: 'app-seed-data',
  templateUrl: './seed-data.component.html',
  styleUrls: ['./seed-data.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule
  ]
})
export class SeedDataComponent {
  loading = false;
  results: any = null;

  constructor(private snackBar: MatSnackBar) {}

  async seedCountries() {
    if (!confirm('האם ברצונך לייבא את כל המדינות לבסיס הנתונים?')) {
      return;
    }

    this.loading = true;
    this.results = null;

    try {
      const result = await SeedController.seedCountries();
      this.results = result;

      this.snackBar.open(
        `✅ ייבוא המדינות הושלם! נוצרו: ${result.created}, עודכנו: ${result.updated}, סה"כ: ${result.total}`,
        'סגור',
        {
          duration: 10000,
          horizontalPosition: 'center',
          verticalPosition: 'top',
          panelClass: ['success-snackbar']
        }
      );

      console.log('Seed countries result:', result);
    } catch (error) {
      console.error('Error seeding countries:', error);
      this.snackBar.open(
        '❌ שגיאה בייבוא המדינות. ראה לוג למידע נוסף.',
        'סגור',
        {
          duration: 5000,
          horizontalPosition: 'center',
          verticalPosition: 'top',
          panelClass: ['error-snackbar']
        }
      );
    } finally {
      this.loading = false;
    }
  }

  async seedAllData() {
    if (!confirm('האם ברצונך לייבא את כל הנתונים ההתחלתיים לבסיס הנתונים?')) {
      return;
    }

    this.loading = true;
    this.results = null;

    try {
      const result = await SeedController.seedDatabase();
      this.results = result;  

      this.snackBar.open(
        `✅ ייבוא הנתונים הושלם בהצלחה!`,
        'סגור',
        {
          duration: 10000,
          horizontalPosition: 'center',
          verticalPosition: 'top',
          panelClass: ['success-snackbar']
        }
      );

      console.log('Seed all data result:', result);
    } catch (error) {
      console.error('Error seeding all data:', error);
      this.snackBar.open(
        '❌ שגיאה בייבוא הנתונים. ראה לוג למידע נוסף.',
        'סגור',
        {
          duration: 5000,
          horizontalPosition: 'center',
          verticalPosition: 'top',
          panelClass: ['error-snackbar']
        }
      );
    } finally {
      this.loading = false;
    }
  }
}