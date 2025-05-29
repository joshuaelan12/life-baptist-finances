"use client";

import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CalendarIcon, PlusCircle, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import type { IncomeRecord, IncomeCategory } from '@/types';

const incomeSchema = z.object({
  date: z.date({ required_error: "Date is required." }),
  category: z.enum(["Offering", "Tithe", "Donation", "Other"], { required_error: "Category is required." }),
  amount: z.coerce.number().positive({ message: "Amount must be positive." }),
  description: z.string().optional(),
  memberName: z.string().optional(),
}).refine(data => data.category !== "Tithe" || (data.category === "Tithe" && data.memberName && data.memberName.length > 0), {
  message: "Member name is required for tithes.",
  path: ["memberName"],
});

type IncomeFormValues = z.infer<typeof incomeSchema>;

const initialIncomeRecords: IncomeRecord[] = [
  { id: '1', date: new Date(2023, 10, 5), category: 'Tithe', amount: 250, memberName: 'John Doe', description: 'November Tithe' },
  { id: '2', date: new Date(2023, 10, 12), category: 'Offering', amount: 500, description: 'Sunday Offering' },
  { id: '3', date: new Date(2023, 10, 15), category: 'Donation', amount: 1000, description: 'Building Fund' },
];


export default function IncomePage() {
  const [incomeRecords, setIncomeRecords] = useState<IncomeRecord[]>(initialIncomeRecords);

  const form = useForm<IncomeFormValues>({
    resolver: zodResolver(incomeSchema),
    defaultValues: {
      date: new Date(),
      category: undefined,
      amount: 0,
      description: "",
      memberName: "",
    },
  });

  const selectedCategory = form.watch("category");

  const onSubmit = (data: IncomeFormValues) => {
    const newRecord: IncomeRecord = {
      id: String(Date.now()),
      ...data,
      category: data.category as IncomeCategory, // Ensure category is of type IncomeCategory
    };
    setIncomeRecords(prev => [newRecord, ...prev]);
    form.reset();
    console.log("New income record:", newRecord);
  };
  
  const handleDeleteRecord = (id: string) => {
    setIncomeRecords(prev => prev.filter(record => record.id !== id));
  };


  return (
    <div className="space-y-6 md:space-y-8">
      <h1 className="text-3xl font-bold tracking-tight text-foreground">Record Income</h1>
      
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Add New Income</CardTitle>
          <CardDescription>Enter the details of the income received.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={`w-full pl-3 text-left font-normal ${!field.value && "text-muted-foreground"}`}
                            >
                              {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select income category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Offering">Offering</SelectItem>
                          <SelectItem value="Tithe">Tithe</SelectItem>
                          <SelectItem value="Donation">Donation</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount ($)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="0.00" {...field} step="0.01" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {selectedCategory === "Tithe" && (
                <FormField
                  control={form.control}
                  name="memberName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Member Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter member's name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Textarea placeholder="E.g., Special offering for youth ministry" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <Button type="submit" className="w-full md:w-auto">
                <PlusCircle className="mr-2 h-4 w-4" /> Save Income
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Recent Income Records</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Member</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {incomeRecords.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">No income records yet.</TableCell>
                </TableRow>
              ) : (
                incomeRecords.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell>{format(record.date, "PP")}</TableCell>
                    <TableCell>{record.category}</TableCell>
                    <TableCell>${record.amount.toFixed(2)}</TableCell>
                    <TableCell>{record.memberName || 'N/A'}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{record.description || 'N/A'}</TableCell>
                    <TableCell className="text-right">
                       <Button variant="ghost" size="icon" onClick={() => handleDeleteRecord(record.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                          <span className="sr-only">Delete</span>
                       </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
