import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { OsmAddressInputComponent } from '../common/osm-address-input/osm-address-input.component';
import { ModernDualDatePickerComponent } from './modern-dual-date-picker/modern-dual-date-picker.component';
import { DualDatePickerComponent } from './dual-date-picker/dual-date-picker.component';
import { NumberWheelGuardDirective } from '../common/directives/number-wheel-guard.directive';
import { PhoneInputComponent } from '../common/phone-input/phone-input.component';

@NgModule({
  declarations: [
    ModernDualDatePickerComponent,
    DualDatePickerComponent,
    NumberWheelGuardDirective,
    PhoneInputComponent,
    OsmAddressInputComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    // app-phone-input משתמש ב-mat-icon לחץ הבוחר.
    MatIconModule,
    // app-osm-address-input - שדה הכתובת של הפלטפורמה (מחשב ומובייל)
    MatAutocompleteModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatTooltipModule
  ],
  exports: [
    ModernDualDatePickerComponent,
    DualDatePickerComponent,
    // סעיף 29 - מיוצא כדי שכל מודול שמייבא את SharedComponentsModule יקבל את
    // ההגנה על שדות מספריים. app.module מייבא אותו היום; mobile.module הוא
    // שורה אחת מכאן ביום שיהיה בו שדה סכום.
    NumberWheelGuardDirective,
    // סעיפים 1, 31 - קונטרול הטלפון של הפלטפורמה.
    PhoneInputComponent,
    // שדה הכתובת - מחשב, ובמובייל טופס תורם חדש
    OsmAddressInputComponent
  ]
})
export class SharedComponentsModule { }