
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
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { TitheRecord, TitheRecordFirestore, TitheFormValues } from '@/types';
import { logActivity } from './activityLogService';

const TITHES_COLLECTION = 'tithe_records';

const fromFirestore = (docData: any, id: string): TitheRecord => {
  const data = docData as Omit<TitheRecordFirestore, 'id'>;
  return {
    ...data,
    id,
    date: data.date.toDate(),
    createdAt: data.createdAt?.toDate(),
    recordedByUserId: data.recordedByUserId,
  };
};

export const addTitheRecord = async (
  recordData: Omit<TitheRecord, 'id' | 'recordedByUserId' | 'createdAt'>,
  userId: string,
  userDisplayName: string
): Promise<string> => {
  if (!userId) {
    throw new Error('User ID was not provided to addTitheRecord service.');
  }
  try {
    const docRef = await addDoc(collection(db, TITHES_COLLECTION), {
      ...recordData,
      date: Timestamp.fromDate(recordData.date),
      recordedByUserId: userId,
      createdAt: serverTimestamp(),
    });

    await logActivity(userId, userDisplayName, "CREATE_TITHE_RECORD", {
      recordId: docRef.id,
      collectionName: TITHES_COLLECTION,
      extraInfo: `Member: ${recordData.memberName}, Amount: ${recordData.amount}`
    });
    return docRef.id;
  } catch (error) {
    console.error('Error adding tithe record: ', error);
    throw error;
  }
};

export const getTitheRecords = async (): Promise<TitheRecord[]> => {
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
  dataToUpdate: Partial<TitheFormValues>,
  userId: string,
  userDisplayName: string
): Promise<void> => {
  if (!userId) {
    throw new Error('User ID was not provided to updateTitheRecord service.');
  }
  try {
    const recordRef = doc(db, TITHES_COLLECTION, recordId);
    const updatePayload: any = { ...dataToUpdate };
    if (dataToUpdate.date) {
      updatePayload.date = Timestamp.fromDate(dataToUpdate.date);
    }
    await updateDoc(recordRef, updatePayload);

    await logActivity(userId, userDisplayName, "UPDATE_TITHE_RECORD", {
      recordId: recordId,
      collectionName: TITHES_COLLECTION,
      extraInfo: `Updated tithe for record.` // Member name is not in dataToUpdate directly
    });
  } catch (error) {
    console.error('Error updating tithe record: ', error);
    throw error;
  }
};

export const deleteTitheRecord = async (
  recordId: string,
  userId: string,
  userDisplayName: string
): Promise<void> => {
  if (!userId) {
    throw new Error('User ID was not provided to deleteTitheRecord service.');
  }
  try {
    await deleteDoc(doc(db, TITHES_COLLECTION, recordId));
    await logActivity(userId, userDisplayName, "DELETE_TITHE_RECORD", {
      recordId: recordId,
      collectionName: TITHES_COLLECTION
    });
  } catch (error) {
    console.error('Error deleting tithe record: ', error);
    throw error;
  }
};
