
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
  // where, // Not currently used for auth checks here but could be
} from 'firebase/firestore';
import { db } from '@/lib/firebase'; // auth removed as auth.currentUser is unreliable in server actions here
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
    // Ensure recordedByUserId is part of the returned object if it exists on docData
    recordedByUserId: data.recordedByUserId,
  };
};

export const addTitheRecord = async (
  recordData: Omit<TitheRecord, 'id' | 'recordedByUserId' | 'createdAt'>,
  userId: string // Added userId parameter
): Promise<string> => {
  if (!userId) {
    // This check relies on the client providing the userId
    throw new Error('User ID was not provided to addTitheRecord service.');
  }
  try {
    const docRef = await addDoc(collection(db, TITHES_COLLECTION), {
      ...recordData,
      date: Timestamp.fromDate(recordData.date), // Convert JS Date to Firestore Timestamp
      recordedByUserId: userId, // Use passed userId
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
  dataToUpdate: Partial<TitheFormValues>, // Using TitheFormValues as it contains date & amount
  userId: string // Added userId parameter for consistency, though not directly used for auth check here yet
): Promise<void> => {
  if (!userId) {
    // This check relies on the client providing the userId
    // Could be used in future to verify if this userId is allowed to update this record
    throw new Error('User ID was not provided to updateTitheRecord service.');
  }
  try {
    const recordRef = doc(db, TITHES_COLLECTION, recordId);
    // Ensure date is converted to Firestore Timestamp if it's part of the update
    const updatePayload: any = { ...dataToUpdate };
    if (dataToUpdate.date) {
      updatePayload.date = Timestamp.fromDate(dataToUpdate.date);
    }
    // Note: We are not currently checking if the userId is authorized to update this specific record.
    // That would require fetching the record first and comparing its recordedByUserId.
    await updateDoc(recordRef, updatePayload);
  } catch (error) {
    console.error('Error updating tithe record: ', error);
    throw error;
  }
};

export const deleteTitheRecord = async (
  recordId: string,
  userId: string // Added userId parameter
): Promise<void> => {
  if (!userId) {
    // This check relies on the client providing the userId
    // Could be used in future to verify if this userId is allowed to delete this record
    throw new Error('User ID was not provided to deleteTitheRecord service.');
  }
  try {
    // Note: We are not currently checking if the userId is authorized to delete this specific record.
    await deleteDoc(doc(db, TITHES_COLLECTION, recordId));
  } catch (error) {
    console.error('Error deleting tithe record: ', error);
    throw error;
  }
};
