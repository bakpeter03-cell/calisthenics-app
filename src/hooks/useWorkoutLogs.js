import { useState, useEffect } from 'react';

const API_URL = 'http://localhost:3001/api/logs';

export function useWorkoutLogs() {
  const [logs, setLogs] = useState(() => {
    try {
      const stored = localStorage.getItem('cali_logs');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    let ignore = false;
    const fetchLogs = async () => {
      try {
        const res = await fetch(API_URL);
        if (res.ok) {
          const data = await res.json();
          if (!ignore) {
            setLogs(data);
            localStorage.setItem('cali_logs', JSON.stringify(data));
          }
        }
      } catch {
        // Backend offline, skip replacing cache
        console.warn("Backend offline. Using local storage as fallback.");
      }
    };
    fetchLogs();
    return () => { ignore = true; };
  }, []);

  const addLog = async (logData) => {
    const today = new Date().toISOString().split('T')[0];
    const logDate = logData.date || today;
    const todaysLogsForEx = logs.filter(l => l.date === logDate && l.exercise === logData.exercise);
    
    const newLog = {
      id: Date.now().toString() + "_" + Math.random().toString(36).substr(2, 9),
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
    const updatedLogs = [newLog, ...logs];
    setLogs(updatedLogs);
    localStorage.setItem('cali_logs', JSON.stringify(updatedLogs));

    try {
      await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newLog)
      });
    } catch (e) {
      console.error("Failed to sync to CSV backend", e);
    }
    
    return newLog;
  };

  const deleteLog = async (id) => {
    const updatedLogs = logs.filter(log => log.id !== id);
    setLogs(updatedLogs);
    localStorage.setItem('cali_logs', JSON.stringify(updatedLogs));

    try {
      await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
    } catch (e) {
      console.error("Failed to delete purely from CSV backend", e);
    }
  };

  return { logs, setLogs, addLog, deleteLog };
}
