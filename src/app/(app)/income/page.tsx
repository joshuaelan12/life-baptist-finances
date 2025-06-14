
"use client";

import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
import type { IncomeRecord, IncomeCategory, IncomeRecordFirestore } from '@/types';
import { addIncomeRecord, deleteIncomeRecord } from '@/services/incomeService';
import { useToast } from "@/hooks/use-toast";
import { auth, db } from '@/lib/firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { useCollectionData } from 'react-firebase-hooks/firestore';
import { collection, query, orderBy, Timestamp, type DocumentData, type QueryDocumentSnapshot, type SnapshotOptions } from 'firebase/firestore';
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

const incomeConverter = {
  toFirestore(record: IncomeRecord): DocumentData {
    const { id, date, createdAt, recordedByUserId, ...rest } = record;
    const data: any = {
      ...rest,
      date: Timestamp.fromDate(date),
    };
    if (recordedByUserId) data.recordedByUserId = recordedByUserId;
    return data;
  },
  fromFirestore(
    snapshot: QueryDocumentSnapshot,
    options: SnapshotOptions
  ): IncomeRecord {
    const data = snapshot.data(options) as Omit<IncomeRecordFirestore, 'id'>;
    const date = data.date instanceof Timestamp ? data.date.toDate() : new Date();
    const createdAt = data.createdAt instanceof Timestamp ? data.createdAt.toDate() : undefined;

    return {
      id: snapshot.id,
      date: date,
      category: data.category,
      amount: data.amount,
      description: data.description,
      memberName: data.memberName,
      recordedByUserId: data.recordedByUserId,
      createdAt: createdAt,
    };
  }
};

export default function IncomePage() {
  const { toast } = useToast();
  const [authUser, authLoading, authError] = useAuthState(auth);

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

  const incomeCollectionRef = authUser ? collection(db, 'income_records') : null;
  const incomeQuery = incomeCollectionRef
    ? query(incomeCollectionRef, orderBy('date', 'desc')).withConverter<IncomeRecord>(incomeConverter)
    : null;

  const [incomeRecords, isLoadingData, errorData] = useCollectionData(incomeQuery);

  const onSubmit = async (data: IncomeFormValues) => {
    if (!authUser?.uid || !authUser.email) {
      toast({ variant: "destructive", title: "Error", description: "You must be logged in to add income." });
      return;
    }
    try {
      await addIncomeRecord(
        { ...data, category: data.category as IncomeCategory },
        authUser.uid,
        authUser.displayName || authUser.email
      );
      form.reset({ date: new Date(), category: undefined, amount: 0, description: "", memberName: "" });
      toast({ title: "Success", description: "Income record saved successfully." });
    } catch (err) {
      console.error(err);
      toast({ variant: "destructive", title: "Error", description: "Failed to save income record." });
    }
  };

  const handleDeleteRecord = async (id: string) => {
    if (!authUser?.uid || !authUser.email) {
      toast({ variant: "destructive", title: "Error", description: "You must be logged in to delete records." });
      return;
    }
    try {
      await deleteIncomeRecord(id, authUser.uid, authUser.displayName || authUser.email);
      toast({ title: "Deleted", description: "Income record deleted successfully." });
    } catch (err) {
      console.error(err);
      toast({ variant: "destructive", title: "Error", description: "Failed to delete income record." });
    }
  };

  const formatCurrency = (value: number) => {
    return `${value.toLocaleString('fr-CM', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} XAF`;
  };

  if (authLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-lg">Loading user...</p>
      </div>
    );
  }

  if (authError) {
     return (
      <div className="space-y-6 md:space-y-8 p-4">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Authentication Error</AlertTitle>
          <AlertDescription>Could not load user session: {authError.message}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6 md:space-y-8">
      <h1 className="text-3xl font-bold tracking-tight text-foreground">Record Income</h1>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Add New Income</CardTitle>
          <CardDescription>Enter the details of the income received.</CardDescription>
        </CardHeader>
        <CardContent>
          {!authUser && (
            <Alert variant="destructive" className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Authentication Required</AlertTitle>
              <AlertDescription>Please log in to add or view income records.</AlertDescription>
            </Alert>
          )}
          {authUser && (
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
                                disabled={form.formState.isSubmitting}
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
                        <Select onValueChange={field.onChange} value={field.value} disabled={form.formState.isSubmitting}>
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
                        <Input type="number" placeholder="0.00" {...field} step="0.01" disabled={form.formState.isSubmitting}/>
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
                        <FormLabel>Member Name (For 'Tithe' category)</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter member's name" {...field} disabled={form.formState.isSubmitting}/>
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
                        <Textarea placeholder="E.g., Special offering for youth ministry" {...field} disabled={form.formState.isSubmitting}/>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit" className="w-full md:w-auto" disabled={form.formState.isSubmitting || !authUser}>
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
          {isLoadingData && (
            <div className="flex justify-center items-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="ml-2">Loading records...</p>
            </div>
          )}
          {!isLoadingData && errorData && (
             <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Error Loading Records</AlertTitle>
              <AlertDescription>{errorData.message}</AlertDescription>
            </Alert>
          )}
          {!isLoadingData && !errorData && !authUser && (
             <p className="text-center text-muted-foreground py-10">Please log in to view income records.</p>
          )}
          {!isLoadingData && !errorData && authUser && (!incomeRecords || incomeRecords.length === 0) && (
            <p className="text-center text-muted-foreground py-10">No income records yet. Add one above!</p>
          )}
          {!isLoadingData && !errorData && authUser && incomeRecords && incomeRecords.length > 0 && (
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
                    <TableCell className="max-w-[200px] truncate" title={record.description}>{record.description || 'N/A'}</TableCell>
                    <TableCell className="text-right">
                       <Button variant="ghost" size="icon" onClick={() => handleDeleteRecord(record.id)} disabled={!authUser || form.formState.isSubmitting}>
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
