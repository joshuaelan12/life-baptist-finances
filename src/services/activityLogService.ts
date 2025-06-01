
'use server';

import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { ActivityLogAction } from '@/types';

const ACTIVITY_LOGS_COLLECTION = 'activity_logs';

interface LogActivityDetails {
  recordId?: string;
  collectionName?: string;
  extraInfo?: string; // For any other string details
}

export const logActivity = async (
  userId: string,
  userDisplayName: string,
  action: ActivityLogAction,
  details?: LogActivityDetails
): Promise<void> => {
  if (!userId || !userDisplayName) {
    console.warn('User ID or Display Name missing, skipping activity log for action:', action);
    // Optionally throw an error or handle as per app's requirements
    // For now, we'll just log a warning and not save the log.
    return;
  }

  try {
    let detailString = "";
    if (details?.recordId) detailString += `Record ID: ${details.recordId}. `;
    if (details?.collectionName) detailString += `Collection: ${details.collectionName}. `;
    if (details?.extraInfo) detailString += details.extraInfo;


    await addDoc(collection(db, ACTIVITY_LOGS_COLLECTION), {
      userId,
      userDisplayName,
      action,
      timestamp: serverTimestamp(),
      details: detailString.trim() || undefined, // Store undefined if empty
      recordId: details?.recordId || undefined,
      collectionName: details?.collectionName || undefined,
    });
  } catch (error) {
    console.error('Error logging activity: ', error, { userId, userDisplayName, action, details });
    // Decide if this error should be re-thrown or handled silently
  }
};
