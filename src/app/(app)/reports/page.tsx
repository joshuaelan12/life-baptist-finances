"use client";

import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Sparkles } from "lucide-react";
import { generateFinancialReport, IdentifyFinancialTrendsInput, IdentifyFinancialTrendsOutput, GenerateFinancialReportInput, GenerateFinancialReportOutput } from '@/ai/flows'; // Assuming flows are exported from an index
import { identifyFinancialTrends } from '@/ai/flows';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';


const sampleQuarterlyData = {
  "quarter": "Q4 2023",
  "income": {
    "offerings": 12500,
    "tithes": 8750,
    "donations": 3000,
    "other": 200
  },
  "expenses": {
    "salaries": 7000,
    "ministries": 4500,
    "utilities": 1200,
    "outreach": 1500,
    "other": 500
  },
  "summary": "Overall positive quarter with strong giving."
};

const sampleTrendData = {
  "monthly_records": [
    {"month": "2023-01", "income": 5000, "expenses": 3000, "giving_patterns": {"online": 2000, "cash_check": 3000}},
    {"month": "2023-02", "income": 5200, "expenses": 3100, "giving_patterns": {"online": 2200, "cash_check": 3000}},
    {"month": "2023-03", "income": 5500, "expenses": 3200, "giving_patterns": {"online": 2500, "cash_check": 3000}},
    {"month": "2023-04", "income": 5300, "expenses": 3000, "giving_patterns": {"online": 2300, "cash_check": 3000}},
    {"month": "2023-05", "income": 5800, "expenses": 3300, "giving_patterns": {"online": 2800, "cash_check": 3000}},
    {"month": "2023-06", "income": 6000, "expenses": 3500, "giving_patterns": {"online": 3000, "cash_check": 3000}},
    {"month": "2023-07", "income": 6200, "expenses": 3600, "giving_patterns": {"online": 3200, "cash_check": 3000}},
    {"month": "2023-08", "income": 6100, "expenses": 3500, "giving_patterns": {"online": 3100, "cash_check": 3000}},
    {"month": "2023-09", "income": 6500, "expenses": 3800, "giving_patterns": {"online": 3500, "cash_check": 3000}},
    {"month": "2023-10", "income": 6700, "expenses": 3900, "giving_patterns": {"online": 3700, "cash_check": 3000}},
    {"month": "2023-11", "income": 7000, "expenses": 4000, "giving_patterns": {"online": 4000, "cash_check": 3000}},
    {"month": "2023-12", "income": 7500, "expenses": 4200, "giving_patterns": {"online": 4500, "cash_check": 3000}}
  ]
};


export default function ReportsPage() {
  const [quarterlyDataInput, setQuarterlyDataInput] = useState(JSON.stringify(sampleQuarterlyData, null, 2));
  const [trendDataInput, setTrendDataInput] = useState(JSON.stringify(sampleTrendData, null, 2));
  
  const [quarterlyReport, setQuarterlyReport] = useState<GenerateFinancialReportOutput | null>(null);
  const [financialTrends, setFinancialTrends] = useState<IdentifyFinancialTrendsOutput | null>(null);
  
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [isIdentifyingTrends, setIsIdentifyingTrends] = useState(false);

  const [reportError, setReportError] = useState<string | null>(null);
  const [trendsError, setTrendsError] = useState<string | null>(null);

  const handleGenerateReport = async () => {
    setIsGeneratingReport(true);
    setReportError(null);
    setQuarterlyReport(null);
    try {
      const input: GenerateFinancialReportInput = { financialData: quarterlyDataInput };
      const result = await generateFinancialReport(input);
      setQuarterlyReport(result);
    } catch (error) {
      console.error("Error generating report:", error);
      setReportError("Failed to generate report. Please check the data and try again.");
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const handleIdentifyTrends = async () => {
    setIsIdentifyingTrends(true);
    setTrendsError(null);
    setFinancialTrends(null);
    try {
      const input: IdentifyFinancialTrendsInput = { financialData: trendDataInput };
      const result = await identifyFinancialTrends(input);
      setFinancialTrends(result);
    } catch (error) {
      console.error("Error identifying trends:", error);
      setTrendsError("Failed to identify trends. Please check the data and try again.");
    } finally {
      setIsIdentifyingTrends(false);
    }
  };

  return (
    <div className="space-y-6 md:space-y-8">
      <h1 className="text-3xl font-bold tracking-tight text-foreground">AI-Powered Financial Reports</h1>
      
      <div className="grid md:grid-cols-2 gap-6">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Generate Quarterly Report</CardTitle>
            <CardDescription>Provide financial data for the past quarter (JSON format) to generate a summary report.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder="Paste quarterly financial data here (JSON)"
              value={quarterlyDataInput}
              onChange={(e) => setQuarterlyDataInput(e.target.value)}
              rows={10}
              className="font-mono text-sm"
            />
            <Button onClick={handleGenerateReport} disabled={isGeneratingReport} className="w-full md:w-auto">
              {isGeneratingReport ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="mr-2 h-4 w-4" />
              )}
              Generate Report
            </Button>
            {reportError && <Alert variant="destructive"><AlertTitle>Error</AlertTitle><AlertDescription>{reportError}</AlertDescription></Alert>}
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
            <CardDescription>Provide financial data for the last 12 months (JSON format) to identify trends, insights, and recommendations.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder="Paste 12-month financial data here (JSON)"
              value={trendDataInput}
              onChange={(e) => setTrendDataInput(e.target.value)}
              rows={10}
              className="font-mono text-sm"
            />
            <Button onClick={handleIdentifyTrends} disabled={isIdentifyingTrends} className="w-full md:w-auto">
              {isIdentifyingTrends ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="mr-2 h-4 w-4" />
              )}
              Identify Trends
            </Button>
            {trendsError && <Alert variant="destructive"><AlertTitle>Error</AlertTitle><AlertDescription>{trendsError}</AlertDescription></Alert>}
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
