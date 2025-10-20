import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Letter } from '../../../../shared/enum/letter';
import { LetterService } from '../../../services/letter.service';
import { UIToolsService } from '../../../common/UIToolsService';

export interface LetterPropertiesModalArgs {
  donationId: string;
}

export interface LetterPropertiesResult {
  selectedType: Letter;
  prefix: string[];
  suffix: string[];
}

@Component({
  selector: 'app-letter-properties-modal',
  templateUrl: './letter-properties-modal.component.html',
  styleUrls: ['./letter-properties-modal.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule
  ]
})
export class LetterPropertiesModalComponent implements OnInit {
  args!: LetterPropertiesModalArgs;

  // Available letter types
  letterTypes: Letter[] = [];
  selectedLetterType?: Letter;

  // Prefix options (opening lines)
  availablePrefixLines: string[] = [
    'כבוד ידידנו הנדיב הנכבד, אוהב תורה ורודף חסד'
  ];
  selectedPrefixLines: string[] = [];
  customPrefixLine = '';

  // Suffix options (closing lines)
  availableSuffixLines: string[] = [
    'א כשר און א פרייליכען פסח',
    'א פרייליכען יום טוב',
    'בברכת גמר חתימה טובה',
    'בברכת הצלחה רבה וכט"ס',
    'בברכת כתיבה וחתימה טובה',
    'ביקרא דאורייתא וכט"ס'
  ];
  selectedSuffixLines: string[] = [];
  customSuffixLine = '';

  loading = false;

  constructor(
    private letterService: LetterService,
    private ui: UIToolsService,
    public dialogRef: MatDialogRef<LetterPropertiesModalComponent>
  ) {}

  async ngOnInit() {
    this.loadLetterTypes();
  }

  loadLetterTypes() {
    this.letterTypes = Letter.getFields();
    // Select first type by default
    if (this.letterTypes.length > 0) {
      this.selectedLetterType = this.letterTypes[0];
    }
  }

  selectLetterType(type: Letter) {
    this.selectedLetterType = type;
  }

  // Prefix management
  addPrefixLine(line: string) {
    if (line && !this.selectedPrefixLines.includes(line)) {
      this.selectedPrefixLines.push(line);
    }
  }

  addCustomPrefixLine() {
    if (this.customPrefixLine.trim()) {
      this.addPrefixLine(this.customPrefixLine.trim());
      this.customPrefixLine = '';
    }
  }

  removePrefixLine(index: number) {
    this.selectedPrefixLines.splice(index, 1);
  }

  movePrefixLineUp(index: number) {
    if (index > 0) {
      const temp = this.selectedPrefixLines[index];
      this.selectedPrefixLines[index] = this.selectedPrefixLines[index - 1];
      this.selectedPrefixLines[index - 1] = temp;
    }
  }

  movePrefixLineDown(index: number) {
    if (index < this.selectedPrefixLines.length - 1) {
      const temp = this.selectedPrefixLines[index];
      this.selectedPrefixLines[index] = this.selectedPrefixLines[index + 1];
      this.selectedPrefixLines[index + 1] = temp;
    }
  }

  // Suffix management
  addSuffixLine(line: string) {
    if (line && !this.selectedSuffixLines.includes(line)) {
      this.selectedSuffixLines.push(line);
    }
  }

  addCustomSuffixLine() {
    if (this.customSuffixLine.trim()) {
      this.addSuffixLine(this.customSuffixLine.trim());
      this.customSuffixLine = '';
    }
  }

  removeSuffixLine(index: number) {
    this.selectedSuffixLines.splice(index, 1);
  }

  moveSuffixLineUp(index: number) {
    if (index > 0) {
      const temp = this.selectedSuffixLines[index];
      this.selectedSuffixLines[index] = this.selectedSuffixLines[index - 1];
      this.selectedSuffixLines[index - 1] = temp;
    }
  }

  moveSuffixLineDown(index: number) {
    if (index < this.selectedSuffixLines.length - 1) {
      const temp = this.selectedSuffixLines[index];
      this.selectedSuffixLines[index] = this.selectedSuffixLines[index + 1];
      this.selectedSuffixLines[index + 1] = temp;
    }
  }

  async generateLetter() {
    if (!this.selectedLetterType) {
      this.ui.error('נא לבחור סוג מכתב');
      return;
    }

    if (!this.args?.donationId) {
      this.ui.error('חסר מזהה תרומה');
      return;
    }

    try {
      this.loading = true;

      const response = await this.letterService.createLetter(
        this.args.donationId,
        this.selectedLetterType,
        this.selectedPrefixLines,
        this.selectedSuffixLines
      );

      if (response.success) {
        this.ui.info('מכתב הופק והורד בהצלחה');
        this.dialogRef.close({
          selectedType: this.selectedLetterType,
          prefix: this.selectedPrefixLines,
          suffix: this.selectedSuffixLines
        } as LetterPropertiesResult);
      } else {
        this.ui.error('שגיאה בהפקת המכתב: ' + response.error);
      }
    } catch (error) {
      console.error('Error generating letter:', error);
      this.ui.error('שגיאה בהפקת המכתב');
    } finally {
      this.loading = false;
    }
  }

  closeModal() {
    this.dialogRef.close(null);
  }
}
