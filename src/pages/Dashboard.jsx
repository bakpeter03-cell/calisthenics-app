import { useState, useMemo } from 'react';
import { useWorkoutLogs } from '../hooks/useWorkoutLogs';
import { normalizeLogs, getDateRanges, formatDuration } from '../utils/analytics';
import { EXERCISE_MAP, getExerciseMeta } from '../utils/exerciseMap';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

export default function Dashboard() {
  const { logs } = useWorkoutLogs();
  
  // Normalization
  const normalizedLogs = useMemo(() => normalizeLogs(logs), [logs]);
  
  // Global Filters
  const [dateFilter, setDateFilter] = useState('This Week');
  const [typeFilter, setTypeFilter] = useState('All');

  const holdExercises = useMemo(() => Object.keys(EXERCISE_MAP).filter(ex => EXERCISE_MAP[ex].isHold), []);
  const [skillChartEx, setSkillChartEx] = useState(holdExercises[0] || 'Front Lever');
  
  const [catChartFilter, setCatChartFilter] = useState('Pull');
  const [selectedEx, setSelectedEx] = useState({}); // { name: boolean }
  const chartColors = ['#006c49', '#0058be', '#10b981', '#a43a3a', '#fc7c78', '#6ffbbe', '#4edea3', '#adc6ff', '#842225', '#002113'];
  
  const { currentWeekStart, currentMonthKey, lastWeekStart, lastMonthKey } = getDateRanges();
  
  // Active Logs (Date & Type Filtered)
  const activeLogs = useMemo(() => {
    return normalizedLogs.filter(log => {
      if (dateFilter === 'This Week' && log.weekStart !== currentWeekStart) return false;
      if (dateFilter === 'This Month' && log.monthKey !== currentMonthKey) return false;
      if (typeFilter !== 'All' && log.type.toLowerCase() !== typeFilter.toLowerCase()) return false;
      return true;
    });
  }, [normalizedLogs, dateFilter, typeFilter, currentWeekStart, currentMonthKey]);

  // Date Only Filter for Muscle Balance
  const dateOnlyLogs = useMemo(() => {
    return normalizedLogs.filter(log => {
      if (dateFilter === 'This Week' && log.weekStart !== currentWeekStart) return false;
      if (dateFilter === 'This Month' && log.monthKey !== currentMonthKey) return false;
      return true;
    });
  }, [normalizedLogs, dateFilter, currentWeekStart, currentMonthKey]);

  // --- 1. Overview (This Week vs Last Week) ---
  const ovThisWeekLogs = useMemo(() => normalizedLogs.filter(l => l.weekStart === currentWeekStart), [normalizedLogs, currentWeekStart]);
  const ovLastWeekLogs = useMemo(() => normalizedLogs.filter(l => l.weekStart === lastWeekStart), [normalizedLogs, lastWeekStart]);
  
  const ovThisWeekDays = new Set(ovThisWeekLogs.map(l => l.dayKey)).size;
  const ovLastWeekDays = new Set(ovLastWeekLogs.map(l => l.dayKey)).size;
  const ovThisWeekReps = ovThisWeekLogs.filter(l => l.isRepBased).reduce((sum, l) => sum + l.reps, 0);
  const ovLastWeekReps = ovLastWeekLogs.filter(l => l.isRepBased).reduce((sum, l) => sum + l.reps, 0);
  const ovThisWeekLoad = ovThisWeekLogs.filter(l => l.isRepBased).reduce((sum, l) => sum + l.workload, 0);
  const ovLastWeekLoad = ovLastWeekLogs.filter(l => l.isRepBased).reduce((sum, l) => sum + l.workload, 0);

  const renderBadge = (current, previous) => {
    return null;
  };

  // --- 2. Consistency ---
  const allUniqueDays = useMemo(() => [...new Set(normalizedLogs.map(l => l.dayKey))].sort((a,b) => b.localeCompare(a)), [normalizedLogs]);
  const getDaysAgoStr = (days) => {
    const d = new Date();
    d.setDate(d.getDate() - days);
    return d.toISOString().split('T')[0];
  };

  let currentStreak = 0;
  let lastStreak = 0;
  let checkDay = -1;
  if (allUniqueDays.includes(getDaysAgoStr(0))) checkDay = 0;
  else if (allUniqueDays.includes(getDaysAgoStr(1))) checkDay = 1;
  else {
    if (allUniqueDays.length > 0) {
       const mrDate = new Date(allUniqueDays[0]);
       lastStreak = 1;
       let pastD = 1;
       while (true) {
         const prev = new Date(mrDate);
         prev.setDate(prev.getDate() - pastD);
         if (allUniqueDays.includes(prev.toISOString().split('T')[0])) {
           lastStreak++; pastD++;
         } else break;
       }
    }
  }

  if (checkDay !== -1) {
    currentStreak++;
    let testOffset = checkDay + 1;
    while(allUniqueDays.includes(getDaysAgoStr(testOffset))) {
      currentStreak++;
      testOffset++;
    }
  }

  const uniqueDaysThisWeek = new Set(normalizedLogs.filter(l => l.weekStart === currentWeekStart).map(l => l.dayKey)).size;
  const uniqueDaysThisMonth = new Set(normalizedLogs.filter(l => l.monthKey === currentMonthKey).map(l => l.dayKey)).size;

  const currentMonthDate = new Date();
  const cmYear = currentMonthDate.getFullYear();
  const cmMonth = currentMonthDate.getMonth();
  const daysInMonth = new Date(cmYear, cmMonth + 1, 0).getDate();
  const firstDay = new Date(cmYear, cmMonth, 1).getDay();
  const offset = firstDay === 0 ? 6 : firstDay - 1;
  
  const heatmapData = [];
  for(let i=0; i<offset; i++) heatmapData.push(null);
  for(let i=1; i<=daysInMonth; i++) {
    const dStr = `${cmYear}-${String(cmMonth+1).padStart(2,'0')}-${String(i).padStart(2,'0')}`;
    const hasWorkout = allUniqueDays.includes(dStr);
    const dayRows = normalizedLogs.filter(l => l.dayKey === dStr).length;
    heatmapData.push({ date: dStr, label: i, hasWorkout, rows: dayRows });
  }
  const totalCells = Math.ceil(heatmapData.length / 7) * 7;
  while(heatmapData.length < totalCells) heatmapData.push(null);

  // Consistency additions: Category frequency this month & this week
  const cmLogs = normalizedLogs.filter(l => l.monthKey === currentMonthKey);
  const cmCatFreq = {};
  cmLogs.forEach(l => {
     if (!cmCatFreq[l.mappedBucket]) cmCatFreq[l.mappedBucket] = new Set();
     cmCatFreq[l.mappedBucket].add(l.dayKey);
  });
  const cmCatFreqDisplay = ['Push', 'Pull', 'Legs', 'Core', 'Skills']
     .map(cat => ({ cat, count: cmCatFreq[cat] ? cmCatFreq[cat].size : 0 }));

  const cwLogs = normalizedLogs.filter(l => l.weekStart === currentWeekStart);
  const cwCatFreq = {};
  cwLogs.forEach(l => {
     if (!cwCatFreq[l.mappedBucket]) cwCatFreq[l.mappedBucket] = new Set();
     cwCatFreq[l.mappedBucket].add(l.dayKey);
  });
  const cwCatFreqDisplay = ['Push', 'Pull', 'Legs', 'Core', 'Skills']
     .map(cat => ({ cat, count: cwCatFreq[cat] ? cwCatFreq[cat].size : 0 }));

  // --- 3. Total Volume ---
  const volumeLogs = activeLogs.filter(l => l.isRepBased);
  const totalReps = volumeLogs.reduce((acc, l) => acc + l.reps, 0);
  const totalWorkload = volumeLogs.reduce((acc, l) => acc + l.workload, 0);
  const volUniqueDays = new Set(volumeLogs.map(l => l.dayKey)).size || 1;
  const avgRepsPerDay = Math.round(totalReps / volUniqueDays);
  const avgWorkloadPerDay = Math.round(totalWorkload / volUniqueDays);

  // Volume period comparison
  let prevTotalReps = null;
  let prevTotalLoad = null;
  if (dateFilter === 'This Week') {
    const prevVolLogs = normalizedLogs.filter(l => l.weekStart === lastWeekStart && l.isRepBased && (typeFilter === 'All' || l.type.toLowerCase() === typeFilter.toLowerCase()));
    prevTotalReps = prevVolLogs.reduce((acc, l) => acc + l.reps, 0);
    prevTotalLoad = prevVolLogs.reduce((acc, l) => acc + l.workload, 0);
  } else if (dateFilter === 'This Month') {
    const prevVolLogs = normalizedLogs.filter(l => l.monthKey === lastMonthKey && l.isRepBased && (typeFilter === 'All' || l.type.toLowerCase() === typeFilter.toLowerCase()));
    prevTotalReps = prevVolLogs.reduce((acc, l) => acc + l.reps, 0);
    prevTotalLoad = prevVolLogs.reduce((acc, l) => acc + l.workload, 0);
  }

  const volCatSplitArr = ['Push', 'Pull', 'Legs', 'Core'].map(cat => {
    const repSum = volumeLogs.filter(l => l.mappedBucket === cat).reduce((sum, l) => sum + l.reps, 0);
    return { cat, reps: repSum, pct: totalReps > 0 ? Math.round((repSum / totalReps) * 100) : 0 };
  });

  // --- 4. Muscle Balance ---
  const balanceLogs = dateOnlyLogs.filter(l => l.isRepBased);
  const balance = { Chest:0, Back:0, Arms:0, Legs:0, Core:0 };
  balanceLogs.forEach(l => {
    if (balance[l.muscleGroup] !== undefined) balance[l.muscleGroup] += l.reps;
  });
  const radarData = [
    { subject: `Chest ${balance.Chest}`, reps: balance.Chest },
    { subject: `Back ${balance.Back}`, reps: balance.Back },
    { subject: `Arms ${balance.Arms}`, reps: balance.Arms },
    { subject: `Legs ${balance.Legs}`, reps: balance.Legs },
    { subject: `Core ${balance.Core}`, reps: balance.Core },
  ];

  const mbPushing = balance.Chest + balance.Arms;
  const mbUpper = balance.Chest + balance.Back + balance.Arms;
  const mbLower = balance.Legs;

  const validBalanceCats = ['Chest', 'Back', 'Arms', 'Legs', 'Core'];
  const avgVolAll = totalReps / validBalanceCats.length;
  let undertrainedWarning = null;
  if (totalReps > 50) {
    const lowestCat = validBalanceCats.reduce((a, b) => balance[a] < balance[b] ? a : b);
    if (balance[lowestCat] === 0) {
      undertrainedWarning = `${lowestCat} volume is absent in this period.`;
    } else if (balance[lowestCat] < avgVolAll * 0.25) {
      undertrainedWarning = `${lowestCat} volume is severely undertrained in this period.`;
    }
  }
  
  // --- Rest Efficiency ---
  const restLogs = activeLogs.filter(l => l.restSeconds);
  const avgRest = restLogs.length ? Math.round(restLogs.reduce((acc, l) => acc + l.restSeconds, 0) / restLogs.length) : null;
  let restStatus = 'Optimal';
  let gaugePercent = 0;
  if (avgRest !== null) {
     if (avgRest < 150) restStatus = 'Low';
     else if (avgRest > 180) restStatus = 'High';
     gaugePercent = Math.min(Math.max((avgRest / 300) * 100, 0), 100);
  }

  // --- 5. Weekly Activity (Last 7 Days - Bar Chart) ---
  const last7DaysLogs = normalizedLogs.filter(l => {
    if (typeFilter !== 'All' && l.type.toLowerCase() !== typeFilter.toLowerCase()) return false;
    return l.isRepBased;
  });

  const last7DaysData = Array.from({length:7}).map((_, i) => {
    const dStr = getDaysAgoStr(6 - i);
    const dayMatches = last7DaysLogs.filter(l => l.dayKey === dStr);
    const reps = dayMatches.reduce((sum, l) => sum + l.reps, 0);
    return { fullDate: dStr, label: new Date(dStr).toLocaleDateString('en-US', {weekday:'short'}), reps };
  });

  // --- 6. Skill Progression ---
  const rawSkillLogs = normalizedLogs.filter(l => l.exercise === skillChartEx && l.isHold);
  const weeklySkillData = {};
  rawSkillLogs.forEach(l => {
    if (!weeklySkillData[l.weekStart]) weeklySkillData[l.weekStart] = { best: 0, sum: 0, count: 0 };
    weeklySkillData[l.weekStart].best = Math.max(weeklySkillData[l.weekStart].best, l.holdSeconds);
    weeklySkillData[l.weekStart].sum += l.holdSeconds;
    weeklySkillData[l.weekStart].count++;
  });
  
  const skillWeeks = Object.keys(weeklySkillData).sort((a,b) => a.localeCompare(b));
  const last4SkillWeeks = skillWeeks.slice(-4);
  const skillChartData = last4SkillWeeks.map(w => ({
    week: w.split('-').slice(1).join('/'),
    bestHit: weeklySkillData[w].best,
    average: weeklySkillData[w].count > 0 ? Math.round((weeklySkillData[w].sum / weeklySkillData[w].count) * 10) / 10 : 0
  }));

  // --- 7. Personal Bests (Strict List) ---
  const pbConfig = [
    { name: 'Muscle-up', type: 'reps', unit: 'reps' },
    { name: 'Front Lever', type: 'hold', unit: 's' },
    { name: 'Handstand', type: 'hold', unit: 's' },
    { name: 'L-sit', type: 'hold', unit: 's' }
  ];

  const pbs = pbConfig.map(cfg => {
    const exLogs = normalizedLogs.filter(l => l.exercise.toLowerCase() === cfg.name.toLowerCase());
    if (!exLogs.length) return { name: cfg.name, val: 0, unit: cfg.unit, hasData: false };
    
    let maxVal = -1;
    let bestLog = null;
    exLogs.forEach(l => {
      const val = cfg.type === 'hold' ? l.holdSeconds : l.reps;
      if (val > maxVal) {
        maxVal = val;
        bestLog = l;
      }
    });

    if (!bestLog || maxVal <= 0) return { name: cfg.name, val: 0, unit: cfg.unit, hasData: false };

    return {
      name: cfg.name,
      val: maxVal,
      unit: cfg.unit,
      hasData: true,
      achievedDate: bestLog.dayKey
    };
  });

  // --- 8. Category Chart (30 Days) ---
  const last30Days = useMemo(() => {
    const days = [];
    for(let i=29; i>=0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      days.push(`${y}-${m}-${day}`);
    }
    return days;
  }, []);

  const CAT_MAP = {
    Push: ['Push-up', 'Decline Push-up', 'Incline Push-up', 'Dip', 'Straight Bar Dip', 'Pike Push-up', 'Elevated Pike Pushup', 'Handstand Push-up', 'Archer Push-up'],
    Pull: ['Pull-up', 'Row', 'Tucked Front Lever Raise', 'Advanced Tucked Front Lever Raise', 'One-leg Front Lever Raise', 'Front Lever Raise', 'Chin-up', 'Muscle-up'],
    Legs: ['Squat', 'Pistol Squat', 'Lunge', 'One-leg Lunge', 'Calf Raise'],
    Core: ['Knee Raise', 'Toes-to-bar', 'Dragon Flag', 'L-sit']
  };

  const thirtyDayLogs = useMemo(() => {
    const validExercises = CAT_MAP[catChartFilter] || [];
    return normalizedLogs.filter(l => {
      if (!last30Days.includes(l.dayKey) || !l.isRepBased) return false;
      return validExercises.some(ex => ex.toLowerCase() === l.exercise.toLowerCase());
    });
  }, [normalizedLogs, last30Days, catChartFilter]);

  const availableExercises = useMemo(() => {
    const available = CAT_MAP[catChartFilter] || [];
    const exCounts = thirtyDayLogs.reduce((acc, l) => {
      const canonEx = available.find(ex => ex.toLowerCase() === l.exercise.toLowerCase()) || l.exercise;
      acc[canonEx] = (acc[canonEx] || 0) + l.reps;
      return acc;
    }, {});
    return Object.keys(exCounts).sort((a, b) => exCounts[b] - exCounts[a]);
  }, [thirtyDayLogs, catChartFilter]);

  const chartExercises = useMemo(() => {
    return availableExercises.filter(ex => selectedEx[ex] !== false);
  }, [availableExercises, selectedEx]);

  const catChartData = useMemo(() => {
    return last30Days.map(dateStr => {
      const dayMatches = thirtyDayLogs.filter(l => l.dayKey === dateStr);
      const dataObj = { date: dateStr, formattedDate: dateStr.split('-').slice(1).join('/') };
      chartExercises.forEach(ex => {
        const repsForEx = dayMatches.filter(l => l.exercise.toLowerCase() === ex.toLowerCase()).reduce((sum, l) => sum + l.reps, 0);
        dataObj[ex] = repsForEx > 0 ? repsForEx : null; 
      });
      return dataObj;
    });
  }, [last30Days, thirtyDayLogs, chartExercises]);

  return (
    <div className="space-y-8">
      {/* Global Filters */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-surface-container-lowest p-6 rounded-xl shadow-sm border border-outline-variant/20 gap-4">
        <div>
          <h2 className="font-headline text-3xl font-black tracking-tighter text-on-surface">Overview</h2>
          <p className="text-on-surface-variant font-label text-xs font-bold uppercase tracking-widest mt-1">
            Total Logs: {normalizedLogs.length}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
           <select value={dateFilter} onChange={e => setDateFilter(e.target.value)} className="bg-surface-container-low border-none rounded-lg text-sm font-bold uppercase tracking-widest py-2 px-4 cursor-pointer focus:ring-secondary">
             <option>This Week</option>
             <option>This Month</option>
             <option>All Time</option>
           </select>
           <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="bg-surface-container-low border-none rounded-lg text-sm font-bold uppercase tracking-widest py-2 px-4 cursor-pointer focus:ring-secondary">
             <option>All</option>
             <option>Push</option>
             <option>Pull</option>
             <option>Legs</option>
             <option>Core</option>
             <option>Skills</option>
           </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        
        {/* 1. Overview (This Week vs Last Week) */}
        <section className="md:col-span-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant/20 shadow-sm flex flex-col justify-between">
            <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2">Workout Days</p>
            <div className="flex items-end gap-2 my-2">
              <span className="text-4xl font-black text-on-surface leading-none">{ovThisWeekDays}</span>
              <span className="text-sm font-bold text-on-surface-variant mb-1">/ 7</span>
              {renderBadge(ovThisWeekDays, ovLastWeekDays)}
            </div>
            <p className="text-[11px] font-bold text-on-surface-variant uppercase tracking-widest">Last Week: {ovLastWeekDays}</p>
          </div>

          <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant/20 shadow-sm flex flex-col justify-between">
            <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2 flex justify-between">
              Total Reps 
            </p>
            <div className="flex items-end gap-2 my-2">
              <span className="text-4xl font-black text-primary leading-none">{ovThisWeekReps}</span>
              {renderBadge(ovThisWeekReps, ovLastWeekReps)}
            </div>
            <p className="text-[11px] font-bold text-on-surface-variant uppercase tracking-widest">Last Week: {ovLastWeekReps}</p>
          </div>

          <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant/20 shadow-sm flex flex-col justify-between">
            <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2 flex justify-between">
              Workload 
            </p>
            <div className="flex items-end gap-2 my-2">
              <span className="text-4xl font-black text-secondary leading-none">{ovThisWeekLoad.toLocaleString()}<span className="text-sm ml-1 text-on-surface-variant">kg</span></span>
              {renderBadge(ovThisWeekLoad, ovLastWeekLoad)}
            </div>
            <p className="text-[11px] font-bold text-on-surface-variant uppercase tracking-widest">Last Week: {ovLastWeekLoad.toLocaleString()} kg</p>
          </div>
        </section>        
        {/* Category Exercise Progress (30 Days) */}
        <section className="md:col-span-12 bg-surface-container-lowest rounded-xl p-8 shadow-sm border border-outline-variant/20">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
            <h3 className="font-headline text-2xl font-black tracking-tighter uppercase text-on-surface">Category Progress <span className="text-primary text-lg ml-1">30D</span></h3>
            
            <div className="flex flex-wrap items-center gap-6">
              <select value={catChartFilter} onChange={e => { setCatChartFilter(e.target.value); setSelectedEx({}); }} className="bg-surface border border-outline-variant/20 rounded-lg text-sm font-bold uppercase py-1.5 pl-3 pr-8 focus:ring-primary outline-none appearance-none bg-no-repeat bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2220%22%20height%3D%2220%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22M7%2010L12%2015L17%2010%22%20stroke%3D%22%2349454f%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%3C%2Fsvg%3E')] bg-[position:right_8px_center]">
                <option value="Push">PUSH</option>
                <option value="Pull">PULL</option>
                <option value="Legs">LEGS</option>
                <option value="Core">CORE</option>
              </select>
            </div>
          </div>
          
          <div className="w-full h-[400px] mt-2">
             {chartExercises.length === 0 ? (
                <div className="w-full h-full flex flex-col items-center justify-center text-on-surface-variant font-bold text-sm bg-surface rounded-xl border border-dashed border-outline-variant/30">
                  <span className="material-symbols-outlined text-4xl mb-2 opacity-30">monitoring</span>
                  No reps logged in the last 30 days.
                </div>
             ) : (
             <ResponsiveContainer width="100%" height="100%">
               <LineChart data={catChartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                 <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e0e3e5" />
                 <XAxis dataKey="formattedDate" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold', fill: '#73777f' }} dy={10} minTickGap={20} />
                 <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold', fill: '#73777f' }} />
                 <Tooltip cursor={{fill: 'rgba(0,0,0,0.05)'}} contentStyle={{ borderRadius: '8px', fontSize: '12px', border: '1px solid #e0e3e5', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', fontWeight: 'bold' }} labelStyle={{ color: '#10b981', marginBottom: '4px' }} />
                 
                 {chartExercises.map((ex) => {
                    const colorIdx = availableExercises.indexOf(ex);
                    return (
                      <Line 
                        key={ex} 
                        type="linear" 
                        connectNulls={true} 
                        dataKey={ex} 
                        stroke={chartColors[colorIdx % chartColors.length]} 
                        strokeWidth={3} 
                        dot={{ r: 4, strokeWidth: 2, fill: '#fff' }} 
                        activeDot={{ r: 6 }} 
                      />
                    );
                 })}
               </LineChart>
             </ResponsiveContainer>
             )}
          </div>

          {/* Custom Interactive Legend */}
          {availableExercises.length > 0 && (
            <div className="flex flex-wrap gap-x-8 gap-y-4 mt-8 px-4 justify-center border-t border-outline-variant/10 pt-8">
               {availableExercises.map((ex, idx) => {
                 const isSelected = selectedEx[ex] !== false;
                 const color = chartColors[idx % chartColors.length];
                 return (
                   <button 
                     key={ex}
                     onClick={() => setSelectedEx(prev => ({ ...prev, [ex]: !isSelected }))}
                     className="flex items-center gap-2.5 group transition-all"
                   >
                     <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all`} style={{ borderColor: color, backgroundColor: isSelected ? color : 'transparent' }}>
                        {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                     </div>
                     <span className={`text-[10px] font-black uppercase tracking-widest ${isSelected ? 'text-on-surface' : 'text-on-surface-variant opacity-40'}`}>
                       {ex}
                     </span>
                   </button>
                 );
               })}
            </div>
          )}
       </section>

        {/* Consistency Heatmap */}
        <section className="md:col-span-12 bg-surface-container-lowest rounded-xl p-8 shadow-sm border border-outline-variant/20 flex flex-col gap-6">
          <div className="mb-2">
            <h3 className="font-headline text-2xl font-black tracking-tighter uppercase text-on-surface">Consistency</h3>
            <p className="text-on-surface-variant text-sm mt-1 font-bold">
               {currentStreak > 0 ? `Current Streak: ${currentStreak} days` : `Last Streak: ${lastStreak} days`}
            </p>
          </div>

          <div className="flex flex-col lg:flex-row gap-6 items-stretch">
            {/* THIS WEEK */}
            <div className="bg-surface flex-1 p-6 rounded-xl border border-outline-variant/20 shadow-sm flex flex-col items-center">
              <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1">This Week</p>
              <p className="text-5xl font-black text-primary leading-none mb-6">{uniqueDaysThisWeek}</p>
              
              <div className="w-full space-y-2 border-t border-outline-variant/10 pt-4">
                <p className="text-[9px] font-black uppercase tracking-[0.1em] text-on-surface-variant/50 text-center mb-2">By Category</p>
                {cwCatFreqDisplay.map(c => (
                  <div key={c.cat} className="flex justify-between items-center group">
                    <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">{c.cat}</span>
                    <span className="text-[10px] font-black text-on-surface">{c.count}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* THIS MONTH */}
            <div className="bg-surface flex-1 p-6 rounded-xl border border-outline-variant/20 shadow-sm flex flex-col items-center">
              <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1">This Month</p>
              <p className="text-5xl font-black text-primary leading-none mb-6">{uniqueDaysThisMonth}</p>
              
              <div className="w-full space-y-2 border-t border-outline-variant/10 pt-4">
                <p className="text-[9px] font-black uppercase tracking-[0.1em] text-on-surface-variant/50 text-center mb-2">By Category</p>
                {cmCatFreqDisplay.map(c => (
                  <div key={c.cat} className="flex justify-between items-center group">
                    <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">{c.cat}</span>
                    <span className="text-[10px] font-black text-on-surface">{c.count}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* MONTH CALENDAR */}
            <div className="flex-1 lg:flex-[2] bg-surface-container-low rounded-xl p-6 border border-outline-variant/20 shadow-sm flex flex-col">
              <p className="text-[11px] font-black uppercase tracking-widest text-on-surface text-center mb-4">
                 {currentMonthDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
              </p>
              <div className="w-full grid grid-cols-7 gap-1.5 flex-grow align-middle">
                 {['M','T','W','T','F','S','S'].map((day, idx) => (
                   <div key={'h-'+idx} className="text-[10px] font-black text-center text-on-surface-variant/50 uppercase pb-1">{day}</div>
                 ))}
                 {heatmapData.map((d, i) => d ? (
                   <div 
                     key={i} 
                     className={`w-full aspect-square rounded flex items-center justify-center text-[10px] font-black transition-all ${d.hasWorkout ? 'bg-primary text-on-primary shadow-sm hover:scale-[1.05]' : 'bg-surface border border-outline-variant/5 text-on-surface-variant/30 hover:bg-surface-container-high'}`}
                     title={`${d.date} | ${d.hasWorkout ? 'Worked out' : 'Rest'}`}
                   >
                     {d.label}
                   </div>
                 ) : (
                   <div key={i} className="w-full aspect-square opacity-0"></div>
                 ))}
              </div>
            </div>
          </div>
        </section>

        {/* Muscle Balance using Recharts */}
        <section className="md:col-span-6 bg-surface-container-lowest rounded-xl p-8 shadow-sm border border-outline-variant/20 flex flex-col items-center justify-between">
          <div className="w-full mb-2">
             <h3 className="font-headline text-2xl font-black tracking-tighter uppercase text-center text-on-surface">Muscle Balance</h3>
             <p className="text-[10px] text-on-surface-variant uppercase font-bold tracking-widest text-center mt-1">Based on total reps</p>
          </div>
          
          <div className="w-full h-56 mt-2">
             <ResponsiveContainer width="100%" height="100%">
               <RadarChart cx="50%" cy="50%" outerRadius="60%" data={radarData}>
                 <PolarGrid stroke="#e0e3e5" />
                 <PolarAngleAxis dataKey="subject" tick={{ fill: '#49454f', fontSize: 11, fontWeight: 900 }} />
                 <PolarRadiusAxis angle={30} domain={[0, 'auto']} tick={false} axisLine={false} />
                 <Radar name="Reps" dataKey="reps" stroke="#10b981" fill="#10b981" fillOpacity={0.4} />
                 <Tooltip cursor={{fill: 'rgba(0,0,0,0.05)'}} contentStyle={{ borderRadius: '8px', fontSize: '12px', border: '1px solid #e0e3e5', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }} />
               </RadarChart>
             </ResponsiveContainer>
          </div>

          <div className="w-full mt-4 flex flex-col gap-4">
             {undertrainedWarning && (
               <div className="bg-error/10 border border-error/20 text-error px-4 py-3 rounded-lg text-xs font-bold text-center flex items-center justify-center gap-2">
                 <span className="material-symbols-outlined text-sm">warning</span>
                 {undertrainedWarning}
               </div>
             )}
          </div>
        </section>

        {/* Weekly Activity BarChart */}
        <section className="md:col-span-6 bg-surface-container-lowest rounded-xl p-8 shadow-sm border border-outline-variant/20 flex flex-col">
          <div className="mb-4">
            <h3 className="font-headline text-2xl font-black tracking-tighter uppercase text-on-surface">Last 7 Days</h3>
            <p className="text-on-surface-variant text-sm mt-1 font-bold">Total reps per calendar day</p>
          </div>
          <div className="w-full h-56 mt-4 flex-1">
             <ResponsiveContainer width="100%" height="100%">
               <BarChart data={last7DaysData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                 <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e0e3e5" />
                 <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold', fill: '#73777f' }} dy={10} />
                 <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold', fill: '#73777f' }} />
                 <Tooltip cursor={{fill: 'rgba(0,0,0,0.05)'}} contentStyle={{ borderRadius: '8px', fontSize: '12px', border: '1px solid #e0e3e5', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }} />
                 <Bar name="Total Reps" dataKey="reps" fill="#10b981" radius={[4, 4, 0, 0]} barSize={20} />
               </BarChart>
             </ResponsiveContainer>
          </div>
        </section>

        {/* Rest Efficiency */}
        <section className="md:col-span-5 bg-surface-container-lowest rounded-xl p-8 shadow-sm border border-outline-variant/20">
          <div className="flex justify-between items-start mb-6 text-on-surface">
            <div>
              <h3 className="font-headline text-xl font-bold tracking-tight uppercase">Rest Efficiency</h3>
              <p className="text-on-surface-variant text-[10px] font-bold uppercase tracking-widest mt-1">150s - 180s optimal</p>
            </div>
            <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-widest ${avgRest === null ? 'bg-surface-variant text-on-surface-variant' : restStatus === 'Optimal' ? 'bg-primary/20 text-primary' : 'bg-error/10 text-error'}`}>
               {restStatus}
            </span>
          </div>
          <div className="mt-8 relative pt-4 pb-2">
             <div className="h-4 w-full bg-surface-container-highest rounded-full overflow-hidden flex">
                <div className="h-full bg-primary/20" style={{width: '50%'}}></div> {/* 0-150s */}
                <div className="h-full bg-primary" style={{width: '10%'}}></div>    {/* 150-180s */}
                <div className="h-full bg-error/40" style={{width: '40%'}}></div>   {/* 180-300s */}
             </div>
             {avgRest !== null && (
               <div className="absolute top-0 w-1 h-8 bg-on-surface rounded transform -translate-x-1/2 transition-all" style={{left: `${gaugePercent}%`}}></div>
             )}
          </div>
          <div className="flex justify-between text-[10px] font-bold text-on-surface-variant mt-2">
            <span>0s</span>
            <span>150s</span>
            <span>180s</span>
            <span>300s+</span>
          </div>
          <p className="text-center font-black text-2xl tracking-tighter mt-4 text-on-surface">{avgRest !== null ? `${avgRest}s avg` : 'No data'}</p>
        </section>

        {/* Personal Bests */}
        <section className="md:col-span-12 bg-surface-container-lowest rounded-xl p-8 shadow-sm border border-outline-variant/20">
           <h3 className="font-headline text-2xl font-black tracking-tighter uppercase text-on-surface mb-8">Personal Bests</h3>
           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {pbs.map(pb => (
                 <div key={pb.name} className="bg-surface p-8 rounded-2xl border border-outline-variant/20 shadow-sm flex flex-col items-center justify-center text-center group hover:border-primary/30 transition-all hover:shadow-md h-full">
                    <p className="text-[11px] font-black uppercase tracking-[0.2em] text-on-surface-variant/60 mb-6">{pb.name}</p>
                    
                    {pb.hasData ? (
                       <>
                          <div className="flex items-baseline gap-1.5 mb-4">
                             <span className="text-5xl font-black text-primary tracking-tighter leading-none">
                                {pb.val}
                             </span>
                             <span className="text-sm font-black uppercase tracking-widest text-on-surface-variant/40">{pb.unit}</span>
                          </div>
                          <p className="text-[10px] font-bold text-on-surface-variant/30 uppercase tracking-widest mt-2">
                             Achieved {pb.achievedDate}
                          </p>
                       </>
                    ) : (
                       <div className="py-4">
                          <span className="text-[11px] font-black uppercase tracking-widest text-on-surface-variant/20">No data yet</span>
                       </div>
                    )}
                 </div>
              ))}
           </div>
        </section>

        {/* Skill Progression LineChart */}
        <section className="md:col-span-12 bg-surface-container-lowest rounded-xl p-8 shadow-sm border border-outline-variant/20">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="font-headline text-xl font-bold tracking-tight uppercase text-on-surface">Skill Progression</h3>
              <p className="text-on-surface-variant text-[10px] font-bold uppercase tracking-widest mt-1">Weekly hold metrics (s)</p>
            </div>
            <select value={skillChartEx} onChange={e => setSkillChartEx(e.target.value)} className="bg-surface border border-outline-variant/20 rounded-lg text-sm font-bold uppercase py-2 px-3 focus:ring-primary outline-none text-on-surface">
              {holdExercises.map(ex => <option key={ex} value={ex}>{ex}</option>)}
            </select>
          </div>
          
          {skillChartData.length === 0 ? (
            <p className="text-center text-sm font-bold text-on-surface-variant py-8">No data available for {skillChartEx}</p>
          ) : (
            <div className="w-full h-56 mt-4">
              <ResponsiveContainer width="100%" height="100%">
                 <LineChart data={skillChartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                   <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e0e3e5" />
                   <XAxis dataKey="week" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold', fill: '#73777f' }} dy={10} />
                   <YAxis label={{ value: 'Hold (sec)', angle: -90, position: 'insideLeft', offset: -5, style: { fontSize: '10px', fontWeight: 'bold', fill: '#73777f' } }} axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold', fill: '#73777f' }} />
                   <Tooltip cursor={{fill: 'rgba(0,0,0,0.05)'}} contentStyle={{ borderRadius: '8px', fontSize: '12px', border: '1px solid #e0e3e5', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }} />
                   <Line type="monotone" dataKey="bestHit" name="Best (sec)" stroke="#10b981" strokeWidth={3} dot={{ r: 4, strokeWidth: 2, fill: '#fff', stroke: '#10b981' }} activeDot={{ r: 6 }} />
                   <Line type="monotone" dataKey="average" name="Avg (sec)" stroke="#10b981" strokeWidth={2} strokeDasharray="4 4" dot={false} opacity={0.5} />
                 </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>
        


        {/* Diagnostics */}
        <section className="md:col-span-12 bg-surface-container-highest rounded-xl p-6 border border-outline-variant/20 font-mono text-[10px] text-on-surface-variant opacity-50 hover:opacity-100 transition-opacity mt-8">
          <h4 className="font-bold mb-2 text-on-surface uppercase tracking-widest">Developer Diagnostics</h4>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div>Parsed rows: {normalizedLogs.length}</div>
            <div>Valid dates: {normalizedLogs.filter(l => l.dateObj).length}</div>
            <div>Unique workout days: {allUniqueDays.length}</div>
            <div>This week's days: {uniqueDaysThisWeek}</div>
            <div>This month's days: {uniqueDaysThisMonth}</div>
            <div>28-d heatmap active: {heatmapData.filter(d => d && d.hasWorkout).length}</div>
            <div className="col-span-2">Buckets: C:{balance.Chest} B:{balance.Back} A:{balance.Arms} L:{balance.Legs} C:{balance.Core}</div>
          </div>
        </section>

      </div>
    </div>
  );
}
