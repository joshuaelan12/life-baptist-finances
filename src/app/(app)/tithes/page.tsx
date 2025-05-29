
"use client";

import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CalendarIcon, UserCheck, PlusCircle, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import type { TitheRecord } from '@/types';

const titheSchema = z.object({
  memberName: z.string().min(2, { message: "Member name must be at least 2 characters." }),
  date: z.date({ required_error: "Date is required." }),
  amount: z.coerce.number().positive({ message: "Amount must be positive." }),
});

type TitheFormValues = z.infer<typeof titheSchema>;

const initialTitheRecords: TitheRecord[] = [
  { id: 't1', memberName: 'Alice Wonderland', date: new Date(2023, 10, 5), amount: 15000.00 },
  { id: 't2', memberName: 'Bob The Builder', date: new Date(2023, 10, 12), amount: 20050.00 },
  { id: 't3', memberName: 'Charlie Brown', date: new Date(2023, 10, 19), amount: 17575.00 },
];

export default function TithesPage() {
  const [titheRecords, setTitheRecords] = useState<TitheRecord[]>(initialTitheRecords);

  const form = useForm<TitheFormValues>({
    resolver: zodResolver(titheSchema),
    defaultValues: {
      memberName: "",
      date: new Date(),
      amount: 0,
    },
  });

  const onSubmit = (data: TitheFormValues) => {
    const newRecord: TitheRecord = {
      id: String(Date.now()),
      ...data,
    };
    setTitheRecords(prev => [newRecord, ...prev]);
    form.reset();
    console.log("New tithe record:", newRecord);
  };
  
  const handleDeleteRecord = (id: string) => {
    setTitheRecords(prev => prev.filter(record => record.id !== id));
  };

  const formatCurrency = (value: number) => {
    return `${value.toLocaleString('fr-CM', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} XAF`;
  };

  return (
    <div className="space-y-6 md:space-y-8">
      <h1 className="text-3xl font-bold tracking-tight text-foreground">Record Tithes</h1>
      
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Add New Tithe</CardTitle>
          <CardDescription>Enter tithe details for a church member.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="memberName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Member Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter member's full name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Date of Tithe</FormLabel>
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
              </div>
              
              <Button type="submit" className="w-full md:w-auto">
                <UserCheck className="mr-2 h-4 w-4" /> Save Tithe
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Recent Tithe Records</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member Name</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {titheRecords.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">No tithe records yet.</TableCell>
                </TableRow>
              ) : (
                titheRecords.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell>{record.memberName}</TableCell>
                    <TableCell>{format(record.date, "PP")}</TableCell>
                    <TableCell>{formatCurrency(record.amount)}</TableCell>
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
