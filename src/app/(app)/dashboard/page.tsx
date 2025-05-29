"use client";

import { StatCard } from '@/components/dashboard/stat-card';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { DollarSign, Users, HandCoins, Landmark, LineChart, BarChart3, TrendingUp, TrendingDown } from 'lucide-react';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from '@/components/ui/chart';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer, LabelList } from 'recharts';
import type { ChartConfig } from '@/components/ui/chart';

const MOCK_FINANCIAL_DATA = {
  totalOfferings: 12500.75,
  totalTithes: 8750.50,
  otherIncome: 3200.00,
  previousPeriodTotalIncome: 20000.00,
};

const totalIncome = MOCK_FINANCIAL_DATA.totalOfferings + MOCK_FINANCIAL_DATA.totalTithes + MOCK_FINANCIAL_DATA.otherIncome;
const incomeChangePercentage = ((totalIncome - MOCK_FINANCIAL_DATA.previousPeriodTotalIncome) / MOCK_FINANCIAL_DATA.previousPeriodTotalIncome) * 100;


const incomeChartData = [
  { month: "Jan", income: 4500, expenses: 2000 },
  { month: "Feb", income: 5200, expenses: 2300 },
  { month: "Mar", income: 6100, expenses: 2800 },
  { month: "Apr", income: 5800, expenses: 2500 },
  { month: "May", income: 6500, expenses: 3000 },
  { month: "Jun", income: 7200, expenses: 3200 },
];

const incomeChartConfig = {
  income: {
    label: "Income",
    color: "hsl(var(--chart-1))",
  },
  expenses: {
    label: "Expenses",
    color: "hsl(var(--chart-2))",
  },
} satisfies ChartConfig;

const incomeBreakdownData = [
  { name: 'Offerings', value: MOCK_FINANCIAL_DATA.totalOfferings, fill: "hsl(var(--chart-1))" },
  { name: 'Tithes', value: MOCK_FINANCIAL_DATA.totalTithes, fill: "hsl(var(--chart-2))" },
  { name: 'Other', value: MOCK_FINANCIAL_DATA.otherIncome, fill: "hsl(var(--chart-3))" },
];


export default function DashboardPage() {
  return (
    <div className="space-y-6 md:space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Dashboard</h1>
        {/* Add any header actions here if needed, e.g., date range picker */}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Offerings"
          value={`$${MOCK_FINANCIAL_DATA.totalOfferings.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          icon={HandCoins}
          description="All offerings received this period"
        />
        <StatCard
          title="Total Tithes"
          value={`$${MOCK_FINANCIAL_DATA.totalTithes.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          icon={Users}
          description="Tithes from members"
        />
        <StatCard
          title="Other Income"
          value={`$${MOCK_FINANCIAL_DATA.otherIncome.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          icon={Landmark}
          description="Donations, events, etc."
        />
        <StatCard
          title="Total Income"
          value={`$${totalIncome.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          icon={LineChart}
          description={
            <span className={`flex items-center ${incomeChangePercentage >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
              {incomeChangePercentage >= 0 ? <TrendingUp className="h-4 w-4 mr-1" /> : <TrendingDown className="h-4 w-4 mr-1" />}
              {incomeChangePercentage.toFixed(1)}% from last period
            </span>
          }
          iconClassName={incomeChangePercentage >= 0 ? 'text-emerald-500' : 'text-red-500'}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Income vs Expenses Overview</CardTitle>
            <CardDescription>Monthly income and expenses for the last 6 months.</CardDescription>
          </CardHeader>
          <CardContent className="h-[350px] p-2">
            <ChartContainer config={incomeChartConfig} className="w-full h-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={incomeChartData} margin={{ top: 20, right: 0, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
                  <YAxis tickFormatter={(value) => `$${value / 1000}k`} tickLine={false} axisLine={false} tickMargin={8} />
                  <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dot" />} />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Bar dataKey="income" fill="var(--color-income)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expenses" fill="var(--color-expenses)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Income Breakdown</CardTitle>
            <CardDescription>Distribution of income sources for the current period.</CardDescription>
          </CardHeader>
          <CardContent className="h-[350px] p-2">
             <ChartContainer config={{}} className="w-full h-full"> {/* Empty config, colors from data */}
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={incomeBreakdownData} layout="vertical" margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tickFormatter={(value) => `$${value / 1000}k`} />
                  <YAxis dataKey="name" type="category" width={80} tickLine={false} axisLine={false} />
                  <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                     <LabelList dataKey="value" position="right" formatter={(value: number) => `$${value.toLocaleString()}`} className="fill-foreground text-xs"/>
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
