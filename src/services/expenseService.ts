
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
import { logActivity } from './activityLogService';

const EXPENSES_COLLECTION = 'expense_records';

export const addExpenseRecord = async (
  recordData: ExpenseFormValues,
  userId: string,
  userDisplayName: string
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

    await logActivity(userId, userDisplayName, "CREATE_EXPENSE_RECORD", {
      recordId: docRef.id,
      collectionName: EXPENSES_COLLECTION,
      extraInfo: `Amount: ${recordData.amount}, Category: ${recordData.category}`
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
  userId: string,
  userDisplayName: string
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

    await logActivity(userId, userDisplayName, "UPDATE_EXPENSE_RECORD", {
      recordId: recordId,
      collectionName: EXPENSES_COLLECTION,
      extraInfo: `Updated fields for expense.` // Could be more specific if old vs new values are tracked
    });
  } catch (error) {
    console.error('Error updating expense record: ', error);
    throw error;
  }
};

export const deleteExpenseRecord = async (
  recordId: string,
  userId: string,
  userDisplayName: string
): Promise<void> => {
   if (!userId) {
    throw new Error('User ID is required to delete an expense record.');
  }
  try {
    await deleteDoc(doc(db, EXPENSES_COLLECTION, recordId));
    await logActivity(userId, userDisplayName, "DELETE_EXPENSE_RECORD", {
      recordId: recordId,
      collectionName: EXPENSES_COLLECTION
    });
  } catch (error) {
    console.error('Error deleting expense record: ', error);
    throw error;
  }
};
