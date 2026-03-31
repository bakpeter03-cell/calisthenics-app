import { useLogs } from '../contexts/LogContext';

export function useWorkoutLogs() {
  const { 
    logs, 
    localLogs, 
    loading, 
    initialLoadDone,
    user, 
    bodyweight, 
    addLog, 
    deleteLog, 
    fetchLogs, 
    migrateToCloud, 
    downloadBackup 
  } = useLogs();

  return { logs, localLogs, loading, initialLoadDone, bodyweight, addLog, deleteLog, fetchLogs, user, migrateToCloud, downloadBackup };
}
