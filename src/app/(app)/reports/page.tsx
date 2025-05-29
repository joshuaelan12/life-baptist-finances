
"use client";

import React, { useState, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, Sparkles, AlertTriangle } from "lucide-react";
import { generateFinancialReport, IdentifyFinancialTrendsInput, IdentifyFinancialTrendsOutput, GenerateFinancialReportInput, GenerateFinancialReportOutput } from '@/ai/flows';
import { identifyFinancialTrends } from '@/ai/flows';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { auth, db } from '@/lib/firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { useCollectionData } from 'react-firebase-hooks/firestore';
import { collection, query, orderBy, Timestamp, type DocumentData, type QueryDocumentSnapshot, type SnapshotOptions } from 'firebase/firestore';
import type { IncomeRecord, TitheRecord, ExpenseRecord, IncomeRecordFirestore, TitheRecordFirestore, ExpenseRecordFirestore } from '@/types';
import { format, subMonths, startOfMonth, endOfMonth, getYear, getMonth } from 'date-fns';

// Firestore Converters (similar to DashboardPage)
const incomeConverter = {
  toFirestore(record: IncomeRecord): DocumentData {
    const { id, date, createdAt, recordedByUserId, ...rest } = record;
    const data: any = { ...rest, date: Timestamp.fromDate(date) };
    if (recordedByUserId) data.recordedByUserId = recordedByUserId;
    return data;
  },
  fromFirestore(snapshot: QueryDocumentSnapshot, options: SnapshotOptions): IncomeRecord {
    const data = snapshot.data(options) as Omit<IncomeRecordFirestore, 'id'>;
    return {
      id: snapshot.id,
      date: data.date instanceof Timestamp ? data.date.toDate() : new Date(),
      category: data.category,
      amount: data.amount,
      description: data.description,
      memberName: data.memberName,
      recordedByUserId: data.recordedByUserId,
      createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : undefined,
    };
  }
};

const titheConverter = {
  toFirestore(record: TitheRecord): DocumentData {
    const { id, date, createdAt, recordedByUserId, ...rest } = record;
    const data: any = { ...rest, date: Timestamp.fromDate(date) };
    if (recordedByUserId) data.recordedByUserId = recordedByUserId;
    return data;
  },
  fromFirestore(snapshot: QueryDocumentSnapshot, options: SnapshotOptions): TitheRecord {
    const data = snapshot.data(options) as Omit<TitheRecordFirestore, 'id'>;
    return {
      id: snapshot.id,
      memberName: data.memberName,
      date: data.date instanceof Timestamp ? data.date.toDate() : new Date(),
      amount: data.amount,
      recordedByUserId: data.recordedByUserId,
      createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : undefined,
    };
  }
};

const expenseConverter = {
  toFirestore(record: ExpenseRecord): DocumentData {
    const { id, date, createdAt, recordedByUserId, ...rest } = record;
    const data: any = { ...rest, date: Timestamp.fromDate(date) };
    if (recordedByUserId) data.recordedByUserId = recordedByUserId;
    return data;
  },
  fromFirestore(snapshot: QueryDocumentSnapshot, options: SnapshotOptions): ExpenseRecord {
    const data = snapshot.data(options) as Omit<ExpenseRecordFirestore, 'id'>;
    return {
      id: snapshot.id,
      date: data.date instanceof Timestamp ? data.date.toDate() : new Date(),
      category: data.category,
      amount: data.amount,
      description: data.description,
      payee: data.payee,
      paymentMethod: data.paymentMethod,
      recordedByUserId: data.recordedByUserId,
      createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : undefined,
    };
  }
};


export default function ReportsPage() {
  const [authUser, authLoading, authError] = useAuthState(auth);

  const incomeCollectionRef = authUser ? collection(db, 'income_records') : null;
  const incomeQuery = incomeCollectionRef 
    ? query(incomeCollectionRef).withConverter<IncomeRecord>(incomeConverter)
    : null;
  const [incomeRecords, isLoadingIncome, errorIncome] = useCollectionData(incomeQuery);

  const tithesCollectionRef = authUser ? collection(db, 'tithe_records') : null;
  const tithesQuery = tithesCollectionRef
    ? query(tithesCollectionRef).withConverter<TitheRecord>(titheConverter)
    : null;
  const [titheRecords, isLoadingTithes, errorTithes] = useCollectionData(tithesQuery);

  const expensesCollectionRef = authUser ? collection(db, 'expense_records') : null;
  const expensesQuery = expensesCollectionRef
    ? query(expensesCollectionRef).withConverter<ExpenseRecord>(expenseConverter)
    : null;
  const [expenseRecords, isLoadingExpenses, errorExpenses] = useCollectionData(expensesQuery);
  
  const [quarterlyReport, setQuarterlyReport] = useState<GenerateFinancialReportOutput | null>(null);
  const [financialTrends, setFinancialTrends] = useState<IdentifyFinancialTrendsOutput | null>(null);
  
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [isIdentifyingTrends, setIsIdentifyingTrends] = useState(false);

  const [reportError, setReportError] = useState<string | null>(null);
  const [trendsError, setTrendsError] = useState<string | null>(null);

  const isLoadingData = isLoadingIncome || isLoadingTithes || isLoadingExpenses || authLoading;
  const dataError = errorIncome || errorTithes || errorExpenses || authError;

  const processedQuarterlyData = useMemo(() => {
    if (!incomeRecords || !titheRecords || !expenseRecords) return null;

    const today = new Date();
    const reportMonths: Date[] = [];
    for (let i = 3; i >= 1; i--) { // Last 3 full months
      reportMonths.push(startOfMonth(subMonths(today, i)));
    }
    
    const reportStartDate = reportMonths[0];
    const reportEndDate = endOfMonth(reportMonths[reportMonths.length - 1]);

    const quarterlyIncome = {
      offerings: 0,
      tithes: 0,
      donations: 0,
      other: 0,
    };
    const quarterlyExpenses: { [key: string]: number } = {};

    incomeRecords.forEach(record => {
      if (record.date >= reportStartDate && record.date <= reportEndDate) {
        if (record.category === "Offering") quarterlyIncome.offerings += record.amount;
        else if (record.category === "Donation") quarterlyIncome.donations += record.amount;
        else if (record.category === "Other") quarterlyIncome.other += record.amount;
      }
    });
    titheRecords.forEach(record => {
      if (record.date >= reportStartDate && record.date <= reportEndDate) {
        quarterlyIncome.tithes += record.amount;
      }
    });
    expenseRecords.forEach(record => {
      if (record.date >= reportStartDate && record.date <= reportEndDate) {
        quarterlyExpenses[record.category] = (quarterlyExpenses[record.category] || 0) + record.amount;
      }
    });
    
    const quarterName = `Q${Math.floor(getMonth(reportEndDate) / 3) + 1} ${getYear(reportEndDate)}`;

    return {
      quarter: `${quarterName} (Data from ${format(reportStartDate, "MMM yyyy")} to ${format(reportEndDate, "MMM yyyy")})`,
      income: quarterlyIncome,
      expenses: quarterlyExpenses,
      summary_notes: `Report generated on ${format(today, "PPP")}. Data reflects records from ${format(reportStartDate, "PP")} to ${format(reportEndDate, "PP")}.`
    };
  }, [incomeRecords, titheRecords, expenseRecords]);

  const processedTrendData = useMemo(() => {
    if (!incomeRecords || !titheRecords || !expenseRecords) return null;

    const monthlyRecords: { month: string; income: number; expenses: number }[] = [];
    const today = new Date();

    for (let i = 11; i >= 0; i--) { // Last 12 full months
      const targetMonthDate = subMonths(today, i);
      const monthKey = format(targetMonthDate, "yyyy-MM");
      const monthStart = startOfMonth(targetMonthDate);
      const monthEnd = endOfMonth(targetMonthDate);

      let monthlyIncomeTotal = 0;
      incomeRecords.forEach(record => {
        if (record.date >= monthStart && record.date <= monthEnd) {
          monthlyIncomeTotal += record.amount;
        }
      });
      titheRecords.forEach(record => {
        if (record.date >= monthStart && record.date <= monthEnd) {
          monthlyIncomeTotal += record.amount;
        }
      });
      
      let monthlyExpensesTotal = 0;
      expenseRecords.forEach(record => {
        if (record.date >= monthStart && record.date <= monthEnd) {
          monthlyExpensesTotal += record.amount;
        }
      });
      monthlyRecords.push({ month: monthKey, income: monthlyIncomeTotal, expenses: monthlyExpensesTotal });
    }
    return { monthly_records: monthlyRecords };
  }, [incomeRecords, titheRecords, expenseRecords]);


  const handleGenerateReport = async () => {
    if (!processedQuarterlyData) {
      setReportError("Data is not yet available to generate the report.");
      return;
    }
    setIsGeneratingReport(true);
    setReportError(null);
    setQuarterlyReport(null);
    try {
      const input: GenerateFinancialReportInput = { financialData: JSON.stringify(processedQuarterlyData, null, 2) };
      const result = await generateFinancialReport(input);
      setQuarterlyReport(result);
    } catch (error) {
      console.error("Error generating report:", error);
      setReportError("Failed to generate report. Please try again.");
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const handleIdentifyTrends = async () => {
    if (!processedTrendData) {
      setTrendsError("Data is not yet available to identify trends.");
      return;
    }
    setIsIdentifyingTrends(true);
    setTrendsError(null);
    setFinancialTrends(null);
    try {
      const input: IdentifyFinancialTrendsInput = { financialData: JSON.stringify(processedTrendData, null, 2) };
      const result = await identifyFinancialTrends(input);
      setFinancialTrends(result);
    } catch (error) {
      console.error("Error identifying trends:", error);
      setTrendsError("Failed to identify trends. Please try again.");
    } finally {
      setIsIdentifyingTrends(false);
    }
  };

  if (isLoadingData) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-100px)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-2">Loading financial data for reports...</p>
      </div>
    );
  }

  if (dataError) {
    return (
      <Alert variant="destructive" className="mt-4">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Error Loading Data</AlertTitle>
        <AlertDescription>{dataError.message || "Could not load financial data for reports."}</AlertDescription>
      </Alert>
    );
  }
  
  if (!authUser) {
     return (
      <Alert variant="destructive" className="mt-4">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Not Authenticated</AlertTitle>
        <AlertDescription>Please log in to view and generate reports.</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6 md:space-y-8">
      <h1 className="text-3xl font-bold tracking-tight text-foreground">AI-Powered Financial Reports</h1>
      <Card>
        <CardHeader>
          <CardTitle>Data Source</CardTitle>
        </CardHeader>
        <CardContent>
            <Alert variant="default" className="bg-muted/50">
                <Sparkles className="h-4 w-4 text-primary" />
                <AlertTitle className="text-primary">Live Data Mode</AlertTitle>
                <AlertDescription>
                Reports are generated using real-time financial data from your church records.
                The quarterly report uses data from the last 3 full months.
                The trend analysis uses data from the last 12 full months.
                </AlertDescription>
            </Alert>
        </CardContent>
      </Card>
      
      <div className="grid md:grid-cols-2 gap-6">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Generate Quarterly Report</CardTitle>
            <CardDescription>Generates a summary report using financial data from the last 3 full months.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={handleGenerateReport} disabled={isGeneratingReport || isLoadingData || !processedQuarterlyData} className="w-full md:w-auto">
              {isGeneratingReport ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="mr-2 h-4 w-4" />
              )}
              Generate Quarterly Report
            </Button>
            {reportError && <Alert variant="destructive"><AlertTitle>Error</AlertTitle><AlertDescription>{reportError}</AlertDescription></Alert>}
            {!reportError && !isGeneratingReport && !processedQuarterlyData && !isLoadingData && (
                <Alert variant="default"><AlertDescription>Not enough data to generate a quarterly report yet.</AlertDescription></Alert>
            )}
            {quarterlyReport && (
              <div className="mt-4 p-4 border rounded-md bg-muted/50">
                <h3 className="font-semibold text-lg mb-2 text-primary">Generated Report Summary:</h3>
                <p className="text-sm whitespace-pre-wrap">{quarterlyReport.reportSummary}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Identify Financial Trends</CardTitle>
            <CardDescription>Identifies trends, insights, and recommendations using data from the last 12 full months.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={handleIdentifyTrends} disabled={isIdentifyingTrends || isLoadingData || !processedTrendData} className="w-full md:w-auto">
              {isIdentifyingTrends ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="mr-2 h-4 w-4" />
              )}
              Identify Trends
            </Button>
            {trendsError && <Alert variant="destructive"><AlertTitle>Error</AlertTitle><AlertDescription>{trendsError}</AlertDescription></Alert>}
             {!trendsError && !isIdentifyingTrends && !processedTrendData && !isLoadingData && (
                <Alert variant="default"><AlertDescription>Not enough data to identify financial trends yet.</AlertDescription></Alert>
            )}
            {financialTrends && (
              <div className="mt-4 p-4 border rounded-md bg-muted/50 space-y-3">
                <div>
                  <h3 className="font-semibold text-lg mb-1 text-primary">Key Trends:</h3>
                  <p className="text-sm whitespace-pre-wrap">{financialTrends.trends}</p>
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-1 text-primary">Insights:</h3>
                  <p className="text-sm whitespace-pre-wrap">{financialTrends.insights}</p>
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-1 text-primary">Recommendations:</h3>
                  <p className="text-sm whitespace-pre-wrap">{financialTrends.recommendations}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

    