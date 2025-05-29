
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
import { CalendarIcon, PlusCircle, Trash2, Edit, Loader2, AlertTriangle, ReceiptText } from "lucide-react";
import { format } from "date-fns";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import type { ExpenseRecord, ExpenseFormValues, ExpenseCategory, ExpenseRecordFirestore } from '@/types';
import { expenseSchema, expenseCategories } from '@/types';
import { addExpenseRecord, updateExpenseRecord, deleteExpenseRecord } from '@/services/expenseService';
import { useToast } from "@/hooks/use-toast";
import { auth, db } from '@/lib/firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { useCollectionData } from 'react-firebase-hooks/firestore';
import { collection, query, orderBy, Timestamp, type DocumentData, type QueryDocumentSnapshot, type SnapshotOptions } from 'firebase/firestore';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import type { User } from 'firebase/auth';


// Firestore converter
const expenseConverter = {
  toFirestore(record: ExpenseRecord): DocumentData {
    // Destructure, excluding fields handled by services or not part of the stored data (like client-side 'id')
    // createdAt is server-set for new records or pre-existing for updates.
    const { id, createdAt, ...clientData } = record; 
    
    const data: Omit<ExpenseRecordFirestore, 'id' | 'createdAt'> = {
      ...clientData, // Spreads category, amount, recordedByUserId, and optional fields
      date: Timestamp.fromDate(record.date), // Ensure date is a Firestore Timestamp
    };
    // Optional fields are already handled by the spread of clientData
    return data;
  },
  fromFirestore(
    snapshot: QueryDocumentSnapshot,
    options: SnapshotOptions
  ): ExpenseRecord {
    const data = snapshot.data(options) as Omit<ExpenseRecordFirestore, 'id'>;
    return {
      id: snapshot.id,
      date: (data.date as Timestamp).toDate(),
      category: data.category,
      amount: data.amount,
      description: data.description,
      payee: data.payee,
      paymentMethod: data.paymentMethod,
      recordedByUserId: data.recordedByUserId,
      createdAt: (data.createdAt as Timestamp)?.toDate(),
    };
  }
};

interface EditExpenseDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  record: ExpenseRecord | null;
  onSave: (updatedData: ExpenseFormValues, recordId: string) => Promise<void>;
  currentUser: User | null;
}

const EditExpenseDialog: React.FC<EditExpenseDialogProps> = ({ isOpen, onOpenChange, record, onSave, currentUser }) => {
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  const editForm = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseSchema),
  });

  React.useEffect(() => {
    if (record && isOpen) {
      editForm.reset({
        date: record.date,
        category: record.category,
        amount: record.amount,
        description: record.description || "",
        payee: record.payee || "",
        paymentMethod: record.paymentMethod || "",
      });
    } else if (!isOpen) {
      editForm.reset({ 
        date: new Date(), 
        category: undefined, 
        amount: 0, 
        description: "", 
        payee: "", 
        paymentMethod: "" 
      });
    }
  }, [record, editForm, isOpen]);

  const handleEditSubmit = async (data: ExpenseFormValues) => {
    if (!record || !currentUser?.uid) {
      toast({ variant: "destructive", title: "Error", description: "Cannot save. Record or user information is missing." });
      return;
    }
    setIsSaving(true);
    try {
      await onSave(data, record.id);
      onOpenChange(false);
    } catch (error) {
      // Error toast is handled by onSave caller (TithesPage/ExpensesPage)
    } finally {
      setIsSaving(false);
    }
  };

  if (!record) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Expense Record</DialogTitle>
          <DialogDescription>
            Update the details for this expense. Click save when you're done.
          </DialogDescription>
        </DialogHeader>
        <Form {...editForm}>
          <form onSubmit={editForm.handleSubmit(handleEditSubmit)} className="space-y-4 py-4 max-h-[70vh] overflow-y-auto pr-2">
            <FormField
              control={editForm.control}
              name="date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Date of Expense</FormLabel>
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
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={isSaving}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select expense category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {expenseCategories.map(cat => (
                          <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
             <FormField
              control={editForm.control}
              name="payee"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payee (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="E.g., ENEO, CAMWATER, Landlord" {...field} disabled={isSaving} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={editForm.control}
              name="paymentMethod"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payment Method (Optional)</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || ""} disabled={isSaving}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select payment method" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Cash">Cash</SelectItem>
                        <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                        <SelectItem value="Mobile Money">Mobile Money</SelectItem>
                        <SelectItem value="Cheque">Cheque</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={editForm.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="E.g., Electricity bill for March" {...field} disabled={isSaving} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="pt-4">
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


export default function ExpensesPage() {
  const { toast } = useToast();
  const [authUser, authLoading, authError] = useAuthState(auth);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<ExpenseRecord | null>(null);

  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      date: new Date(),
      category: undefined,
      amount: 0,
      description: "",
      payee: "",
      paymentMethod: "",
    },
  });

  const expensesCollectionRef = authUser ? collection(db, 'expense_records') : null;
  const expensesQuery = expensesCollectionRef 
    ? query(expensesCollectionRef, orderBy('date', 'desc')).withConverter<ExpenseRecord>(expenseConverter)
    : null;
  
  const [expenseRecords, isLoadingData, errorData] = useCollectionData(expensesQuery);

  const onSubmit = async (data: ExpenseFormValues) => {
    if (!authUser?.uid) {
      toast({ variant: "destructive", title: "Error", description: "You must be logged in to add expenses." });
      return;
    }
    try {
      await addExpenseRecord(data, authUser.uid);
      form.reset({ date: new Date(), category: undefined, amount: 0, description: "", payee: "", paymentMethod: "" });
      toast({ title: "Success", description: "Expense record saved successfully." });
    } catch (err) {
      console.error(err);
      toast({ variant: "destructive", title: "Error", description: "Failed to save expense record." });
    }
  };
  
  const handleDeleteRecord = async (record: ExpenseRecord) => {
    if (!authUser?.uid) {
      toast({ variant: "destructive", title: "Error", description: "You must be logged in to delete records." });
      return;
    }
    try {
      await deleteExpenseRecord(record.id, authUser.uid);
      toast({ title: "Deleted", description: `Expense record for ${format(record.date, "PP")} deleted successfully.` });
    } catch (err) {
      console.error(err);
      toast({ variant: "destructive", title: "Error", description: "Failed to delete expense record." });
    }
  };

  const handleOpenEditDialog = (record: ExpenseRecord) => {
    setEditingRecord(record);
    setIsEditDialogOpen(true);
  };

  const handleSaveEditedExpense = async (updatedData: ExpenseFormValues, recordId: string) => {
    if (!authUser?.uid) {
      toast({ variant: "destructive", title: "Error", description: "You must be logged in to update an expense." });
      throw new Error("User not authenticated"); 
    }
    try {
      await updateExpenseRecord(recordId, updatedData, authUser.uid);
      toast({ title: "Expense Updated", description: `Expense dated ${format(updatedData.date, "PP")} has been updated.`});
      setEditingRecord(null); // Close dialog is handled by onOpenChange in Dialog
    } catch (err) {
        console.error(err);
        toast({ variant: "destructive", title: "Error", description: "Failed to update expense record." });
        throw err; // Re-throw to be caught by dialog's submit handler
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
      <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center">
        <ReceiptText className="mr-3 h-8 w-8 text-primary" />
        Record Expenses
      </h1>
      
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Add New Expense</CardTitle>
          <CardDescription>Enter the details of the expense incurred.</CardDescription>
        </CardHeader>
        <CardContent>
          {!authUser && (
            <Alert variant="destructive" className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Authentication Required</AlertTitle>
              <AlertDescription>Please log in to add or view expense records.</AlertDescription>
            </Alert>
          )}
          {authUser && (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                              <SelectValue placeholder="Select expense category" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {expenseCategories.map(cat => (
                               <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
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
                          <Input type="number" placeholder="0.00" {...field} step="0.01" disabled={form.formState.isSubmitting}/>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid md:grid-cols-2 gap-6">
                   <FormField
                    control={form.control}
                    name="payee"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Payee (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="E.g., ENEO, CAMWATER, Landlord" {...field} disabled={form.formState.isSubmitting} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="paymentMethod"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Payment Method (Optional)</FormLabel>
                         <Select onValueChange={field.onChange} value={field.value || ""} disabled={form.formState.isSubmitting}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select payment method" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Cash">Cash</SelectItem>
                            <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                            <SelectItem value="Mobile Money">Mobile Money</SelectItem>
                            <SelectItem value="Cheque">Cheque</SelectItem>
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
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description (Optional)</FormLabel>
                      <FormControl>
                        <Textarea placeholder="E.g., Electricity bill for March, Offering for guest speaker" {...field} disabled={form.formState.isSubmitting}/>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <Button type="submit" className="w-full md:w-auto" disabled={form.formState.isSubmitting || !authUser}>
                  {form.formState.isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
                   Save Expense
                </Button>
              </form>
            </Form>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Recent Expense Records</CardTitle>
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
             <p className="text-center text-muted-foreground py-10">Please log in to view expense records.</p>
          )}
          {!isLoadingData && !errorData && authUser && (!expenseRecords || expenseRecords.length === 0) && (
            <p className="text-center text-muted-foreground py-10">No expense records yet. Add one above!</p>
          )}
          {!isLoadingData && !errorData && authUser && expenseRecords && expenseRecords.length > 0 && (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Payee</TableHead>
                    <TableHead>Payment Method</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenseRecords.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell>{format(record.date, "PP")}</TableCell>
                      <TableCell>{record.category}</TableCell>
                      <TableCell>{formatCurrency(record.amount)}</TableCell>
                      <TableCell>{record.payee || 'N/A'}</TableCell>
                      <TableCell>{record.paymentMethod || 'N/A'}</TableCell>
                      <TableCell className="max-w-[200px] truncate" title={record.description}>{record.description || 'N/A'}</TableCell>
                      <TableCell className="text-right space-x-1">
                         <Button variant="ghost" size="icon" onClick={() => handleOpenEditDialog(record)} disabled={!authUser || form.formState.isSubmitting} aria-label="Edit expense">
                            <Edit className="h-4 w-4" />
                         </Button>
                         <Button variant="ghost" size="icon" onClick={() => handleDeleteRecord(record)} disabled={!authUser || form.formState.isSubmitting} aria-label="Delete expense">
                            <Trash2 className="h-4 w-4 text-destructive" />
                         </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
      <EditExpenseDialog
        isOpen={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        record={editingRecord}
        onSave={handleSaveEditedExpense}
        currentUser={authUser}
      />
    </div>
  );
}
