// This file is machine-generated - DO NOT EDIT!

'use server';

/**
 * @fileOverview Generates a financial report summarizing the financial data.
 *
 * - generateFinancialReport - A function that generates a financial report.
 * - GenerateFinancialReportInput - The input type for the generateFinancialReport function.
 * - GenerateFinancialReportOutput - The return type for the generateFinancialReport function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateFinancialReportInputSchema = z.object({
  financialData: z
    .string()
    .describe('Financial data for the past quarter in JSON format.'),
});
export type GenerateFinancialReportInput = z.infer<
  typeof GenerateFinancialReportInputSchema
>;

const GenerateFinancialReportOutputSchema = z.object({
  reportSummary: z
    .string()
    .describe('A summary report of the financial data from the past quarter.'),
});
export type GenerateFinancialReportOutput = z.infer<
  typeof GenerateFinancialReportOutputSchema
>;

export async function generateFinancialReport(
  input: GenerateFinancialReportInput
): Promise<GenerateFinancialReportOutput> {
  return generateFinancialReportFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateFinancialReportPrompt',
  input: {schema: GenerateFinancialReportInputSchema},
  output: {schema: GenerateFinancialReportOutputSchema},
  prompt: `You are a financial expert. Generate a summary report of the financial data from the past quarter.

  Financial Data: {{{financialData}}} `,
});

const generateFinancialReportFlow = ai.defineFlow(
  {
    name: 'generateFinancialReportFlow',
    inputSchema: GenerateFinancialReportInputSchema,
    outputSchema: GenerateFinancialReportOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
