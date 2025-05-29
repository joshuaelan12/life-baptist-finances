
'use server';

import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  updateDoc,
  serverTimestamp,
  Timestamp,
  type DocumentData,
  type QueryDocumentSnapshot,
  type SnapshotOptions,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { ExpenseRecord, ExpenseRecordFirestore, ExpenseFormValues, ExpenseCategory } from '@/types';

const EXPENSES_COLLECTION = 'expense_records';

// Note: expenseConverter was moved to src/app/(app)/expenses/page.tsx
// as 'use server' files cannot export non-async function objects.

export const addExpenseRecord = async (
  recordData: ExpenseFormValues,
  userId: string
): Promise<string> => {
  if (!userId) {
    throw new Error('User ID is required to add an expense record.');
  }
  try {
    const docRef = await addDoc(collection(db, EXPENSES_COLLECTION), {
      ...recordData,
      date: Timestamp.fromDate(recordData.date),
      recordedByUserId: userId,
      createdAt: serverTimestamp(),
      category: recordData.category as ExpenseCategory, 
    });
    return docRef.id;
  } catch (error) {
    console.error('Error adding expense record: ', error);
    throw error;
  }
};

export const updateExpenseRecord = async (
  recordId: string,
  dataToUpdate: ExpenseFormValues,
  userId: string 
): Promise<void> => {
  if (!userId) {
    throw new Error('User ID is required to update an expense record.');
  }
  try {
    const recordRef = doc(db, EXPENSES_COLLECTION, recordId);
    const updatePayload: any = { ...dataToUpdate };
    if (dataToUpdate.date) {
      updatePayload.date = Timestamp.fromDate(dataToUpdate.date);
    }
    await updateDoc(recordRef, updatePayload);
  } catch (error) {
    console.error('Error updating expense record: ', error);
    throw error;
  }
};

export const deleteExpenseRecord = async (
  recordId: string,
  userId: string 
): Promise<void> => {
   if (!userId) {
    throw new Error('User ID is required to delete an expense record.');
  }
  try {
    await deleteDoc(doc(db, EXPENSES_COLLECTION, recordId));
  } catch (error) {
    console.error('Error deleting expense record: ', error);
    throw error;
  }
};
