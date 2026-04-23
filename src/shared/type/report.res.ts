// DTOs for ReportController — General Stats response

export interface GeneralCurrencyStat {
  currencyId: string;
  total: number;
}

export interface GeneralMonthlyStat {
  month: string;
  donations: number;
  amount: number;
}

export interface GeneralChartItem {
  label: string;
  value: number;
  percentage?: number;
}

export interface GeneralTopDonor {
  donorId: string;
  donorName: string;
  total: number;
  count: number;
}

export interface GeneralTopCampaign {
  campaignId: string;
  name: string;
  raisedInShekel: number;
}

export interface GeneralRecentActivity {
  date: Date;
  description: string;
  amount: number;
  campaign?: string;
  donorId?: string;
}

export interface GeneralStatsResponse {
  // Summary cards
  totalDonations: number;
  totalDonors: number;
  totalCampaigns: number;
  amountByCurrency: GeneralCurrencyStat[];
  avgDonation: number;
  // Charts
  monthlyData: GeneralMonthlyStat[];
  donorTypeData: GeneralChartItem[];
  regionData: GeneralChartItem[];
  campaignData: GeneralChartItem[];
  paymentMethodData: GeneralChartItem[];
  // Tables
  topDonors: GeneralTopDonor[];
  topCampaigns: GeneralTopCampaign[];
  recentActivity: GeneralRecentActivity[];
}
