import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../utils/supabaseClient';

const LogContext = createContext();

export function LogProvider({ children }) {
  const [user, setUser] = useState(null);
  const [logs, setLogs] = useState(() => {
    // Immediate sync read for instant render if possible
    try {
        // We don't have user.id yet because auth is async
        // But we can check for the last known user or just wait
        return [];
    } catch(e) { return []; }
  });
  const [localLogs, setLocalLogs] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  const [bodyweight, setBodyweight] = useState(72);

  // 1. Auth Listener - handles session persistence
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      // If we have a session, start background check for logs
      if (session?.user) {
          try {
            const cached = localStorage.getItem(`cali_logs_${session.user.id}`);
            if (cached) setLogs(JSON.parse(cached));
          } catch(e) {}
      } else {
          setLoading(false);
          setInitialLoadDone(true); // Nothing to load for guests
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (!session) {
          setLoading(false);
          setInitialLoadDone(true);
      }
    });

    // Refresh session when app comes back into focus (iOS PWA fix)
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user) {
          setUser(session.user)
        } else {
          // Try to refresh the token
          const { data: { session: refreshed } } = await supabase.auth.refreshSession()
          if (refreshed?.user) {
            setUser(refreshed.user)
          }
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      subscription.unsubscribe()
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, []);

  // 2. Fetch bodyweight
  const fetchBodyweight = useCallback(async (userId) => {
    if (!userId) return;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('bodyweight')
        .eq('id', userId)
        .single();
      if (error && error.code !== 'PGRST116') throw error;
      if (data?.bodyweight) setBodyweight(data.bodyweight);
    } catch (err) {
      console.error("Error fetching bodyweight:", err);
    }
  }, []);

  // 3. Fetch logs with localStorage caching
  const fetchLogs = useCallback(async (userId) => {
    if (!userId) {
      setLogs([]);
      setLoading(false);
      return;
    }

    // Background fetch
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('workout_logs')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (data) {
        setLogs(data);
        localStorage.setItem(`cali_logs_${userId}`, JSON.stringify(data));
      }
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
      setInitialLoadDone(true);
    }
  }, []);

  const checkLocalOrphanedLogs = useCallback((userId) => {
    const found = [];
    try {
      for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('cali_logs_') && !key.includes(userId)) {
              try {
                  const data = JSON.parse(localStorage.getItem(key));
                  if (Array.isArray(data)) found.push(...data);
              } catch(e) {}
          }
      }
    } catch (e) {
      console.error("Error checking local storage:", e);
    }
    setLocalLogs(found);
  }, []);

  // 4. Initial fetch trigger
  useEffect(() => {
    if (user) {
      checkLocalOrphanedLogs(user.id);
      fetchBodyweight(user.id);
      fetchLogs(user.id);
    } else {
      setLogs([]);
    }
  }, [user, fetchLogs, fetchBodyweight, checkLocalOrphanedLogs]);

  const addLog = async (logData) => {
    if (!user) return;
    const id = (typeof crypto !== 'undefined' && crypto.randomUUID) 
      ? crypto.randomUUID() 
      : Math.random().toString(36).substring(2) + Date.now().toString(36);

    const newLog = {
      ...logData,
      profile_name: user.id, 
      user_id: user.id,
      id,
      created_at: new Date().toISOString()
    };
    
    setLogs(prev => [newLog, ...prev]);
    localStorage.setItem(`cali_logs_${user.id}`, JSON.stringify([newLog, ...logs]));

    try {
      const { error } = await supabase.from('workout_logs').insert([newLog]);
      if (error) throw error;
    } catch (e) {
      console.error("Sync error", e);
    }
  };

  const deleteLog = async (id) => {
    if (!user) return;
    const nextLogs = logs.filter(l => l.id !== id);
    setLogs(nextLogs);
    localStorage.setItem(`cali_logs_${user.id}`, JSON.stringify(nextLogs));

    try {
      const { error } = await supabase.from('workout_logs').delete().eq('id', id);
      if (error) throw error;
    } catch (e) {
      console.error("Delete error", e);
    }
  };

  const migrateToCloud = async () => {
    if (!user || localLogs.length === 0) return { success: false, message: "Nothing to migrate." };
    setLoading(true);
    try {
      const logsWithUser = localLogs.map(l => ({
        ...l,
        user_id: user.id,
        profile_name: user.id,
        id: (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : Math.random().toString(36),
      }));

      const { error } = await supabase.from('workout_logs').insert(logsWithUser);
      if (error) throw error;
      
      for (let i = localStorage.length - 1; i >= 0; i--) {
          const key = localStorage.key(i);
          if (key && key.startsWith('cali_logs_') && !key.includes(user.id)) {
              localStorage.removeItem(key);
          }
      }
      setLocalLogs([]);
      await fetchLogs(user.id);
      return { success: true, count: localLogs.length };
    } catch (err) {
      console.error("Migration failed", err);
      return { success: false, message: err.message };
    } finally {
      setLoading(false);
    }
  };

  const downloadBackup = () => {
    if (logs.length === 0) return;
    const headers = ["date", "category", "exercise", "weight", "reps", "hold_seconds", "rest", "profile_name", "id", "user_id"];
    const csvContent = "data:text/csv;charset=utf-8," 
      + headers.join(",") + "\n"
      + logs.map(l => headers.map(h => {
        const val = l[h] ?? "";
        return typeof val === 'string' ? `"${val.replace(/"/g, '""')}"` : val;
      }).join(",")).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `cali_backup_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const value = {
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
  };

  return <LogContext.Provider value={value}>{children}</LogContext.Provider>;
}

export const useLogs = () => useContext(LogContext);
