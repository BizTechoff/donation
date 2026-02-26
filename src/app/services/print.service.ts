import { Injectable } from '@angular/core';

export interface PrintColumn {
  header: string;
  field: string;
  format?: 'text' | 'number' | 'currency' | 'date' | 'custom';
  customFormatter?: (value: any, row: any) => string;
  align?: 'right' | 'left' | 'center';
}

export interface SubRowConfig {
  enabled: boolean;
  dataField: string; // Field name that contains sub-rows array
  columns: PrintColumn[]; // Columns for sub-table
  groupByField?: string; // Optional field to group sub-rows (e.g., 'hebrewYear')
  groupByValues?: string[]; // Values to group by (e.g., ['תשפ"ה', 'תשפ"ד'])
}

export interface PrintConfig {
  title: string;
  subtitle?: string;
  filters?: { label: string; value: string }[];
  columns: PrintColumn[];
  data: any[];
  totals?: { label: string; value: string | number }[];
  direction?: 'rtl' | 'ltr';
  subRows?: SubRowConfig; // Configuration for sub-rows (donation details)
}

export interface LabelData {
  donorName: string;
  addressLines: string[];
}

export interface DonationPrintData {
  donorName: string;
  donorNameEnglish: string;
  amount: string;
  hebrewDate: string;
  donationType: string;
  method: string;
  campaign: string;
  checkNumber: string;
  reason: string;
  notes: string;
  scans: { url: string; tagPosition: string }[];
}

@Injectable({
  providedIn: 'root'
})
export class PrintService {
  private printFrame: HTMLIFrameElement | null = null;

  print(config: PrintConfig) {
    this.printHtml(this.generatePrintHtml(config));
  }

  printLabels(donors: LabelData[]) {
    if (!donors.length) return;
    this.printHtml(this.generateLabelsHtml(donors));
  }

  printDonations(donations: DonationPrintData[], printDetails = true, printScans = false) {
    if (!donations.length) return;
    const pages = donations.map(d => this.generateDonationPageHtml(d, printDetails, printScans)).filter(p => p).join('');
    this.printHtml(`<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
  <meta charset="UTF-8">
  <title>הדפסת תרומות</title>
  <style>${this.getDonationPrintCss()}</style>
</head>
<body>${pages}</body>
</html>`);
  }

  printEnvelopes(donors: LabelData[]) {
    if (!donors.length) return;
    this.printHtml(this.generateEnvelopesHtml(donors));
  }

  private printHtml(html: string) {
    // Remove existing iframe if any
    if (this.printFrame) {
      document.body.removeChild(this.printFrame);
    }

    // Create hidden iframe
    this.printFrame = document.createElement('iframe');
    this.printFrame.style.position = 'absolute';
    this.printFrame.style.top = '-10000px';
    this.printFrame.style.left = '-10000px';
    this.printFrame.style.width = '0';
    this.printFrame.style.height = '0';
    this.printFrame.style.border = 'none';

    document.body.appendChild(this.printFrame);

    const frameDoc = this.printFrame.contentDocument || this.printFrame.contentWindow?.document;
    if (!frameDoc) {
      alert('שגיאה ביצירת חלון הדפסה');
      return;
    }

    frameDoc.open();
    frameDoc.write(html);
    frameDoc.close();

    const iframe = this.printFrame;

    // Wait for content to load, then wait for images before printing
    iframe.onload = () => {
      const iDoc = iframe.contentDocument || iframe.contentWindow?.document;
      const images = iDoc?.querySelectorAll('img') || [];
      if (images.length === 0) {
        setTimeout(() => iframe.contentWindow?.print(), 100);
        return;
      }
      let loaded = 0;
      const tryPrint = () => {
        loaded++;
        if (loaded >= images.length) {
          setTimeout(() => iframe.contentWindow?.print(), 300);
        }
      };
      images.forEach(img => {
        if (img.complete) tryPrint();
        else { img.onload = tryPrint; img.onerror = tryPrint; }
      });
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

    /* Sub-table styles */
    .sub-row-container {
      background: #f8f9fc !important;
    }

    .sub-row-cell {
      padding: 8px 16px 12px 32px !important;
      border: none !important;
      border-right: 3px solid #667eea !important;
    }

    .sub-table {
      width: 100%;
      border-collapse: collapse;
      background: white;
      box-shadow: 0 1px 4px rgba(0,0,0,0.08);
      margin: 0;
    }

    .sub-table thead th {
      background: #667eea !important;
      color: white;
      padding: 6px 10px;
      font-size: 10px;
      font-weight: 600;
      text-align: ${textAlign};
    }

    .sub-table tbody td {
      padding: 5px 10px;
      font-size: 10px;
      border-bottom: 1px solid #eee;
      text-align: ${textAlign};
    }

    .sub-table tbody tr:last-child td {
      border-bottom: none;
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

      .sub-row-container {
        background: #f8f9fc !important;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }

      .sub-row-cell {
        border-right: 3px solid #667eea !important;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }

      .sub-table thead th {
        background: #667eea !important;
        color: white !important;
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
      ${this.generateRowsHtml(config.columns, config.data, textAlign, config.subRows)}
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

  private generateRowsHtml(columns: PrintColumn[], data: any[], defaultAlign: string, subRowConfig?: SubRowConfig): string {
    return data.map(row => {
      // Main row
      let html = `
      <tr class="main-row">
        ${columns.map(col => {
          const value = this.getCellValue(col, row);
          const align = col.align || defaultAlign;
          return `<td class="align-${align}">${value}</td>`;
        }).join('')}
      </tr>`;

      // Sub-rows if enabled
      if (subRowConfig?.enabled) {
        const subData = row[subRowConfig.dataField];
        if (subData && Array.isArray(subData) && subData.length > 0) {
          const colSpan = columns.length;

          // Group sub-rows by year if configured
          if (subRowConfig.groupByField && subRowConfig.groupByValues) {
            html += `
            <tr class="sub-row-container">
              <td colspan="${colSpan}" class="sub-row-cell">
                <table class="sub-table">
                  <thead>
                    <tr>
                      ${subRowConfig.columns.map(col => `<th>${col.header}</th>`).join('')}
                    </tr>
                  </thead>
                  <tbody>`;

            for (const groupValue of subRowConfig.groupByValues) {
              const groupedItems = subData.filter((item: any) => item[subRowConfig.groupByField!] === groupValue);
              for (const subRow of groupedItems) {
                html += `
                    <tr>
                      ${subRowConfig.columns.map(col => {
                        const value = this.getCellValue(col, subRow);
                        return `<td>${value}</td>`;
                      }).join('')}
                    </tr>`;
              }
            }

            html += `
                  </tbody>
                </table>
              </td>
            </tr>`;
          } else {
            // No grouping - just show all sub-rows
            html += `
            <tr class="sub-row-container">
              <td colspan="${colSpan}" class="sub-row-cell">
                <table class="sub-table">
                  <thead>
                    <tr>
                      ${subRowConfig.columns.map(col => `<th>${col.header}</th>`).join('')}
                    </tr>
                  </thead>
                  <tbody>
                    ${subData.map((subRow: any) => `
                    <tr>
                      ${subRowConfig.columns.map(col => {
                        const value = this.getCellValue(col, subRow);
                        return `<td>${value}</td>`;
                      }).join('')}
                    </tr>
                    `).join('')}
                  </tbody>
                </table>
              </td>
            </tr>`;
          }
        }
      }

      return html;
    }).join('');
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

  /**
   * Shared CSS for donation detail + scan printing.
   * Used by both single donation modal and batch donation printing.
   */
  getDonationPrintCss(): string {
    return `
    @media print {
      @page { size: A4; margin: 10mm; }
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: 'Segoe UI', Tahoma, Arial, sans-serif;
      direction: rtl;
      font-size: 14px;
      line-height: 1.5;
    }

    .donation-page {
      page-break-after: always;
    }

    .donation-page:last-child {
      page-break-after: auto;
    }

    .header {
      text-align: center;
      margin-bottom: 20px;
      border-bottom: 2px solid #333;
      padding-bottom: 10px;
    }

    .header h1 { font-size: 22px; margin-bottom: 3px; }

    .section { margin-bottom: 15px; }

    .section-title {
      font-size: 16px;
      font-weight: bold;
      margin-bottom: 10px;
      color: #2c3e50;
      border-bottom: 1px solid #ddd;
      padding-bottom: 3px;
    }

    .info-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 6px 20px;
    }

    .info-item { display: flex; gap: 8px; }
    .info-label { font-weight: bold; color: #555; min-width: 100px; }
    .info-value { color: #333; }

    .amount-highlight {
      font-size: 22px;
      font-weight: bold;
      color: #27ae60;
      text-align: center;
      padding: 12px;
      background: #f8f9fa;
      border-radius: 6px;
      margin: 12px 0;
    }

    .scan-item {
      position: relative;
      width: 100%;
      height: 250px;
      margin-top: 15px;
      page-break-inside: avoid;
    }

    .scan-item img {
      width: 100%;
      height: 100%;
      object-fit: fill;
      display: block;
    }

    .scan-item .donor-tag {
      position: absolute;
      background: rgba(255, 255, 255, 0.95);
      padding: 5px 15px;
      font-weight: bold;
      font-size: 14px;
      border: 2px solid #333;
      z-index: 10;
    }

    .donor-tag.tag-top-left { top: 8px; left: 8px; }
    .donor-tag.tag-top-center { top: 8px; left: 50%; transform: translateX(-50%); }
    .donor-tag.tag-top-right { top: 8px; right: 8px; }
    .donor-tag.tag-bottom-left { bottom: 8px; left: 8px; }
    .donor-tag.tag-bottom-center { bottom: 8px; left: 50%; transform: translateX(-50%); }
    .donor-tag.tag-bottom-right { bottom: 8px; right: 8px; }`;
  }

  /**
   * Generate HTML for a single donation page (details + scans).
   * Shared by both single donation modal and batch printing.
   */
  generateDonationPageHtml(item: DonationPrintData, printDetails: boolean, printScans: boolean): string {
    let detailsHtml = '';
    if (printDetails) {
      const optionalFields = [
        item.campaign ? `<div class="info-item"><span class="info-label">קמפיין:</span><span class="info-value">${this.escapeHtml(item.campaign)}</span></div>` : '',
        item.checkNumber ? `<div class="info-item"><span class="info-label">מספר צ'ק:</span><span class="info-value">${this.escapeHtml(item.checkNumber)}</span></div>` : '',
        item.reason ? `<div class="info-item"><span class="info-label">סיבה:</span><span class="info-value">${this.escapeHtml(item.reason)}</span></div>` : '',
        item.notes ? `<div class="info-item"><span class="info-label">הערות:</span><span class="info-value">${this.escapeHtml(item.notes)}</span></div>` : ''
      ].filter(f => f).join('\n');

      detailsHtml = `
      <div class="header">
        <h1>פרטי תרומה</h1>
        <p>${this.escapeHtml(item.hebrewDate)}</p>
      </div>
      <div class="amount-highlight">${this.escapeHtml(item.amount)}</div>
      <div class="section">
        <div class="section-title">פרטי התורם</div>
        <div class="info-grid">
          <div class="info-item"><span class="info-label">שם מלא:</span><span class="info-value">${this.escapeHtml(item.donorName)}</span></div>
          <div class="info-item"><span class="info-label">שם באנגלית:</span><span class="info-value">${this.escapeHtml(item.donorNameEnglish) || '-'}</span></div>
        </div>
      </div>
      <div class="section">
        <div class="section-title">פרטי התרומה</div>
        <div class="info-grid">
          <div class="info-item"><span class="info-label">סוג תרומה:</span><span class="info-value">${this.escapeHtml(item.donationType)}</span></div>
          <div class="info-item"><span class="info-label">אמצעי תשלום:</span><span class="info-value">${this.escapeHtml(item.method)}</span></div>
          ${optionalFields}
        </div>
      </div>
      <div style="height: 100px;"></div>`;
    }

    let scansHtml = '';
    if (printScans && item.scans.length > 0) {
      scansHtml = item.scans.map(s => {
        const tagHtml = s.tagPosition !== 'none'
          ? `<div class="donor-tag tag-${s.tagPosition}">${this.escapeHtml(item.donorName)}</div>`
          : '';
        return `<div class="scan-item">${tagHtml}<img src="${s.url}" /></div>`;
      }).join('');
    }

    if (!detailsHtml && !scansHtml) return '';
    return `<div class="donation-page">${detailsHtml}${scansHtml}</div>`;
  }

  /**
   * Generate HTML for Avery 5160 label sheets (3 columns x 8 rows = 24 labels/page)
   * Label size: 63.5mm x 33.9mm, gap: 2.54mm
   * Page margins: top 13mm, right/left 7.2mm
   */
  private generateLabelsHtml(donors: LabelData[]): string {
    const labelsPerPage = 24;
    const pages: string[] = [];

    for (let i = 0; i < donors.length; i += labelsPerPage) {
      const pageLabels = donors.slice(i, i + labelsPerPage);
      const labelCells = pageLabels.map(d => `
        <div class="label">
          <div class="label-name">${this.escapeHtml(d.donorName)}</div>
          <div class="label-address">${d.addressLines.map(l => this.escapeHtml(l)).join('<br>')}</div>
        </div>`).join('');

      // Fill remaining cells with empty labels
      const emptyCount = labelsPerPage - pageLabels.length;
      const emptyCells = Array(emptyCount).fill('<div class="label"></div>').join('');

      pages.push(`<div class="page">${labelCells}${emptyCells}</div>`);
    }

    return `<!DOCTYPE html>
<html dir="ltr">
<head>
  <meta charset="UTF-8">
  <title>מדבקות</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }

    @page {
      size: A4;
      margin: 13mm 7.2mm 0 7.2mm;
    }

    body {
      font-family: 'Segoe UI', Tahoma, Arial, sans-serif;
      direction: ltr;
    }

    .page {
      display: grid;
      grid-template-columns: repeat(3, 63.5mm);
      grid-template-rows: repeat(8, 33.9mm);
      column-gap: 2.54mm;
      row-gap: 0mm;
      page-break-after: always;
    }

    .page:last-child {
      page-break-after: auto;
    }

    .label {
      width: 63.5mm;
      height: 33.9mm;
      padding: 2mm 3mm;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      justify-content: center;
      text-align: left;
    }

    .label-name {
      font-size: 10pt;
      font-weight: bold;
      margin-bottom: 1mm;
      line-height: 1.2;
    }

    .label-address {
      font-size: 9pt;
      line-height: 1.3;
    }

    @media print {
      body { margin: 0; padding: 0; }
    }
  </style>
</head>
<body>${pages.join('')}</body>
</html>`;
  }

  /**
   * Generate HTML for DL envelope printing (110mm x 220mm)
   * Recipient address positioned at bottom-right (RTL)
   */
  private generateEnvelopesHtml(donors: LabelData[]): string {
    const envelopes = donors.map(d => `
      <div class="envelope">
        <div class="recipient">
          <div class="recipient-name">${this.escapeHtml(d.donorName)}</div>
          <div class="recipient-address">${d.addressLines.map(l => this.escapeHtml(l)).join('<br>')}</div>
        </div>
      </div>`).join('');

    return `<!DOCTYPE html>
<html dir="ltr">
<head>
  <meta charset="UTF-8">
  <title>מעטפות</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }

    @page {
      size: 220mm 110mm;
      margin: 0;
    }

    body {
      font-family: 'Segoe UI', Tahoma, Arial, sans-serif;
      direction: ltr;
    }

    .envelope {
      width: 220mm;
      height: 110mm;
      position: relative;
      page-break-after: always;
    }

    .envelope:last-child {
      page-break-after: auto;
    }

    .recipient {
      position: absolute;
      top: 45%;
      left: 50%;
      transform: translate(-50%, -50%);
      text-align: left;
    }

    .recipient-name {
      font-size: 14pt;
      font-weight: bold;
      margin-bottom: 2mm;
    }

    .recipient-address {
      font-size: 12pt;
      line-height: 1.4;
    }

    @media print {
      body { margin: 0; padding: 0; }
    }
  </style>
</head>
<body>${envelopes}</body>
</html>`;
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}
