
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
// Removed local z import as titheSchema will be imported
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import type { TitheRecord } from '@/types';
import { titheSchema, type TitheFormValues } from '@/types'; // Import schema and type
import { addTitheRecord, getTitheRecords, updateTitheRecord, deleteTitheRecord } from '@/services/titheService';
import { auth } from '@/lib/firebase';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import type { User } from 'firebase/auth';

// Removed local titheSchema definition
// Removed local TitheFormValues export

interface EditTitheDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  record: TitheRecord | null;
  onSave: (updatedData: TitheFormValues, recordId: string) => Promise<void>;
  currentUser: User | null; // Pass current user for auth checks
}

const EditTitheDialog: React.FC<EditTitheDialogProps> = ({ isOpen, onOpenChange, record, onSave, currentUser }) => {
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  const editForm = useForm<TitheFormValues>({
    resolver: zodResolver(titheSchema), // Use imported schema
  });

  React.useEffect(() => {
    if (record && isOpen) {
      editForm.reset({
        memberName: record.memberName,
        date: record.date,
        amount: record.amount,
      });
    } else if (!isOpen) {
        editForm.reset({ memberName: "", date: new Date(), amount: 0 });
    }
  }, [record, editForm, isOpen]);

  const handleEditSubmit = async (data: TitheFormValues) => {
    if (!record) return;
    if (!currentUser || !currentUser.uid) {
      toast({ variant: "destructive", title: "Authentication Error", description: "You must be logged in to save changes." });
      return;
    }
    setIsSaving(true);
    try {
      await onSave(data, record.id); // onSave itself will handle calling the service with userId
      onOpenChange(false);
    } catch (error) {
      // Error toast is handled by onSave caller
    } finally {
      setIsSaving(false);
    }
  };

  if (!record) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
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
                            disabled={isSaving}
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
                      <Input type="number" placeholder="0.00" {...field} step="0.01" disabled={isSaving} />
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
              <Button type="submit" disabled={isSaving || !currentUser}>
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
  const [currentUser, setCurrentUser] = useState<User | null>(auth.currentUser); // Changed 'user' to 'currentUser' for clarity

  const form = useForm<TitheFormValues>({
    resolver: zodResolver(titheSchema), // Use imported schema
    defaultValues: {
      memberName: "",
      date: new Date(),
      amount: 0,
    },
  });

  const fetchRecords = useCallback(async () => {
    // No specific user check here for fetching, as per original design, but good to be aware
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
  }, [toast]);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setCurrentUser(user);
      if (user) {
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
    if (!currentUser || !currentUser.uid) {
      toast({ variant: "destructive", title: "Error", description: "You must be logged in to add a tithe." });
      return;
    }
    try {
      await addTitheRecord(data, currentUser.uid); // Pass currentUser.uid
      await fetchRecords(); 
      form.reset({ memberName: "", date: new Date(), amount: 0 });
      toast({ title: "Tithe Saved", description: `Tithe for ${data.memberName} has been successfully saved.` });
    } catch (err) {
      console.error(err);
      toast({ variant: "destructive", title: "Error", description: "Failed to save tithe record." });
    }
  };
  
  const handleDeleteRecord = async (id: string, memberName: string, recordDate: Date) => {
    if (!currentUser || !currentUser.uid) {
      toast({ variant: "destructive", title: "Error", description: "You must be logged in to delete a tithe." });
      return;
    }
    try {
      await deleteTitheRecord(id, currentUser.uid); // Pass currentUser.uid
      await fetchRecords(); 
      toast({
          title: "Tithe Deleted",
          description: `Tithe record for ${memberName} on ${format(recordDate, "PP")} has been deleted.`,
          variant: "default"
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
    if (!currentUser || !currentUser.uid) {
      toast({ variant: "destructive", title: "Error", description: "You must be logged in to update a tithe." });
      throw new Error("User not authenticated"); 
    }
    try {
      const { memberName, ...dataToUpdateForService } = updatedData;
      await updateTitheRecord(recordId, dataToUpdateForService, currentUser.uid); // Pass currentUser.uid
      await fetchRecords(); 
      toast({ title: "Tithe Updated", description: `Tithe for ${updatedData.memberName} has been updated.`});
      setEditingRecord(null);
    } catch (err) {
        console.error(err);
        toast({ variant: "destructive", title: "Error", description: "Failed to update tithe record." });
        throw err; 
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
          {!currentUser && (
            <Alert variant="destructive" className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Authentication Required</AlertTitle>
              <AlertDescription>Please log in to add or view tithe records.</AlertDescription>
            </Alert>
          )}
          {currentUser && (
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
                <Button type="submit" className="w-full md:w-auto" disabled={form.formState.isSubmitting || !currentUser}>
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
          {!isLoading && !error && !currentUser && (
             <p className="text-center text-muted-foreground py-10">Please log in to view tithe records.</p>
          )}
          {!isLoading && !error && currentUser && Object.keys(groupedTithes).length === 0 && (
            <p className="text-center text-muted-foreground py-10">No tithe records yet. Add a new tithe above.</p>
          )}
          {!isLoading && !error && currentUser && Object.keys(groupedTithes).length > 0 && (
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
                                <Button variant="ghost" size="icon" onClick={() => handleOpenEditDialog(record)} aria-label="Edit tithe" disabled={!currentUser}>
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => handleDeleteRecord(record.id, record.memberName, record.date)} aria-label="Delete tithe" disabled={!currentUser}>
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
        currentUser={currentUser}
      />
    </div>
  );
}
