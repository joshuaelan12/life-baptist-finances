import type { Timestamp } from 'firebase/firestore';

export type IncomeCategory = "Offering" | "Tithe" | "Donation" | "Other";

// For data coming from Firestore
export interface IncomeRecordFirestore {
  id: string;
  date: Timestamp; // Firestore Timestamp
  category: IncomeCategory;
  amount: number;
  description?: string;
  memberName?: string; 
  recordedByUserId: string;
  createdAt: Timestamp; // Firestore Timestamp
}

// For client-side form and display
export interface IncomeRecord {
  id: string;
  date: Date; // JavaScript Date object
  category: IncomeCategory;
  amount: number;
  description?: string;
  memberName?: string; 
  recordedByUserId?: string; // Optional on client until save
  createdAt?: Date; // Optional on client until save
}


export interface TitheRecord {
  id:string;
  memberName: string;
  date: Date; // JavaScript Date object
  amount: number;
  recordedByUserId?: string; // Optional on client until save
  createdAt?: Date; // Optional on client until save
}

// For data stored in Firestore, assuming we'll convert to TitheRecord on client
export interface TitheRecordFirestore {
  id:string;
  memberName: string;
  date: Timestamp;
  amount: number;
  recordedByUserId: string;
  createdAt: Timestamp;
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
