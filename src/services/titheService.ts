
'use server';

import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  updateDoc,
  query,
  orderBy,
  serverTimestamp,
  Timestamp,
  where,
} from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import type { TitheRecord, TitheRecordFirestore, TitheFormValues } from '@/types';

const TITHES_COLLECTION = 'tithe_records';

// Helper to convert Firestore Timestamps to JS Dates for a TitheRecord
const fromFirestore = (docData: any, id: string): TitheRecord => {
  const data = docData as Omit<TitheRecordFirestore, 'id'>;
  return {
    ...data,
    id,
    date: data.date.toDate(),
    createdAt: data.createdAt?.toDate(),
  };
};

export const addTitheRecord = async (
  recordData: Omit<TitheRecord, 'id' | 'recordedByUserId' | 'createdAt'>
): Promise<string> => {
  if (!auth.currentUser) {
    throw new Error('User not authenticated');
  }
  try {
    const docRef = await addDoc(collection(db, TITHES_COLLECTION), {
      ...recordData,
      date: Timestamp.fromDate(recordData.date), // Convert JS Date to Firestore Timestamp
      recordedByUserId: auth.currentUser.uid,
      createdAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    console.error('Error adding tithe record: ', error);
    throw error;
  }
};

export const getTitheRecords = async (): Promise<TitheRecord[]> => {
  // For now, fetching all records ordered by date.
  // If records should be user-specific or filtered in other ways, adjust the query.
  const q = query(collection(db, TITHES_COLLECTION), orderBy('date', 'desc'));
  try {
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => fromFirestore(doc.data(), doc.id));
  } catch (error) {
    console.error('Error fetching tithe records: ', error);
    throw error;
  }
};

export const updateTitheRecord = async (
  recordId: string,
  dataToUpdate: Partial<TitheFormValues> // Using TitheFormValues as it contains date & amount
): Promise<void> => {
  if (!auth.currentUser) {
    throw new Error('User not authenticated');
  }
  try {
    const recordRef = doc(db, TITHES_COLLECTION, recordId);
    // Ensure date is converted to Firestore Timestamp if it's part of the update
    const updatePayload: any = { ...dataToUpdate };
    if (dataToUpdate.date) {
      updatePayload.date = Timestamp.fromDate(dataToUpdate.date);
    }
    await updateDoc(recordRef, updatePayload);
  } catch (error) {
    console.error('Error updating tithe record: ', error);
    throw error;
  }
};

export const deleteTitheRecord = async (recordId: string): Promise<void> => {
  if (!auth.currentUser) {
    throw new Error('User not authenticated');
  }
  try {
    await deleteDoc(doc(db, TITHES_COLLECTION, recordId));
  } catch (error) {
    console.error('Error deleting tithe record: ', error);
    throw error;
  }
};
