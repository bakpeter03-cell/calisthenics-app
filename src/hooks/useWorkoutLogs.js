import { useState, useEffect } from 'react';
import { supabase } from '../utils/supabaseClient';

const LOCAL_API_URL = 'http://localhost:3001/api/logs';

export function useWorkoutLogs() {
  const [logs, setLogs] = useState(() => {
    try {
      const stored = localStorage.getItem('cali_logs');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [loading, setLoading] = useState(false);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('workout_logs')
        .select('*')
        .order('date', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // CRITICAL FIX: Only overwrite local storage if cloud has data
      // This prevents wiping local history before migration!
      if (data && data.length > 0) {
        setLogs(data);
        localStorage.setItem('cali_logs', JSON.stringify(data));
      } else if (data && data.length === 0) {
        // Cloud is empty, but we don't wipe local logs yet.
        // We let the UI handle the migration.
        console.log("Cloud is empty. Keeping local logs for migration.");
      }
    } catch (err) {
      console.warn("Supabase fetch failed. Using local cache.", err);
    } finally {
      setLoading(false);
    }
  };

  // One-time utility to pull from the local development server (CSV)
  const fetchLocalCSV = async () => {
    setLoading(true);
    try {
      const res = await fetch(LOCAL_API_URL);
      if (res.ok) {
        const data = await res.json();
        if (data && data.length > 0) {
          setLogs(data);
          localStorage.setItem('cali_logs', JSON.stringify(data));
          return { success: true, count: data.length };
        }
        return { success: false, message: "Local CSV is empty." };
      }
      return { success: false, message: "Local server (port 3001) not reachable." };
    } catch (err) {
      return { success: false, message: "Local server offline." };
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const addLog = async (logData) => {
    // Determine set number locally for immediate UI response
    const today = new Date().toISOString().split('T')[0];
    const logDate = logData.date || today;
    const todaysLogsForEx = logs.filter(l => l.date === logDate && l.exercise === logData.exercise);
    
    const tempId = 'temp-' + Date.now();
    const newLog = {
      date: logDate,
      category: logData.category || "Unknown",
      exercise: logData.exercise || "",
      set: todaysLogsForEx.length + 1,
      weight: Number(logData.weight) || 0,
      reps: Number(logData.reps) || 0,
      hold_seconds: Number(logData.hold_seconds) || Number(logData.hold) || 0,
      rest: Number(logData.rest) || 0,
    };
    
    // Optimistic UI update
    setLogs(prev => [{ ...newLog, id: tempId }, ...prev]);

    try {
      const { data, error } = await supabase
        .from('workout_logs')
        .insert([newLog])
        .select();

      if (error) throw error;
      
      // Update with real ID from Supabase
      if (data && data[0]) {
        setLogs(prev => {
          const updated = prev.map(l => l.id === tempId ? data[0] : l);
          localStorage.setItem('cali_logs', JSON.stringify(updated));
          return updated;
        });
      }
    } catch (e) {
      console.error("Failed to sync to Supabase", e);
    }
  };

  const deleteLog = async (id) => {
    if (typeof id === 'string' && id.startsWith('temp-')) {
       setLogs(prev => prev.filter(l => l.id !== id));
       return;
    }

    const updatedLogs = logs.filter(log => log.id !== id);
    setLogs(updatedLogs);
    localStorage.setItem('cali_logs', JSON.stringify(updatedLogs));

    try {
      const { error } = await supabase
        .from('workout_logs')
        .delete()
        .eq('id', id);
      if (error) throw error;
    } catch (e) {
      console.error("Failed to delete from Supabase", e);
    }
  };

  const migrateToCloud = async () => {
    const localLogs = JSON.parse(localStorage.getItem('cali_logs') || '[]');
    if (localLogs.length === 0) return { success: false, message: "No local data found to migrate." };
    
    // Check if cloud is already populated to avoid duplicates (naive check)
    const { count } = await supabase.from('workout_logs').select('*', { count: 'exact', head: true });
    if (count > 0) return { success: false, message: "Cloud already has data. Migration skipped to prevent duplicates." };

    setLoading(true);
    try {
      // Strip local IDs to let Supabase generate UUIDs
      const logsToUpload = localLogs.map(({ id, ...rest }) => ({
         ...rest,
         weight: Number(rest.weight) || 0,
         reps: Number(rest.reps) || 0,
         hold_seconds: Number(rest.hold_seconds) || 0,
         rest: Number(rest.rest) || 0
      }));

      const { error } = await supabase.from('workout_logs').insert(logsToUpload);
      if (error) throw error;
      
      await fetchLogs();
      return { success: true, count: localLogs.length };
    } catch (err) {
      console.error("Migration failed", err);
      return { success: false, message: err.message };
    } finally {
      setLoading(false);
    }
  };

  return { logs, loading, addLog, deleteLog, fetchLogs, migrateToCloud, fetchLocalCSV };
}
