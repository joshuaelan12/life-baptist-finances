
"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CalendarIcon, FileText, LineChart, Download, Loader2, AlertTriangle } from "lucide-react";
import { format, subMonths, startOfQuarter, endOfQuarter, startOfMonth, endOfMonth, subQuarters } from "date-fns";
import { auth, db } from '@/lib/firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { useCollectionData } from 'react-firebase-hooks/firestore';
import { collection, query, orderBy, Timestamp, type DocumentData, type QueryDocumentSnapshot, type SnapshotOptions, serverTimestamp } from 'firebase/firestore';
import type { IncomeRecord, TitheRecord, ExpenseRecord, IncomeRecordFirestore, TitheRecordFirestore, ExpenseRecordFirestore, FinancialTrendsOutput, QuarterlyReportOutput } from '@/types';
import { generateFinancialReport, identifyFinancialTrends } from '@/ai/flows';
import { useToast } from "@/hooks/use-toast";

// Firestore Converters
const incomeConverter = {
  toFirestore(record: IncomeRecord): DocumentData {
    const { id, date, createdAt, recordedByUserId, ...rest } = record;
    const data: any = { ...rest, date: Timestamp.fromDate(date) };
    if (recordedByUserId) data.recordedByUserId = recordedByUserId;
    data.createdAt = createdAt ? Timestamp.fromDate(createdAt) : serverTimestamp();
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
    data.createdAt = createdAt ? Timestamp.fromDate(createdAt) : serverTimestamp();
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
    data.createdAt = createdAt ? Timestamp.fromDate(createdAt) : serverTimestamp();
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
  const { toast } = useToast();
  const [authUser, authLoading, authError] = useAuthState(auth);

  const incomeCollectionRef = authUser ? collection(db, 'income_records') : null;
  const incomeQuery = incomeCollectionRef ? query(incomeCollectionRef, orderBy('date', 'desc')).withConverter<IncomeRecord>(incomeConverter) : null;
  const [incomeRecords, isLoadingIncome, errorIncome] = useCollectionData(incomeQuery);

  const tithesCollectionRef = authUser ? collection(db, 'tithe_records') : null;
  const tithesQuery = tithesCollectionRef ? query(tithesCollectionRef, orderBy('date', 'desc')).withConverter<TitheRecord>(titheConverter) : null;
  const [titheRecords, isLoadingTithes, errorTithes] = useCollectionData(tithesQuery);

  const expensesCollectionRef = authUser ? collection(db, 'expense_records') : null;
  const expensesQuery = expensesCollectionRef ? query(expensesCollectionRef, orderBy('date', 'desc')).withConverter<ExpenseRecord>(expenseConverter) : null;
  const [expenseRecords, isLoadingExpenses, errorExpenses] = useCollectionData(expensesQuery);

  const [startDateQuarterly, setStartDateQuarterly] = useState<Date | undefined>(startOfQuarter(subQuarters(new Date(), 1)));
  const [endDateQuarterly, setEndDateQuarterly] = useState<Date | undefined>(endOfQuarter(subQuarters(new Date(), 1)));
  const [quarterlyReport, setQuarterlyReport] = useState<QuarterlyReportOutput | null>(null);
  const [isGeneratingQuarterlyReport, setIsGeneratingQuarterlyReport] = useState(false);

  const [startDateTrends, setStartDateTrends] = useState<Date | undefined>(startOfMonth(subMonths(new Date(), 12)));
  const [endDateTrends, setEndDateTrends] = useState<Date | undefined>(endOfMonth(subMonths(new Date(), 0))); // Trends up to end of current month
  const [financialTrends, setFinancialTrends] = useState<FinancialTrendsOutput | null>(null);
  const [isIdentifyingTrends, setIsIdentifyingTrends] = useState(false);
  
  const [generationError, setGenerationError] = useState<string | null>(null);

  const dataIsLoading = isLoadingIncome || isLoadingTithes || isLoadingExpenses;
  const dataError = errorIncome || errorTithes || errorExpenses;

  useEffect(() => {
    setQuarterlyReport(null);
  }, [startDateQuarterly, endDateQuarterly]);

  useEffect(() => {
    setFinancialTrends(null);
  }, [startDateTrends, endDateTrends]);

  const processedQuarterlyData = useMemo(() => {
    if (dataIsLoading || !incomeRecords || !titheRecords || !expenseRecords || !startDateQuarterly || !endDateQuarterly) return null;
    const filteredIncome = incomeRecords.filter(r => r.date >= startDateQuarterly && r.date <= endDateQuarterly);
    const filteredTithes = titheRecords.filter(r => r.date >= startDateQuarterly && r.date <= endDateQuarterly);
    const filteredExpenses = expenseRecords.filter(r => r.date >= startDateQuarterly && r.date <= endDateQuarterly);
    return JSON.stringify({
      period: `From ${format(startDateQuarterly, "yyyy-MM-dd")} to ${format(endDateQuarterly, "yyyy-MM-dd")}`,
      income: filteredIncome.map(r => ({ ...r, date: format(r.date, "yyyy-MM-dd") })),
      tithes: filteredTithes.map(r => ({ ...r, date: format(r.date, "yyyy-MM-dd") })),
      expenses: filteredExpenses.map(r => ({ ...r, date: format(r.date, "yyyy-MM-dd") })),
    }, null, 2);
  }, [incomeRecords, titheRecords, expenseRecords, startDateQuarterly, endDateQuarterly, dataIsLoading, format, startOfQuarter, endOfQuarter]);

  const processedTrendData = useMemo(() => {
    if (dataIsLoading || !incomeRecords || !titheRecords || !expenseRecords || !startDateTrends || !endDateTrends) return null;
    const filteredIncome = incomeRecords.filter(r => r.date >= startDateTrends && r.date <= endDateTrends);
    const filteredTithes = titheRecords.filter(r => r.date >= startDateTrends && r.date <= endDateTrends);
    const filteredExpenses = expenseRecords.filter(r => r.date >= startDateTrends && r.date <= endDateTrends);
    return JSON.stringify({
      period: `From ${format(startDateTrends, "yyyy-MM-dd")} to ${format(endDateTrends, "yyyy-MM-dd")}`,
      income: filteredIncome.map(r => ({ ...r, date: format(r.date, "yyyy-MM-dd") })),
      tithes: filteredTithes.map(r => ({ ...r, date: format(r.date, "yyyy-MM-dd") })),
      expenses: filteredExpenses.map(r => ({ ...r, date: format(r.date, "yyyy-MM-dd") })),
    }, null, 2);
  }, [incomeRecords, titheRecords, expenseRecords, startDateTrends, endDateTrends, dataIsLoading, format, startOfMonth, endOfMonth]);

  const isProcessedQuarterlyDataEffectivelyEmpty = useMemo(() => {
      if (dataIsLoading || !processedQuarterlyData) return true; 
      try {
          const data = JSON.parse(processedQuarterlyData);
          return data.income.length === 0 && data.tithes.length === 0 && data.expenses.length === 0;
      } catch { return true; }
  }, [processedQuarterlyData, dataIsLoading]);

  const isProcessedTrendDataEffectivelyEmpty = useMemo(() => {
      if (dataIsLoading || !processedTrendData) return true;
      try {
          const data = JSON.parse(processedTrendData);
          return data.income.length === 0 && data.tithes.length === 0 && data.expenses.length === 0;
      } catch { return true; }
  }, [processedTrendData, dataIsLoading]);


  const handleGenerateReport = async () => {
    if (!processedQuarterlyData || isProcessedQuarterlyDataEffectivelyEmpty) {
      toast({ variant: "default", title: "No Data", description: "No data available for the selected period to generate a quarterly report." });
      return;
    }
    setIsGeneratingQuarterlyReport(true);
    setGenerationError(null);
    setQuarterlyReport(null);
    try {
      const result = await generateFinancialReport({ financialData: processedQuarterlyData });
      setQuarterlyReport(result);
      if (!result.reportSummary || result.reportSummary.trim() === "") {
        toast({ variant: "default", title: "Report Generated (Empty)", description: "The AI generated a report, but it's empty. This might be due to no financial activity in the selected period." });
      } else {
        toast({ title: "Success", description: "Quarterly summary report generated." });
      }
    } catch (err: any) {
      setGenerationError(err.message || "Failed to generate report.");
      toast({ variant: "destructive", title: "Generation Failed", description: err.message || "Failed to generate report." });
    } finally {
      setIsGeneratingQuarterlyReport(false);
    }
  };

  const handleIdentifyTrends = async () => {
    if (!processedTrendData || isProcessedTrendDataEffectivelyEmpty) {
       toast({ variant: "default", title: "No Data", description: "No data available for the selected period to identify trends." });
      return;
    }
    setIsIdentifyingTrends(true);
    setGenerationError(null);
    setFinancialTrends(null);
    try {
      const result = await identifyFinancialTrends({ financialData: processedTrendData });
      setFinancialTrends(result);
       if ((!result.trends || result.trends.trim() === "") && (!result.insights || result.insights.trim() === "") && (!result.recommendations || result.recommendations.trim() === "")) {
        toast({ variant: "default", title: "Trends Identified (Empty)", description: "The AI process completed, but the output is empty. This might indicate no significant trends for the period." });
      } else {
        toast({ title: "Success", description: "Financial trends identified." });
      }
    } catch (err: any) {
      setGenerationError(err.message || "Failed to identify trends.");
      toast({ variant: "destructive", title: "Identification Failed", description: err.message || "Failed to identify trends." });
    } finally {
      setIsIdentifyingTrends(false);
    }
  };
  
  const handleDownloadPDF = () => {
    const printableContent = document.getElementById('printable-report-area');
    if (printableContent && (quarterlyReport || financialTrends)) {
        const style = document.createElement('style');
        style.setAttribute('type', 'text/css');
        style.innerHTML = `
            @media print {
              body * { visibility: hidden !important; }
              #printable-report-area, #printable-report-area * { visibility: visible !important; }
              #printable-report-area { 
                position: absolute !important; 
                left: 0 !important; 
                top: 0 !important; 
                width: 100% !important; 
                padding: 20px !important; 
                font-size: 12pt !important;
              }
              .no-print { display: none !important; }
              h1, h2, h3, p, pre, div, span { 
                color: #000000 !important; 
                background-color: #ffffff !important;
                border-color: #cccccc !important;
              }
              pre {
                page-break-inside: auto;
                white-space: pre-wrap !important;
                word-wrap: break-word !important;
              }
              .card-header, .card-content {
                padding: 10px !important;
              }
              .card {
                 border: 1px solid #eee !important;
                 margin-bottom: 20px !important;
                 page-break-inside: avoid !important;
              }
            }
        `;
        document.head.appendChild(style);
        window.print();
        document.head.removeChild(style); 
    } else {
        toast({ variant: "default", title: "Nothing to Download", description: "Please generate a report or identify trends first." });
    }
  };

  if (authLoading) {
    return <div className="flex justify-center items-center h-screen"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  }
  if (authError) {
    return <Alert variant="destructive"><AlertTriangle className="h-4 w-4" /><AlertTitle>Authentication Error</AlertTitle><AlertDescription>{authError.message}</AlertDescription></Alert>;
  }
  if (!authUser) {
    return <Alert variant="destructive"><AlertTriangle className="h-4 w-4" /><AlertTitle>Not Authenticated</AlertTitle><AlertDescription>Please log in to view reports.</AlertDescription></Alert>;
  }
  
  const noDataForQuarterlyReport = (
    !dataIsLoading &&
    !isLoadingIncome && !isLoadingTithes && !isLoadingExpenses && // Ensure all source data loaded
    incomeRecords !== undefined && titheRecords !== undefined && expenseRecords !== undefined && // Ensure records are not undefined
    isProcessedQuarterlyDataEffectivelyEmpty
  );
  
  const noDataForTrendAnalysis = (
    !dataIsLoading &&
    !isLoadingIncome && !isLoadingTithes && !isLoadingExpenses && // Ensure all source data loaded
    incomeRecords !== undefined && titheRecords !== undefined && expenseRecords !== undefined && // Ensure records are not undefined
    isProcessedTrendDataEffectivelyEmpty
  );

  const isQuarterlyReportGeneratedEmpty = (
      quarterlyReport && 
      (!quarterlyReport.reportSummary || quarterlyReport.reportSummary.trim() === "")
  );

  const isFinancialTrendsGeneratedEmpty = (
      financialTrends &&
      (!financialTrends.trends || financialTrends.trends.trim() === "") &&
      (!financialTrends.insights || financialTrends.insights.trim() === "") &&
      (!financialTrends.recommendations || financialTrends.recommendations.trim() === "")
  );


  // PARSER_CHECKPOINT: Just before main return statement
  return (
    <div className="space-y-6 md:space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center">
          <FileText className="mr-3 h-8 w-8 text-primary" />
          AI-Powered Financial Reports
        </h1>
        <Button onClick={handleDownloadPDF} disabled={(!quarterlyReport && !financialTrends) || dataIsLoading || isQuarterlyReportGeneratedEmpty || isFinancialTrendsGeneratedEmpty} className="no-print">
          <Download className="mr-2 h-4 w-4" />
          Download Report as PDF
        </Button>
      </div>

      {dataIsLoading && !authLoading && (
         <div className="flex justify-center items-center py-10"><Loader2 className="h-8 w-8 animate-spin text-primary" /><p className="ml-2">Loading financial data...</p></div>
      )}
      {dataError && !dataIsLoading && (
         <Alert variant="destructive" className="mt-4"><AlertTriangle className="h-4 w-4" /><AlertTitle>Data Error</AlertTitle><AlertDescription>{dataError.message}</AlertDescription></Alert>
      )}

      {generationError && (
        <Alert variant="destructive" className="no-print">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Generation Error</AlertTitle>
          <AlertDescription>{generationError}</AlertDescription>
        </Alert>
      )}
      
      {!dataIsLoading && !dataError && (
        <div id="printable-report-area">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Quarterly Summary Report</CardTitle>
              <CardDescription>Generate a financial summary for a specific quarter.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-4 no-print">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full sm:w-auto justify-start text-left font-normal" disabled={isGeneratingQuarterlyReport || isIdentifyingTrends}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDateQuarterly ? format(startDateQuarterly, "PPP") : <span>Pick start date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar mode="single" selected={startDateQuarterly} onSelect={setStartDateQuarterly} initialFocus />
                  </PopoverContent>
                </Popover>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full sm:w-auto justify-start text-left font-normal" disabled={isGeneratingQuarterlyReport || isIdentifyingTrends}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {endDateQuarterly ? format(endDateQuarterly, "PPP") : <span>Pick end date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar mode="single" selected={endDateQuarterly} onSelect={setEndDateQuarterly} initialFocus />
                  </PopoverContent>
                </Popover>
                <Button onClick={handleGenerateReport} disabled={isGeneratingQuarterlyReport || isIdentifyingTrends || noDataForQuarterlyReport}>
                  {isGeneratingQuarterlyReport ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LineChart className="mr-2 h-4 w-4" />}
                  Generate Summary
                </Button>
              </div>
              {noDataForQuarterlyReport && !isGeneratingQuarterlyReport && (
                   <Alert variant="default" className="mt-4 no-print">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertTitle>No Data for Period</AlertTitle>
                      <AlertDescription>There are no income, tithe, or expense records in the selected date range for the quarterly report. Please adjust the dates or add records.</AlertDescription>
                  </Alert>
              )}
              {quarterlyReport && (
                <div className="mt-4 p-4 border rounded-md bg-muted/5">
                  <h3 className="text-xl font-semibold mb-2 text-foreground">Generated Report:</h3>
                  {isQuarterlyReportGeneratedEmpty ? (
                     <p className="text-muted-foreground">The AI generated an empty report for this period, possibly due to no financial activity.</p>
                  ) : (
                    <pre className="whitespace-pre-wrap text-sm font-sans bg-background p-3 rounded-md shadow text-foreground">{quarterlyReport.reportSummary}</pre>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-lg mt-6">
            <CardHeader>
              <CardTitle>Financial Trends Analysis</CardTitle>
              <CardDescription>Identify key trends and insights from financial data over a period (default: last 12 months).</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-4 no-print">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full sm:w-auto justify-start text-left font-normal" disabled={isGeneratingQuarterlyReport || isIdentifyingTrends}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDateTrends ? format(startDateTrends, "PPP") : <span>Pick start date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar mode="single" selected={startDateTrends} onSelect={setStartDateTrends} initialFocus />
                  </PopoverContent>
                </Popover>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full sm:w-auto justify-start text-left font-normal" disabled={isGeneratingQuarterlyReport || isIdentifyingTrends}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {endDateTrends ? format(endDateTrends, "PPP") : <span>Pick end date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar mode="single" selected={endDateTrends} onSelect={setEndDateTrends} initialFocus />
                  </PopoverContent>
                </Popover>
                <Button onClick={handleIdentifyTrends} disabled={isIdentifyingTrends || isGeneratingQuarterlyReport || noDataForTrendAnalysis}>
                  {isIdentifyingTrends ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LineChart className="mr-2 h-4 w-4" />}
                  Identify Trends
                </Button>
              </div>
               {noDataForTrendAnalysis && !isIdentifyingTrends && (
                   <Alert variant="default" className="mt-4 no-print">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertTitle>No Data for Period</AlertTitle>
                      <AlertDescription>There are no income, tithe, or expense records in the selected date range for trend analysis. Please adjust the dates or add records.</AlertDescription>
                  </Alert>
              )}
              {financialTrends && (
                <div className="mt-4 p-4 border rounded-md bg-muted/5">
                  <h3 className="text-xl font-semibold mb-2 text-foreground">Identified Trends & Insights:</h3>
                  {isFinancialTrendsGeneratedEmpty ? (
                     <p className="text-muted-foreground">The AI process completed but returned no specific trends, insights, or recommendations for this period.</p>
                  ) : (
                    <div className="space-y-3">
                      <div>
                        <h4 className="font-medium text-foreground">Key Trends:</h4>
                        <pre className="whitespace-pre-wrap text-sm font-sans bg-background p-3 rounded-md shadow text-foreground">{financialTrends.trends || "No specific trends identified."}</pre>
                      </div>
                      <div>
                        <h4 className="font-medium text-foreground">Insights for Planning:</h4>
                        <pre className="whitespace-pre-wrap text-sm font-sans bg-background p-3 rounded-md shadow text-foreground">{financialTrends.insights || "No specific insights provided."}</pre>
                      </div>
                      <div>
                        <h4 className="font-medium text-foreground">Recommendations:</h4>
                        <pre className="whitespace-pre-wrap text-sm font-sans bg-background p-3 rounded-md shadow text-foreground">{financialTrends.recommendations || "No specific recommendations available."}</pre>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

