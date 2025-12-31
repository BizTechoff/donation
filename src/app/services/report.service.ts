import { Injectable } from '@angular/core';
import { ReportController, GroupedReportResponse, ReportFilters, PaymentReportData, YearlySummaryData } from '../../shared/controllers/report.controller';

@Injectable({
  providedIn: 'root'
})
export class ReportService {

  constructor() { }

  /**
   * Get grouped donations report from server
   * @param filters Report filters including groupBy, showDonorDetails, etc.
   * @returns Promise with report data ready for display and printing
   */
  async getGroupedDonationsReport(filters: ReportFilters): Promise<GroupedReportResponse> {
    return await ReportController.getGroupedDonationsReport(filters);
  }

  /**
   * Get available Hebrew years from donations
   * @returns Promise with array of formatted Hebrew years sorted descending
   */
  async getAvailableHebrewYears(): Promise<string[]> {
    return await ReportController.getAvailableHebrewYears();
  }

  /**
   * Get Payments Report (Commitment vs Actual)
   * Applies global filters from user.settings automatically
   */
  async getPaymentsReport(
    conversionRates: { [currency: string]: number },
    localFilters?: { selectedDonorIds?: string[] }
  ): Promise<PaymentReportData[]> {
    return await ReportController.getPaymentsReport(conversionRates, localFilters);
  }

  /**
   * Get Yearly Summary Report
   * Applies global filters from user.settings automatically
   */
  async getYearlySummaryReport(
    conversionRates: { [currency: string]: number },
    localFilters?: { selectedYear?: string | number }
  ): Promise<YearlySummaryData[]> {
    return await ReportController.getYearlySummaryReport(conversionRates, localFilters);
  }
}
