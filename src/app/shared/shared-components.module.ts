import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ModernDualDatePickerComponent } from './modern-dual-date-picker/modern-dual-date-picker.component';
import { DualDatePickerComponent } from './dual-date-picker/dual-date-picker.component';
import { NumberWheelGuardDirective } from '../common/directives/number-wheel-guard.directive';

@NgModule({
  declarations: [
    ModernDualDatePickerComponent,
    DualDatePickerComponent,
    NumberWheelGuardDirective
  ],
  imports: [
    CommonModule,
    FormsModule
  ],
  exports: [
    ModernDualDatePickerComponent,
    DualDatePickerComponent,
    // סעיף 29 - מיוצא כדי שכל מודול שמייבא את SharedComponentsModule יקבל את
    // ההגנה על שדות מספריים. app.module מייבא אותו היום; mobile.module הוא
    // שורה אחת מכאן ביום שיהיה בו שדה סכום.
    NumberWheelGuardDirective
  ]
})
export class SharedComponentsModule { }