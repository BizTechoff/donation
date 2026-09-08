import { Pipe, PipeTransform } from '@angular/core';

/**
 * amount.pipe.ts
 *
 * Z16 - the single place that decides how a money amount is displayed.
 * The client (Zoom 24.08.2026): "אף אחד לא מתחייב על 38.5" - a whole amount
 * shows with no decimals, and the decimal point appears only when the amount
 * really has a fraction. Replaces the scattered uses of number:'1.2-2'.
 *
 * Usage: {{ amount | amount }}   ·   {{ amount | amount:'always' }}
 */
@Pipe({ name: 'amount' })
export class AmountPipe implements PipeTransform {
  transform(value: number | null | undefined, mode: 'auto' | 'always' = 'auto'): string {
    if (value === null || value === undefined || isNaN(value)) return '';

    const hasFraction = Math.abs(value % 1) > 0.004; // tolerate float noise
    const decimals = mode === 'always' || hasFraction ? 2 : 0;

    return value.toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
  }
}
