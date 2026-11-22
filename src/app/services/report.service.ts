import { Injectable } from '@angular/core';
import { ReportController, GroupedReportResponse, ReportFilters, PaymentReportData, PaymentReportLocalFilters, PaymentReportResponse, YearlySummaryData } from '../../shared/controllers/report.controller';
import { GeneralStatsResponse } from '../../shared/type/report.res';

@Injectable({
  providedIn: 'root'
})
export class ReportService {

  constructor() { }

  async getGroupedDonationsReport(filters: ReportFilters): Promise<GroupedReportResponse> {
    return await ReportController.getGroupedDonationsReport(filters);
  }

  async getAvailableHebrewYears(): Promise<string[]> {
    return await ReportController.getAvailableHebrewYears();
  }

  /** 4 השנים האחרונות - הבחירה המסומנת כברירת מחדל בדוח התרומות */
  async getDefaultReportYears(): Promise<string[]> {
    return await ReportController.getDefaultReportYears();
  }

  async getPaymentsReport(
    conversionRates: { [currency: string]: number },
    localFilters?: PaymentReportLocalFilters
  ): Promise<PaymentReportResponse> {
    return await ReportController.getPaymentsReport(conversionRates, localFilters);
  }

  async getYearlySummaryReport(
    conversionRates: { [currency: string]: number },
    localFilters?: { selectedYear?: string | number, selectedYears?: (string | number)[] }
  ): Promise<YearlySummaryData[]> {
    return await ReportController.getYearlySummaryReport(conversionRates, localFilters);
  }

  async getGeneralStats(conversionRates: { [currency: string]: number }): Promise<GeneralStatsResponse> {
    return await ReportController.getGeneralStats(conversionRates);
  }
}
