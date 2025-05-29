
"use client";

import React, { useMemo } from 'react';
import { StatCard } from '@/components/dashboard/stat-card';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { DollarSign, Users, HandCoins, Landmark, LineChart, TrendingUp, TrendingDown, Loader2, AlertTriangle, ReceiptText } from 'lucide-react';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from '@/components/ui/chart';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer, LabelList } from 'recharts';
import type { ChartConfig } from '@/components/ui/chart';
import { auth, db } from '@/lib/firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { useCollectionData } from 'react-firebase-hooks/firestore';
import { collection, query, orderBy, Timestamp, where, type DocumentData, type QueryDocumentSnapshot, type SnapshotOptions } from 'firebase/firestore';
import type { IncomeRecord, TitheRecord, ExpenseRecord, IncomeRecordFirestore, TitheRecordFirestore, ExpenseRecordFirestore } from '@/types';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

// Firestore Converters
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


// Mock data for parts not yet connected to real-time Firestore data
const MOCK_PREVIOUS_PERIOD_TOTAL_INCOME = 2000000; // XAF


export default function DashboardPage() {
  const [authUser, authLoading, authError] = useAuthState(auth);

  const incomeCollectionRef = authUser ? collection(db, 'income_records') : null;
  const incomeQuery = incomeCollectionRef 
    ? query(incomeCollectionRef, orderBy('date', 'desc')).withConverter<IncomeRecord>(incomeConverter)
    : null;
  const [incomeRecords, isLoadingIncome, errorIncome] = useCollectionData(incomeQuery);

  const tithesCollectionRef = authUser ? collection(db, 'tithe_records') : null;
  const tithesQuery = tithesCollectionRef
    ? query(tithesCollectionRef, orderBy('date', 'desc')).withConverter<TitheRecord>(titheConverter)
    : null;
  const [titheRecords, isLoadingTithes, errorTithes] = useCollectionData(tithesQuery);

  const expensesCollectionRef = authUser ? collection(db, 'expense_records') : null;
  const expensesQuery = expensesCollectionRef
    ? query(expensesCollectionRef, orderBy('date', 'desc')).withConverter<ExpenseRecord>(expenseConverter)
    : null;
  const [expenseRecords, isLoadingExpenses, errorExpenses] = useCollectionData(expensesQuery);


  const financialSummary = useMemo(() => {
    let totalOfferings = 0;
    let otherIncome = 0;
    
    incomeRecords?.forEach(record => {
      if (record.category === "Offering") {
        totalOfferings += record.amount;
      } else if (record.category === "Donation" || record.category === "Other") {
        otherIncome += record.amount;
      }
    });

    const totalTithes = titheRecords?.reduce((sum, record) => sum + record.amount, 0) || 0;
    const totalIncome = totalOfferings + totalTithes + otherIncome;
    const totalExpenses = expenseRecords?.reduce((sum, record) => sum + record.amount, 0) || 0;


    return { totalOfferings, totalTithes, otherIncome, totalIncome, totalExpenses };
  }, [incomeRecords, titheRecords, expenseRecords]);

  const { totalOfferings, totalTithes, otherIncome, totalIncome, totalExpenses } = financialSummary;
  
  const incomeChangePercentage = totalIncome && MOCK_PREVIOUS_PERIOD_TOTAL_INCOME
    ? ((totalIncome - MOCK_PREVIOUS_PERIOD_TOTAL_INCOME) / MOCK_PREVIOUS_PERIOD_TOTAL_INCOME) * 100
    : 0;

  const monthlyChartData = useMemo(() => {
    const dataForLast6Months: { month: string; income: number; expenses: number }[] = [];
    const today = new Date();

    for (let i = 5; i >= 0; i--) {
      const targetMonthDate = subMonths(today, i);
      const monthName = format(targetMonthDate, "MMM");
      const monthStart = startOfMonth(targetMonthDate);
      const monthEnd = endOfMonth(targetMonthDate);

      let monthlyIncomeTotal = 0;
      incomeRecords?.forEach(record => {
        if (record.date >= monthStart && record.date <= monthEnd) {
          monthlyIncomeTotal += record.amount;
        }
      });
      titheRecords?.forEach(record => {
        if (record.date >= monthStart && record.date <= monthEnd) {
          monthlyIncomeTotal += record.amount;
        }
      });
      
      let monthlyExpensesTotal = 0;
      expenseRecords?.forEach(record => {
        if (record.date >= monthStart && record.date <= monthEnd) {
          monthlyExpensesTotal += record.amount;
        }
      });

      dataForLast6Months.push({
        month: monthName,
        income: monthlyIncomeTotal,
        expenses: monthlyExpensesTotal,
      });
    }
    return dataForLast6Months;
  }, [incomeRecords, titheRecords, expenseRecords]);
  
  const incomeBreakdownData = useMemo(() => [
    { name: 'Offerings', value: totalOfferings, fill: "hsl(var(--chart-1))" },
    { name: 'Tithes', value: totalTithes, fill: "hsl(var(--chart-2))" },
    { name: 'Other', value: otherIncome, fill: "hsl(var(--chart-3))" },
  ], [totalOfferings, totalTithes, otherIncome]);

  const incomeChartConfig = {
    income: { label: "Income", color: "hsl(var(--chart-1))" },
    expenses: { label: "Expenses", color: "hsl(var(--chart-2))" },
  } satisfies ChartConfig;

  const formatCurrency = (value: number) => {
    return `${value.toLocaleString('fr-CM', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} XAF`;
  };
  
  const formatCurrencyWithDecimals = (value: number) => {
     return `${value.toLocaleString('fr-CM', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} XAF`;
  };

  if (authLoading) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-100px)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (authError) {
    return (
      <Alert variant="destructive" className="mt-4">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Authentication Error</AlertTitle>
        <AlertDescription>{authError.message}</AlertDescription>
      </Alert>
    );
  }
  
  if (!authUser) {
     return (
      <Alert variant="destructive" className="mt-4">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Not Authenticated</AlertTitle>
        <AlertDescription>Please log in to view the dashboard.</AlertDescription>
      </Alert>
    );
  }

  if (isLoadingIncome || isLoadingTithes || isLoadingExpenses) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-100px)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-2">Loading financial data...</p>
      </div>
    );
  }

  if (errorIncome || errorTithes || errorExpenses) {
    return (
      <Alert variant="destructive" className="mt-4">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Error Loading Data</AlertTitle>
        <AlertDescription>
          {errorIncome?.message || errorTithes?.message || errorExpenses?.message || "Could not load financial data."}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6 md:space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Dashboard</h1>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
        <StatCard
          title="Total Offerings"
          value={formatCurrency(totalOfferings)}
          icon={HandCoins}
          description="All offerings received"
        />
        <StatCard
          title="Total Tithes"
          value={formatCurrency(totalTithes)}
          icon={Users}
          description="Tithes from members"
        />
        <StatCard
          title="Other Income"
          value={formatCurrency(otherIncome)}
          icon={Landmark}
          description="Donations, events, etc."
        />
        <StatCard
          title="Total Income"
          value={formatCurrency(totalIncome)}
          icon={LineChart}
          description={
            <span className={`flex items-center ${incomeChangePercentage >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
              {incomeChangePercentage >= 0 ? <TrendingUp className="h-4 w-4 mr-1" /> : <TrendingDown className="h-4 w-4 mr-1" />}
              {incomeChangePercentage.toLocaleString('fr-CM', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}% from last period (mock)
            </span>
          }
          iconClassName={incomeChangePercentage >= 0 ? 'text-emerald-500' : 'text-red-500'}
        />
         <StatCard
          title="Total Expenses"
          value={formatCurrency(totalExpenses)}
          icon={ReceiptText}
          description="All recorded expenses"
          className="xl:col-span-1" // Ensures it doesn't try to span if not enough space
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Income vs Expenses Overview</CardTitle>
            <CardDescription>Monthly income and expenses (real-time) for the last 6 months.</CardDescription>
          </CardHeader>
          <CardContent className="h-[350px] p-2">
            <ChartContainer config={incomeChartConfig} className="w-full h-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyChartData} margin={{ top: 20, right: 0, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
                  <YAxis tickFormatter={(value) => `${(value / 1000).toLocaleString('fr-CM', { maximumFractionDigits: 0 })}k XAF`} tickLine={false} axisLine={false} tickMargin={8} width={80} />
                  <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dot" formatter={(value, name, props) => {
                     const formattedValue = (props.payload?.name === 'Income' || props.payload?.name === 'Expenses') 
                                          ? formatCurrency(Number(value))
                                          : `${Number(value).toLocaleString('fr-CM')} XAF`; 
                     return (
                        <div className="flex flex-col">
                          <span className="text-muted-foreground">{props.payload?.month}</span>
                          <span className="font-semibold">{`${name}: ${formattedValue}`}</span>
                        </div>
                     );
                  }} />} />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Bar dataKey="income" fill="var(--color-income)" radius={[4, 4, 0, 0]} name="Income" />
                  <Bar dataKey="expenses" fill="var(--color-expenses)" radius={[4, 4, 0, 0]} name="Expenses"/>
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Income Breakdown</CardTitle>
            <CardDescription>Distribution of real-time income sources.</CardDescription>
          </CardHeader>
          <CardContent className="h-[350px] p-2">
             <ChartContainer config={{}} className="w-full h-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={incomeBreakdownData} layout="vertical" margin={{ top: 20, right: 50, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tickFormatter={(value) => `${(value / 1000).toLocaleString('fr-CM', { maximumFractionDigits: 0 })}k XAF`} />
                  <YAxis dataKey="name" type="category" width={80} tickLine={false} axisLine={false} />
                  <ChartTooltip cursor={false} content={<ChartTooltipContent formatter={(value, name) => {
                     return (
                        <div className="flex flex-col">
                          <span className="font-semibold">{`${name}: ${formatCurrency(Number(value))}`}</span>
                        </div>
                     );
                  }} />} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                     <LabelList 
                       dataKey="value" 
                       position="right" 
                       formatter={(value: number) => formatCurrency(Number(value))} 
                       className="fill-foreground text-xs"
                     />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
      <Alert variant="default" className="bg-muted/50">
        <AlertTriangle className="h-4 w-4 text-muted-foreground" />
        <AlertTitle className="text-muted-foreground">Note</AlertTitle>
        <AlertDescription className="text-muted-foreground">
          The "percentage from last period" for total income is currently using mock values. Historical comparison will be implemented in a future update.
        </AlertDescription>
      </Alert>
    </div>
  );
}

    