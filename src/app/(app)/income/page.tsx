
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CalendarIcon, PlusCircle, Trash2, Loader2, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import type { IncomeRecord, IncomeCategory } from '@/types';
import { addIncomeRecord, getIncomeRecords, deleteIncomeRecord } from '@/services/incomeService';
import { useToast } from "@/hooks/use-toast";
import { auth } from '@/lib/firebase'; // For checking auth state
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

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

export default function IncomePage() {
  const [incomeRecords, setIncomeRecords] = useState<IncomeRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const [user, setUser] = useState(auth.currentUser);

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

  const fetchRecords = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      setError("User not authenticated. Please log in.");
      setIncomeRecords([]); // Clear records if user logs out
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const records = await getIncomeRecords();
      setIncomeRecords(records);
    } catch (err) {
      console.error(err);
      setError("Failed to fetch income records.");
      toast({ variant: "destructive", title: "Error", description: "Could not fetch income records." });
    } finally {
      setIsLoading(false);
    }
  }, [user, toast]);


  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        fetchRecords();
      } else {
        // Handle user logged out state
        setIncomeRecords([]);
        setIsLoading(false);
        setError("Please log in to manage income records.");
      }
    });
    return () => unsubscribe(); // Cleanup subscription
  }, [fetchRecords]);


  const onSubmit = async (data: IncomeFormValues) => {
    if (!user) {
      toast({ variant: "destructive", title: "Error", description: "You must be logged in to add income." });
      return;
    }
    try {
      const newRecordId = await addIncomeRecord({
        ...data,
        category: data.category as IncomeCategory,
      });
      // Optimistically update UI or re-fetch
      // For simplicity, re-fetching:
      await fetchRecords();
      form.reset();
      toast({ title: "Success", description: "Income record saved successfully." });
    } catch (err) {
      console.error(err);
      toast({ variant: "destructive", title: "Error", description: "Failed to save income record." });
    }
  };
  
  const handleDeleteRecord = async (id: string) => {
    try {
      await deleteIncomeRecord(id);
      // Optimistically update UI or re-fetch
      setIncomeRecords(prev => prev.filter(record => record.id !== id));
      toast({ title: "Deleted", description: "Income record deleted successfully." });
    } catch (err) {
      console.error(err);
      toast({ variant: "destructive", title: "Error", description: "Failed to delete income record." });
    }
  };

  const formatCurrency = (value: number) => {
    return `${value.toLocaleString('fr-CM', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} XAF`;
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
          {!user && (
            <Alert variant="destructive" className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Authentication Required</AlertTitle>
              <AlertDescription>Please log in to add or view income records.</AlertDescription>
            </Alert>
          )}
          {user && (
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
                      <FormLabel>Amount (XAF)</FormLabel>
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
                        <FormLabel>Member Name (Optional for 'Tithe' category)</FormLabel>
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
                
                <Button type="submit" className="w-full md:w-auto" disabled={form.formState.isSubmitting || !user}>
                  {form.formState.isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
                   Save Income
                </Button>
              </form>
            </Form>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Recent Income Records</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading && (
            <div className="flex justify-center items-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="ml-2">Loading records...</p>
            </div>
          )}
          {!isLoading && error && (
             <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {!isLoading && !error && !user && (
             <p className="text-center text-muted-foreground py-10">Please log in to view income records.</p>
          )}
          {!isLoading && !error && user && incomeRecords.length === 0 && (
            <p className="text-center text-muted-foreground py-10">No income records yet. Add one above!</p>
          )}
          {!isLoading && !error && user && incomeRecords.length > 0 && (
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
                {incomeRecords.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell>{format(record.date, "PP")}</TableCell>
                    <TableCell>{record.category}</TableCell>
                    <TableCell>{formatCurrency(record.amount)}</TableCell>
                    <TableCell>{record.memberName || 'N/A'}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{record.description || 'N/A'}</TableCell>
                    <TableCell className="text-right">
                       <Button variant="ghost" size="icon" onClick={() => handleDeleteRecord(record.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                          <span className="sr-only">Delete</span>
                       </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
