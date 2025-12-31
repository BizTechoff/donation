import { Injectable } from '@angular/core';

export interface PrintColumn {
  header: string;
  field: string;
  format?: 'text' | 'number' | 'currency' | 'date' | 'custom';
  customFormatter?: (value: any, row: any) => string;
  align?: 'right' | 'left' | 'center';
}

export interface PrintConfig {
  title: string;
  subtitle?: string;
  filters?: { label: string; value: string }[];
  columns: PrintColumn[];
  data: any[];
  totals?: { label: string; value: string | number }[];
  direction?: 'rtl' | 'ltr';
}

@Injectable({
  providedIn: 'root'
})
export class PrintService {

  print(config: PrintConfig) {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('נא לאפשר חלונות קופצים להדפסה');
      return;
    }

    const html = this.generatePrintHtml(config);
    printWindow.document.write(html);
    printWindow.document.close();

    // Wait for content to load then print
    printWindow.onload = () => {
      printWindow.print();
    };
  }

  private generatePrintHtml(config: PrintConfig): string {
    const direction = config.direction || 'rtl';
    const textAlign = direction === 'rtl' ? 'right' : 'left';

    return `
<!DOCTYPE html>
<html dir="${direction}">
<head>
  <meta charset="UTF-8">
  <title>${config.title}</title>
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: 'Segoe UI', Tahoma, Arial, sans-serif;
      font-size: 12px;
      padding: 20px;
      direction: ${direction};
    }

    .print-header {
      text-align: center;
      margin-bottom: 20px;
      padding-bottom: 15px;
      border-bottom: 2px solid #333;
    }

    .print-header h1 {
      font-size: 24px;
      margin-bottom: 5px;
      color: #333;
    }

    .print-header .subtitle {
      font-size: 14px;
      color: #666;
    }

    .print-date {
      font-size: 11px;
      color: #888;
      margin-top: 5px;
    }

    .filters-section {
      margin-bottom: 15px;
      padding: 10px;
      background: #f5f5f5;
      border-radius: 4px;
    }

    .filters-section h3 {
      font-size: 13px;
      margin-bottom: 8px;
      color: #555;
    }

    .filter-item {
      display: inline-block;
      margin-${direction === 'rtl' ? 'left' : 'right'}: 20px;
      font-size: 11px;
    }

    .filter-label {
      font-weight: bold;
      color: #333;
    }

    .filter-value {
      color: #666;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 10px;
    }

    th {
      background: #4a5568;
      color: white;
      padding: 10px 8px;
      text-align: ${textAlign};
      font-weight: 600;
      font-size: 12px;
      border: 1px solid #2d3748;
    }

    td {
      padding: 8px;
      border: 1px solid #e2e8f0;
      text-align: ${textAlign};
      font-size: 11px;
    }

    tr:nth-child(even) {
      background: #f7fafc;
    }

    tr:hover {
      background: #edf2f7;
    }

    .align-left { text-align: left; }
    .align-right { text-align: right; }
    .align-center { text-align: center; }

    .totals-section {
      margin-top: 20px;
      padding: 15px;
      background: #edf2f7;
      border-radius: 4px;
    }

    .totals-section h3 {
      font-size: 14px;
      margin-bottom: 10px;
      color: #333;
    }

    .total-item {
      display: inline-block;
      margin-${direction === 'rtl' ? 'left' : 'right'}: 30px;
      font-size: 13px;
    }

    .total-label {
      font-weight: bold;
    }

    .total-value {
      color: #2b6cb0;
      font-weight: bold;
    }

    .print-footer {
      margin-top: 30px;
      padding-top: 10px;
      border-top: 1px solid #ccc;
      text-align: center;
      font-size: 10px;
      color: #888;
    }

    @media print {
      body {
        padding: 10px;
      }

      .filters-section {
        background: #f5f5f5 !important;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }

      th {
        background: #4a5568 !important;
        color: white !important;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }

      tr:nth-child(even) {
        background: #f7fafc !important;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
    }
  </style>
</head>
<body>
  <div class="print-header">
    <h1>${config.title}</h1>
    ${config.subtitle ? `<div class="subtitle">${config.subtitle}</div>` : ''}
    <div class="print-date">תאריך הדפסה: ${new Date().toLocaleDateString('he-IL')} ${new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}</div>
  </div>

  ${this.generateFiltersHtml(config.filters)}

  <table>
    <thead>
      <tr>
        ${config.columns.map(col => `<th class="align-${col.align || textAlign}">${col.header}</th>`).join('')}
      </tr>
    </thead>
    <tbody>
      ${this.generateRowsHtml(config.columns, config.data, textAlign)}
    </tbody>
  </table>

  ${this.generateTotalsHtml(config.totals)}

  <div class="print-footer">
    סה"כ ${config.data.length} רשומות
  </div>
</body>
</html>`;
  }

  private generateFiltersHtml(filters?: { label: string; value: string }[]): string {
    if (!filters || filters.length === 0) return '';

    const activeFilters = filters.filter(f => f.value && f.value.trim() !== '');
    if (activeFilters.length === 0) return '';

    return `
    <div class="filters-section">
      <h3>פילטרים פעילים:</h3>
      ${activeFilters.map(f => `
        <span class="filter-item">
          <span class="filter-label">${f.label}:</span>
          <span class="filter-value">${f.value}</span>
        </span>
      `).join('')}
    </div>`;
  }

  private generateRowsHtml(columns: PrintColumn[], data: any[], defaultAlign: string): string {
    return data.map(row => `
      <tr>
        ${columns.map(col => {
          const value = this.getCellValue(col, row);
          const align = col.align || defaultAlign;
          return `<td class="align-${align}">${value}</td>`;
        }).join('')}
      </tr>
    `).join('');
  }

  private getCellValue(column: PrintColumn, row: any): string {
    const rawValue = this.getNestedValue(row, column.field);

    if (column.customFormatter) {
      return column.customFormatter(rawValue, row);
    }

    if (rawValue === null || rawValue === undefined) {
      return '-';
    }

    switch (column.format) {
      case 'number':
        return typeof rawValue === 'number' ? rawValue.toLocaleString('he-IL') : rawValue;
      case 'currency':
        return typeof rawValue === 'number' ? `₪${rawValue.toLocaleString('he-IL')}` : rawValue;
      case 'date':
        if (rawValue instanceof Date) {
          return rawValue.toLocaleDateString('he-IL');
        }
        if (typeof rawValue === 'string') {
          return new Date(rawValue).toLocaleDateString('he-IL');
        }
        return rawValue;
      default:
        return String(rawValue);
    }
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  private generateTotalsHtml(totals?: { label: string; value: string | number }[]): string {
    if (!totals || totals.length === 0) return '';

    return `
    <div class="totals-section">
      <h3>סיכום:</h3>
      ${totals.map(t => `
        <span class="total-item">
          <span class="total-label">${t.label}:</span>
          <span class="total-value">${typeof t.value === 'number' ? t.value.toLocaleString('he-IL') : t.value}</span>
        </span>
      `).join('')}
    </div>`;
  }
}
