
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  query,
  orderBy,
  serverTimestamp,
  Timestamp,
  where,
} from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import type { IncomeRecord, IncomeRecordFirestore } from '@/types';
import { logActivity } from './activityLogService';

const INCOME_COLLECTION = 'income_records';

// Helper to convert Firestore Timestamps to JS Dates for an IncomeRecord
const fromFirestore = (docData: any, id: string): IncomeRecord => {
  const data = docData as Omit<IncomeRecordFirestore, 'id'>;
  return {
    ...data,
    id,
    date: data.date.toDate(),
    createdAt: data.createdAt?.toDate(),
  };
};

export const addIncomeRecord = async (
  recordData: Omit<IncomeRecord, 'id' | 'recordedByUserId' | 'createdAt'>,
  userId: string, // Added for explicitness, though auth.currentUser.uid could be used
  userDisplayName: string
): Promise<string> => {
  if (!auth.currentUser || auth.currentUser.uid !== userId) {
    throw new Error('User not authenticated or mismatched ID');
  }
  try {
    const docRef = await addDoc(collection(db, INCOME_COLLECTION), {
      ...recordData,
      date: Timestamp.fromDate(recordData.date),
      recordedByUserId: userId,
      createdAt: serverTimestamp(),
    });

    await logActivity(userId, userDisplayName, "CREATE_INCOME_RECORD", {
      recordId: docRef.id,
      collectionName: INCOME_COLLECTION,
      extraInfo: `Amount: ${recordData.amount}, Category: ${recordData.category}`
    });

    return docRef.id;
  } catch (error) {
    console.error('Error adding income record: ', error);
    throw error;
  }
};

export const getIncomeRecords = async (): Promise<IncomeRecord[]> => {
  if (!auth.currentUser) {
    return [];
  }
  const q = query(collection(db, INCOME_COLLECTION), orderBy('date', 'desc'));
  try {
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => fromFirestore(doc.data(), doc.id));
  } catch (error) {
    console.error('Error fetching income records: ', error);
    throw error;
  }
};

export const deleteIncomeRecord = async (
  recordId: string,
  userId: string,
  userDisplayName: string
): Promise<void> => {
   if (!auth.currentUser || auth.currentUser.uid !== userId) {
    throw new Error('User not authenticated or mismatched ID for deletion.');
  }
  try {
    // It might be good to fetch the record to log its details before deleting,
    // but for simplicity, we'll just log the ID.
    await deleteDoc(doc(db, INCOME_COLLECTION, recordId));
    await logActivity(userId, userDisplayName, "DELETE_INCOME_RECORD", {
      recordId: recordId,
      collectionName: INCOME_COLLECTION
    });
  } catch (error) {
    console.error('Error deleting income record: ', error);
    throw error;
  }
};
