export type IncomeCategory = "Offering" | "Tithe" | "Donation" | "Other";

export interface IncomeRecord {
  id: string;
  date: Date;
  category: IncomeCategory;
  amount: number;
  description?: string;
  memberName?: string; // Relevant for Tithes
}

export interface TitheRecord {
  id:string;
  memberName: string;
  date: Date;
  amount: number;
}

export interface FinancialSummary {
  totalOfferings: number;
  totalTithes: number;
  otherIncome: number;
  totalIncome: number;
}

// AI Report related types (mirroring genkit flow outputs for clarity)
export interface FinancialTrendsOutput {
  trends: string;
  insights: string;
  recommendations: string;
}

export interface QuarterlyReportOutput {
  reportSummary: string;
}
