import { getExerciseMeta } from './exerciseMap';

const BODYWEIGHT_KG = 72;

export const getWeekStart = (d) => {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  date.setDate(diff);
  return date.toISOString().split('T')[0];
};

export const normalizeLogs = (rawLogs) => {
  const normalized = [];
  rawLogs.forEach(row => {
    if (!row || !row.date || !row.exercise) return;
    
    let dateObj;
    try {
      dateObj = new Date(row.date);
      if (isNaN(dateObj.getTime())) return;
    } catch { return; }

    const dayKey = dateObj.toISOString().split('T')[0];
    const weekStart = getWeekStart(dateObj);
    const monthKey = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}`;

    const exName = row.exercise.trim();
    const meta = getExerciseMeta(exName);

    const repsParser = parseInt(row.reps) || 0;
    const actualReps = repsParser;
    const actualHold = parseInt(row.hold_seconds || row.hold_seconds === 0 ? row.hold_seconds : row.holdSeconds) || 0;
    const weight = parseFloat(row.weight) || 0;
    
    const restInput = parseInt(row.rest);
    const restSeconds = isNaN(restInput) || restInput <= 0 ? null : restInput;

    const rowWorkload = meta.isRepBased ? (BODYWEIGHT_KG + weight) * actualReps : 0;

    const bucket = meta.bucket;
    let mappedBucket = bucket;
    if (bucket === 'Chest') mappedBucket = 'Push';
    else if (bucket === 'Back' || bucket === 'Arms') mappedBucket = 'Pull';
    else if (bucket === 'Other') mappedBucket = 'Skills'; 

    normalized.push({
      ...row,
      dayKey,
      dateObj,
      weekStart,
      monthKey,
      type: row.category ? row.category.trim() : mappedBucket,
      exercise: exName,
      weight,
      reps: actualReps,
      holdSeconds: actualHold,
      restSeconds,
      isSkill: mappedBucket === 'Skills',
      isHold: meta.isHold,
      isRepBased: meta.isRepBased,
      workload: rowWorkload,
      muscleGroup: bucket,
      mappedBucket: row.category ? row.category.trim() : mappedBucket
    });
  });
  return normalized;
};

export const getDateRanges = () => {
  const today = new Date();
  const dayKey = today.toISOString().split('T')[0];
  const weekStart = getWeekStart(today);
  const currentMonthKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  
  const lastWeekDate = new Date(weekStart);
  lastWeekDate.setDate(lastWeekDate.getDate() - 7);
  const lastWeekStart = lastWeekDate.toISOString().split('T')[0];
  
  const lastMonthDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const lastMonthKey = `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth() + 1).padStart(2, '0')}`;

  return { todayKey: dayKey, currentWeekStart: weekStart, lastWeekStart, currentMonthKey, lastMonthKey };
};

export const getSpiderPoints = (balance) => {
  const max = Math.max(...Object.values(balance), 1);
  const angles = {
    Chest: -Math.PI / 2,
    Back: -Math.PI / 2 + (2 * Math.PI / 5),
    Arms: -Math.PI / 2 + (4 * Math.PI / 5),
    Legs: -Math.PI / 2 + (6 * Math.PI / 5),
    Core: -Math.PI / 2 + (8 * Math.PI / 5)
  };
  const points = Object.keys(angles).map(group => {
    const normalized = balance[group] / max;
    const radius = 5 + (normalized * 40); 
    const x = 50 + radius * Math.cos(angles[group]);
    const y = 50 + radius * Math.sin(angles[group]);
    return `${x},${y}`;
  });
  return points.join(' ');
};

export const formatDuration = (sec) => {
  if (!sec) return "00:00";
  const m = Math.floor(sec / 60).toString().padStart(2, '0');
  const s = (sec % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
};
