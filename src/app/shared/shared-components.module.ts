import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ModernDualDatePickerComponent } from './modern-dual-date-picker/modern-dual-date-picker.component';
import { DualDatePickerComponent } from './dual-date-picker/dual-date-picker.component';

@NgModule({
  declarations: [
    ModernDualDatePickerComponent,
    DualDatePickerComponent
  ],
  imports: [
    CommonModule,
    FormsModule
  ],
  exports: [
    ModernDualDatePickerComponent,
    DualDatePickerComponent
  ]
})
export class SharedComponentsModule { }