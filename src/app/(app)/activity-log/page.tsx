
"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, AlertTriangle, History } from "lucide-react";
import { format } from "date-fns";
import { auth, db } from '@/lib/firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { useCollectionData } from 'react-firebase-hooks/firestore';
import { collection, query, orderBy, Timestamp, type DocumentData, type QueryDocumentSnapshot, type SnapshotOptions, limit } from 'firebase/firestore';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import type { ActivityLogRecord, ActivityLogRecordFirestore } from '@/types';

const activityLogConverter = {
  toFirestore(log: ActivityLogRecord): DocumentData {
    // This is mostly for type consistency if we were to write with the converter
    const { id, timestamp, ...rest } = log;
    return {
      ...rest,
      timestamp: Timestamp.fromDate(timestamp),
    };
  },
  fromFirestore(snapshot: QueryDocumentSnapshot, options: SnapshotOptions): ActivityLogRecord {
    const data = snapshot.data(options) as Omit<ActivityLogRecordFirestore, 'id'>;
    return {
      id: snapshot.id,
      userId: data.userId,
      userDisplayName: data.userDisplayName,
      action: data.action,
      timestamp: (data.timestamp as Timestamp).toDate(),
      details: data.details,
      collectionName: data.collectionName,
      recordId: data.recordId,
    };
  },
};

export default function ActivityLogPage() {
  const [authUser, authLoading, authError] = useAuthState(auth);

  const logsCollectionRef = authUser ? collection(db, 'activity_logs') : null;
  // Fetch latest 100 logs, ordered by timestamp descending
  const logsQuery = logsCollectionRef
    ? query(logsCollectionRef, orderBy('timestamp', 'desc'), limit(100)).withConverter<ActivityLogRecord>(activityLogConverter)
    : null;

  const [activityLogs, isLoadingLogs, errorLogs] = useCollectionData(logsQuery);

  const formatLogTimestamp = (date: Date) => {
    return format(date, "PPpp"); // e.g., Aug 17, 2023, 2:30:45 PM
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

  if (!authUser) {
    return (
      <div className="space-y-6 md:space-y-8 p-4">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Not Authenticated</AlertTitle>
          <AlertDescription>Please log in to view the activity log.</AlertDescription>
        </Alert>
      </div>
    );
  }


  return (
    <div className="space-y-6 md:space-y-8">
      <div className="flex items-center gap-3">
        <History className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-bold tracking-tight text-foreground">User Activity Log</h1>
      </div>
      
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Recent Activities</CardTitle>
          <CardDescription>Showing the last 100 recorded activities in the system.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingLogs && (
            <div className="flex justify-center items-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="ml-2">Loading activity logs...</p>
            </div>
          )}
          {!isLoadingLogs && errorLogs && (
             <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Error Loading Logs</AlertTitle>
              <AlertDescription>{errorLogs.message}</AlertDescription>
            </Alert>
          )}
          {!isLoadingLogs && !errorLogs && (!activityLogs || activityLogs.length === 0) && (
            <p className="text-center text-muted-foreground py-10">No activity logs found.</p>
          )}
          {!isLoadingLogs && !errorLogs && activityLogs && activityLogs.length > 0 && (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activityLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>{formatLogTimestamp(log.timestamp)}</TableCell>
                      <TableCell>{log.userDisplayName} ({log.userId.substring(0,6)}...)</TableCell>
                      <TableCell>
                        <span className="font-medium">
                          {log.action.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}
                        </span>
                      </TableCell>
                      <TableCell className="max-w-[300px] truncate" title={log.details}>{log.details || 'N/A'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
