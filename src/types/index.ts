
import type { Timestamp } from 'firebase/firestore';
import { z } from 'zod';

// For TithesPage form
export const titheSchema = z.object({
  memberName: z.string().min(2, { message: "Member name must be at least 2 characters." }),
  date: z.date({ required_error: "Date is required." }),
  amount: z.coerce.number().positive({ message: "Amount must be positive." }),
});
export type TitheFormValues = z.infer<typeof titheSchema>;


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
  recordedByUserId?: string;
  createdAt?: Date;
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

// Expense Management Types
export type ExpenseCategory =
  | "Utilities"
  | "Ministry Supplies"
  | "Salaries & Stipends"
  | "Rent/Mortgage"
  | "Outreach & Evangelism"
  | "Maintenance & Repairs"
  | "Administrative Costs"
  | "Events & Programs"
  | "Transportation"
  | "Other";

export const expenseCategories: ExpenseCategory[] = [
  "Utilities",
  "Ministry Supplies",
  "Salaries & Stipends",
  "Rent/Mortgage",
  "Outreach & Evangelism",
  "Maintenance & Repairs",
  "Administrative Costs",
  "Events & Programs",
  "Transportation",
  "Other"
];

// For Expense Page Form validation
export const expenseSchema = z.object({
  date: z.date({ required_error: "Date is required." }),
  category: z.enum(expenseCategories as [ExpenseCategory, ...ExpenseCategory[]], { required_error: "Category is required." }),
  amount: z.coerce.number().positive({ message: "Amount must be positive." }),
  description: z.string().optional(),
  payee: z.string().optional(),
  paymentMethod: z.string().optional(),
});

export type ExpenseFormValues = z.infer<typeof expenseSchema>;

// For data stored in Firestore
export interface ExpenseRecordFirestore {
  id: string;
  date: Timestamp;
  category: ExpenseCategory;
  amount: number;
  description?: string;
  payee?: string;
  paymentMethod?: string;
  recordedByUserId: string;
  createdAt: Timestamp;
}

// For client-side display and manipulation
export interface ExpenseRecord {
  id: string;
  date: Date;
  category: ExpenseCategory;
  amount: number;
  description?: string;
  payee?: string;
  paymentMethod?: string;
  recordedByUserId: string;
  createdAt?: Date;
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

// Activity Log Types
export type ActivityLogAction =
  | "CREATE_INCOME_RECORD"
  | "DELETE_INCOME_RECORD"
  | "CREATE_EXPENSE_RECORD"
  | "UPDATE_EXPENSE_RECORD"
  | "DELETE_EXPENSE_RECORD"
  | "CREATE_TITHE_RECORD"
  | "UPDATE_TITHE_RECORD"
  | "DELETE_TITHE_RECORD"
  | "USER_LOGIN"
  | "USER_LOGOUT"
  | "USER_SIGNUP"
  | "UPDATE_PROFILE"
  | "CHANGE_PASSWORD";

export interface ActivityLogRecord {
  id: string;
  userId: string;
  userDisplayName: string; // Store display name or email at time of logging
  action: ActivityLogAction;
  timestamp: Date;
  details?: string; // e.g., "Record ID: xyz123 for Tithe"
  collectionName?: string; // e.g., 'income_records', 'tithe_records'
  recordId?: string; // The ID of the document that was affected
}

export interface ActivityLogRecordFirestore {
  id: string;
  userId: string;
  userDisplayName: string;
  action: ActivityLogAction;
  timestamp: Timestamp;
  details?: string;
  collectionName?: string;
  recordId?: string;
}
