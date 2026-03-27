import { useState, useEffect } from 'react';
import { supabase } from '../utils/supabaseClient';

const LOCAL_API_URL = 'http://localhost:3001/api/logs';

export function useWorkoutLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(() => {
    const saved = localStorage.getItem('cali_profile');
    if (saved) return saved;
    
    // Auto-migrate legacy data to Guest profile for the first time
    const legacy = localStorage.getItem('cali_logs');
    if (legacy && !localStorage.getItem('cali_logs_Guest')) {
      localStorage.setItem('cali_logs_Guest', legacy);
      localStorage.setItem('cali_profile', 'Guest');
      return 'Guest';
    }
    return 'Guest';
  });

  const fetchLogs = async (profileName = profile) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('workout_logs')
        .select('*')
        .eq('profile_name', profileName)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      if (data && data.length > 0) {
        setLogs(data);
        localStorage.setItem(`cali_logs_${profileName}`, JSON.stringify(data));
      } else {
        const local = localStorage.getItem(`cali_logs_${profileName}`);
        if (local) setLogs(JSON.parse(local));
        else setLogs([]);
      }
    } catch (err) {
      console.error('Fetch error:', err);
      const local = localStorage.getItem(`cali_logs_${profileName}`);
      if (local) setLogs(JSON.parse(local));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const switchProfile = (name) => {
    localStorage.setItem('cali_profile', name);
    setProfile(name);
    fetchLogs(name);
  };

  const addLog = async (logData) => {
    const today = new Date().toISOString().split('T')[0];
    const logDate = logData.date || today;
    
    const newLog = {
      date: logDate,
      category: logData.category || "Unknown",
      exercise: logData.exercise || "",
      weight: Number(logData.weight) || 0,
      reps: Number(logData.reps) || 0,
      hold_seconds: Number(logData.hold_seconds) || Number(logData.hold) || 0,
      rest: Number(logData.rest) || 0,
      profile_name: profile,
      id: Date.now() 
    };
    
    const updated = [newLog, ...logs];
    setLogs(updated);
    localStorage.setItem(`cali_logs_${profile}`, JSON.stringify(updated));

    try {
      await supabase.from('workout_logs').insert([newLog]);
    } catch (e) {
      console.error("Failed to sync to Supabase", e);
    }
  };

  const deleteLog = async (id) => {
    const updatedLogs = logs.filter(log => log.id !== id);
    setLogs(updatedLogs);
    localStorage.setItem(`cali_logs_${profile}`, JSON.stringify(updatedLogs));

    try {
      await supabase.from('workout_logs').delete().eq('id', id);
    } catch (e) {
      console.error("Failed to delete from Supabase", e);
    }
  };

  const migrateToCloud = async () => {
    // Legacy support: check old 'cali_logs' first if current profile cache is empty
    let logsToMigrate = [];
    const currentProfileCache = localStorage.getItem(`cali_logs_${profile}`);
    const legacyCache = localStorage.getItem('cali_logs');

    if (currentProfileCache) {
      logsToMigrate = JSON.parse(currentProfileCache);
    } else if (legacyCache) {
      logsToMigrate = JSON.parse(legacyCache);
    }

    if (logsToMigrate.length === 0) return { success: false, message: "No local data found to migrate." };
    
    setLoading(true);
    try {
      const logsWithProfile = logsToMigrate.map(l => ({
        ...l,
        profile_name: profile,
        // Ensure numeric fields are numbers
        weight: Number(l.weight) || 0,
        reps: Number(l.reps) || 0,
        hold_seconds: Number(l.hold_seconds || l.hold) || 0,
        rest: Number(l.rest) || 0
      }));

      const { error } = await supabase.from('workout_logs').insert(logsWithProfile);
      if (error) throw error;
      
      await fetchLogs();
      return { success: true, count: logsToMigrate.length };
    } catch (err) {
      console.error("Migration failed", err);
      return { success: false, message: err.message };
    } finally {
      setLoading(false);
    }
  };

  return { logs, loading, addLog, deleteLog, fetchLogs, migrateToCloud, profile, switchProfile };
}
