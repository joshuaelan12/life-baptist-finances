
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
  recordData: Omit<IncomeRecord, 'id' | 'recordedByUserId' | 'createdAt'>
): Promise<string> => {
  if (!auth.currentUser) {
    throw new Error('User not authenticated');
  }
  try {
    const docRef = await addDoc(collection(db, INCOME_COLLECTION), {
      ...recordData,
      date: Timestamp.fromDate(recordData.date), // Convert JS Date to Firestore Timestamp
      recordedByUserId: auth.currentUser.uid,
      createdAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    console.error('Error adding income record: ', error);
    throw error;
  }
};

export const getIncomeRecords = async (): Promise<IncomeRecord[]> => {
  if (!auth.currentUser) {
    // Or handle differently if records are public / church-wide but some are user-specific
    // For now, let's assume records are tied to a user or are generally accessible by authenticated users.
    // If they should be filtered by user, add a where clause:
    // const q = query(collection(db, INCOME_COLLECTION), where("recordedByUserId", "==", auth.currentUser.uid), orderBy('date', 'desc'));
    // For now, fetching all records ordered by date:
    const q = query(collection(db, INCOME_COLLECTION), orderBy('date', 'desc'));
    try {
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => fromFirestore(doc.data(), doc.id));
    } catch (error) {
      console.error('Error fetching income records: ', error);
      throw error;
    }
  }
  // If no user, return empty or throw error, based on requirements
  return []; 
};

export const deleteIncomeRecord = async (recordId: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, INCOME_COLLECTION, recordId));
  } catch (error) {
    console.error('Error deleting income record: ', error);
    throw error;
  }
};
