
"use client";

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CalendarIcon, UserCheck, PlusCircle, Trash2, Edit, Loader2, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import type { TitheRecord } from '@/types';
import { addTitheRecord, getTitheRecords, updateTitheRecord, deleteTitheRecord } from '@/services/titheService';
import { auth } from '@/lib/firebase';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const titheSchema = z.object({
  memberName: z.string().min(2, { message: "Member name must be at least 2 characters." }),
  date: z.date({ required_error: "Date is required." }),
  amount: z.coerce.number().positive({ message: "Amount must be positive." }),
});

export type TitheFormValues = z.infer<typeof titheSchema>; // Export for service usage

interface EditTitheDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  record: TitheRecord | null;
  onSave: (updatedData: TitheFormValues, recordId: string) => Promise<void>; // Make onSave async
}

const EditTitheDialog: React.FC<EditTitheDialogProps> = ({ isOpen, onOpenChange, record, onSave }) => {
  const [isSaving, setIsSaving] = useState(false);
  const editForm = useForm<TitheFormValues>({
    resolver: zodResolver(titheSchema),
  });

  React.useEffect(() => {
    if (record && isOpen) { // Reset form only when dialog opens with a record
      editForm.reset({
        memberName: record.memberName,
        date: record.date,
        amount: record.amount,
      });
    } else if (!isOpen) { // Reset form when dialog closes
        editForm.reset({ memberName: "", date: new Date(), amount: 0 });
    }
  }, [record, editForm, isOpen]);

  const handleEditSubmit = async (data: TitheFormValues) => {
    if (!record) return;
    setIsSaving(true);
    try {
      await onSave(data, record.id);
      onOpenChange(false);
    } catch (error) {
      // Error toast is handled by onSave caller
    } finally {
      setIsSaving(false);
    }
  };

  if (!record) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      onOpenChange(open);
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
                 <Button type="button" variant="outline" disabled={isSaving}>Cancel</Button>
              </DialogClose>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};


export default function TithesPage() {
  const [titheRecords, setTitheRecords] = useState<TitheRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<TitheRecord | null>(null);
  const { toast } = useToast();
  const [user, setUser] = useState(auth.currentUser);

  const form = useForm<TitheFormValues>({
    resolver: zodResolver(titheSchema),
    defaultValues: {
      memberName: "",
      date: new Date(),
      amount: 0,
    },
  });

  const fetchRecords = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      setError("User not authenticated. Please log in.");
      setTitheRecords([]);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const records = await getTitheRecords();
      setTitheRecords(records.sort((a,b) => b.date.getTime() - a.date.getTime()));
    } catch (err) {
      console.error(err);
      setError("Failed to fetch tithe records.");
      toast({ variant: "destructive", title: "Error", description: "Could not fetch tithe records." });
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
        setTitheRecords([]);
        setIsLoading(false);
        setError("Please log in to manage tithe records.");
      }
    });
    return () => unsubscribe();
  }, [fetchRecords]);

  const formatCurrency = (value: number) => {
    return `${value.toLocaleString('fr-CM', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} XAF`;
  };

  const onSubmit = async (data: TitheFormValues) => {
    if (!user) {
      toast({ variant: "destructive", title: "Error", description: "You must be logged in to add a tithe." });
      return;
    }
    try {
      const newRecordId = await addTitheRecord(data);
      // const newRecordForUI: TitheRecord = { ...data, id: newRecordId }; // Create a full record for UI
      // setTitheRecords(prev => [...prev, newRecordForUI].sort((a,b) => b.date.getTime() - a.date.getTime()));
      await fetchRecords(); // Re-fetch for simplicity and to get server timestamp
      form.reset({ memberName: "", date: new Date(), amount: 0 });
      toast({ title: "Tithe Saved", description: `Tithe for ${data.memberName} has been successfully saved.` });
    } catch (err) {
      console.error(err);
      toast({ variant: "destructive", title: "Error", description: "Failed to save tithe record." });
    }
  };
  
  const handleDeleteRecord = async (id: string, memberName: string, recordDate: Date) => {
    if (!user) {
      toast({ variant: "destructive", title: "Error", description: "You must be logged in to delete a tithe." });
      return;
    }
    try {
      await deleteTitheRecord(id);
      // setTitheRecords(prev => prev.filter(record => record.id !== id)); // Optimistic update
      await fetchRecords(); // Re-fetch for consistency
      toast({
          title: "Tithe Deleted",
          description: `Tithe record for ${memberName} on ${format(recordDate, "PP")} has been deleted.`,
          variant: "default" // Changed from destructive for successful delete
      });
    } catch (err) {
      console.error(err);
      toast({ variant: "destructive", title: "Error", description: "Failed to delete tithe record." });
    }
  };

  const handleOpenEditDialog = (record: TitheRecord) => {
    setEditingRecord(record);
    setIsEditDialogOpen(true);
  };

  const handleSaveEditedTithe = async (updatedData: TitheFormValues, recordId: string) => {
    if (!user) {
      toast({ variant: "destructive", title: "Error", description: "You must be logged in to update a tithe." });
      throw new Error("User not authenticated"); // Prevent dialog from closing
    }
    try {
      // Only pass date and amount for update, memberName is fixed for an existing record
      const { memberName, ...dataToUpdateForService } = updatedData;
      await updateTitheRecord(recordId, dataToUpdateForService);
      // setTitheRecords(prev =>
      //   prev.map(r => (r.id === recordId ? { ...r, ...updatedData } : r))
      //       .sort((a,b) => b.date.getTime() - a.date.getTime())
      // ); // Optimistic update
      await fetchRecords(); // Re-fetch
      toast({ title: "Tithe Updated", description: `Tithe for ${updatedData.memberName} has been updated.`});
      setEditingRecord(null);
    } catch (err) {
        console.error(err);
        toast({ variant: "destructive", title: "Error", description: "Failed to update tithe record." });
        throw err; // Re-throw to be caught by dialog if needed
    }
  };

  const groupedTithes = useMemo(() => {
    const groups: { [key: string]: TitheRecord[] } = {};
    titheRecords.forEach(record => {
      if (!groups[record.memberName]) {
        groups[record.memberName] = [];
      }
      groups[record.memberName].push(record);
    });
    
    return Object.keys(groups)
      .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()))
      .reduce((acc, memberName) => {
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
          {!user && (
            <Alert variant="destructive" className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Authentication Required</AlertTitle>
              <AlertDescription>Please log in to add or view tithe records.</AlertDescription>
            </Alert>
          )}
          {user && (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="memberName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Member Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter member's full name" {...field} disabled={form.formState.isSubmitting}/>
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
                    name="amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Amount (XAF)</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="0.00" {...field} step="0.01" disabled={form.formState.isSubmitting} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <Button type="submit" className="w-full md:w-auto" disabled={form.formState.isSubmitting || !user}>
                  {form.formState.isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserCheck className="mr-2 h-4 w-4" />}
                   Save Tithe
                </Button>
              </form>
            </Form>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Member Tithe Records</CardTitle>
           <CardDescription>View and manage tithes grouped by member.</CardDescription>
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
             <p className="text-center text-muted-foreground py-10">Please log in to view tithe records.</p>
          )}
          {!isLoading && !error && user && Object.keys(groupedTithes).length === 0 && (
            <p className="text-center text-muted-foreground py-10">No tithe records yet. Add a new tithe above.</p>
          )}
          {!isLoading && !error && user && Object.keys(groupedTithes).length > 0 && (
            <Accordion type="multiple" className="w-full" defaultValue={Object.keys(groupedTithes).length > 0 ? [Object.keys(groupedTithes)[0]] : []}>
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
                                <Button variant="ghost" size="icon" onClick={() => handleOpenEditDialog(record)} aria-label="Edit tithe" disabled={!user}>
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => handleDeleteRecord(record.id, record.memberName, record.date)} aria-label="Delete tithe" disabled={!user}>
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
