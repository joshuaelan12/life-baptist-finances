
"use client";

import React, { useState, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CalendarIcon, UserCheck, PlusCircle, Trash2, Edit } from "lucide-react";
import { format } from "date-fns";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
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
  { id: 't4', memberName: 'Alice Wonderland', date: new Date(2023, 11, 3), amount: 16000.00 },
  { id: 't5', memberName: 'Bob The Builder', date: new Date(2023, 9, 12), amount: 20000.00 },
];

interface EditTitheDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  record: TitheRecord | null;
  onSave: (updatedData: TitheFormValues, recordId: string) => void;
}

const EditTitheDialog: React.FC<EditTitheDialogProps> = ({ isOpen, onOpenChange, record, onSave }) => {
  const editForm = useForm<TitheFormValues>({
    resolver: zodResolver(titheSchema),
  });

  React.useEffect(() => {
    if (record) {
      editForm.reset({
        memberName: record.memberName,
        date: record.date,
        amount: record.amount,
      });
    }
  }, [record, editForm, isOpen]); // Add isOpen to dependencies to reset form when dialog reopens

  const handleEditSubmit = (data: TitheFormValues) => {
    if (!record) return;
    onSave(data, record.id);
    onOpenChange(false);
  };

  if (!record) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      onOpenChange(open);
      if (!open) editForm.reset(); // Reset form on close
    }}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Tithe for {record.memberName}</DialogTitle>
          <DialogDescription>
            Update the date or amount for this tithe record. Click save when you're done.
          </DialogDescription>
        </DialogHeader>
        <Form {...editForm}>
          <form onSubmit={editForm.handleSubmit(handleEditSubmit)} className="space-y-6 py-4">
            <FormField
              control={editForm.control}
              name="memberName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Member Name (Read-only)</FormLabel>
                  <FormControl>
                    <Input {...field} readOnly className="bg-muted/50 cursor-not-allowed" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-1 gap-6">
              <FormField
                control={editForm.control}
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
                control={editForm.control}
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
            <DialogFooter>
               <DialogClose asChild>
                 <Button type="button" variant="outline">Cancel</Button>
              </DialogClose>
              <Button type="submit">Save Changes</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};


export default function TithesPage() {
  const [titheRecords, setTitheRecords] = useState<TitheRecord[]>(initialTitheRecords.sort((a, b) => b.date.getTime() - a.date.getTime()));
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<TitheRecord | null>(null);
  const { toast } = useToast();

  const form = useForm<TitheFormValues>({
    resolver: zodResolver(titheSchema),
    defaultValues: {
      memberName: "",
      date: new Date(),
      amount: 0,
    },
  });

  const formatCurrency = (value: number) => {
    return `${value.toLocaleString('fr-CM', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} XAF`;
  };

  const onSubmit = (data: TitheFormValues) => {
    const newRecord: TitheRecord = {
      id: String(Date.now()),
      ...data,
    };
    setTitheRecords(prev => [...prev, newRecord].sort((a,b) => b.date.getTime() - a.date.getTime()));
    form.reset({ memberName: "", date: new Date(), amount: 0 });
    toast({ title: "Tithe Saved", description: `Tithe for ${newRecord.memberName} has been successfully saved.` });
  };
  
  const handleDeleteRecord = (id: string) => {
    const recordToDelete = titheRecords.find(r => r.id === id);
    setTitheRecords(prev => prev.filter(record => record.id !== id));
     if (recordToDelete) {
        toast({
            title: "Tithe Deleted",
            description: `Tithe record for ${recordToDelete.memberName} on ${format(recordToDelete.date, "PP")} has been deleted.`,
            variant: "destructive"
        });
    }
  };

  const handleOpenEditDialog = (record: TitheRecord) => {
    setEditingRecord(record);
    setIsEditDialogOpen(true);
  };

  const handleSaveEditedTithe = (updatedData: TitheFormValues, recordId: string) => {
    setTitheRecords(prev =>
      prev.map(r => (r.id === recordId ? { ...r, ...updatedData } : r))
          .sort((a,b) => b.date.getTime() - a.date.getTime())
    );
    toast({ title: "Tithe Updated", description: `Tithe for ${updatedData.memberName} has been updated.`});
    setEditingRecord(null); // Clear editing record after save
  };

  const groupedTithes = useMemo(() => {
    const groups: { [key: string]: TitheRecord[] } = {};
    // Records are already sorted by date when setTitheRecords is called
    titheRecords.forEach(record => {
      if (!groups[record.memberName]) {
        groups[record.memberName] = [];
      }
      groups[record.memberName].push(record);
    });
    
    // Sort member names alphabetically for accordion order
    return Object.keys(groups)
      .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()))
      .reduce((acc, memberName) => {
        // Ensure tithes within each member's group are also sorted by date descending
        acc[memberName] = groups[memberName].sort((a, b) => b.date.getTime() - a.date.getTime());
        return acc;
      }, {} as { [key: string]: TitheRecord[] });
  }, [titheRecords]);

  return (
    <div className="space-y-6 md:space-y-8">
      <h1 className="text-3xl font-bold tracking-tight text-foreground">Manage Tithes</h1>
      
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
          <CardTitle>Member Tithe Records</CardTitle>
           <CardDescription>View and manage tithes grouped by member.</CardDescription>
        </CardHeader>
        <CardContent>
          {Object.keys(groupedTithes).length === 0 ? (
            <p className="text-center text-muted-foreground">No tithe records yet. Add a new tithe above.</p>
          ) : (
            <Accordion type="multiple" className="w-full">
              {Object.entries(groupedTithes).map(([memberName, records]) => {
                const totalTithe = records.reduce((sum, r) => sum + r.amount, 0);
                return (
                  <AccordionItem value={memberName} key={memberName}>
                    <AccordionTrigger>
                      <div className="flex justify-between w-full pr-2">
                        <span>{memberName}</span>
                        <span className="text-sm text-muted-foreground">
                          {records.length} contribution(s) - Total: {formatCurrency(totalTithe)}
                        </span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {records.map((record) => (
                            <TableRow key={record.id}>
                              <TableCell>{format(record.date, "PP")}</TableCell>
                              <TableCell>{formatCurrency(record.amount)}</TableCell>
                              <TableCell className="text-right space-x-1">
                                <Button variant="ghost" size="icon" onClick={() => handleOpenEditDialog(record)} aria-label="Edit tithe">
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => handleDeleteRecord(record.id)} aria-label="Delete tithe">
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          )}
        </CardContent>
      </Card>
      
      <EditTitheDialog 
        isOpen={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        record={editingRecord}
        onSave={handleSaveEditedTithe}
      />
    </div>
  );
}
