import { useState, useMemo } from 'react';
import { useWorkoutLogs } from '../hooks/useWorkoutLogs';
import { normalizeLogs, getDateRanges } from '../utils/analytics';
import { EXERCISE_MAP, getExerciseMeta } from '../utils/exerciseMap';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import VolumeChart from '../components/VolumeChart';

export default function Dashboard() {
  const { 
    logs = [], 
    localLogs = [],
    loading, 
    migrateToCloud, 
    bodyweight = 72,
    user,
    downloadBackup
  } = useWorkoutLogs();

  const startOfWeek = () => {
    const d = new Date();
    const day = d.getDay() || 7;
    d.setDate(d.getDate() - day + 1);
    d.setHours(0, 0, 0, 0);
    return d;
  };

  const startOfMonth = () => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  };

  const [migrationStatus, setMigrationStatus] = useState(null);
  const [dateFilter, setDateFilter] = useState('This Month');
  const [typeFilter, setTypeFilter] = useState('All');

  const displayName = user?.user_metadata?.full_name 
    || user?.user_metadata?.name 
    || null;

  const welcomeText = displayName ? `Welcome, ${displayName}` : "Welcome back";
  
  // Normalization - ensure we have an array
  const normalizedLogs = useMemo(() => normalizeLogs(logs || []), [logs]);
  
  const holdExercises = useMemo(() => Object.keys(EXERCISE_MAP).filter(ex => EXERCISE_MAP[ex].isHold), []);
  const [skillChartEx, setSkillChartEx] = useState(holdExercises[0] || 'Front Lever');
  const [catChartFilter, setCatChartFilter] = useState('Pull');

  const { currentWeekStart, currentMonthKey, lastWeekStart } = getDateRanges();
  
  // Filtering Logic
  const activeLogs = useMemo(() => {
    return normalizedLogs.filter(log => {
      if (dateFilter === 'This Week' && log.weekStart !== currentWeekStart) return false;
      if (dateFilter === 'This Month' && log.monthKey !== currentMonthKey) return false;
      if (typeFilter !== 'All' && log.type.toLowerCase() !== typeFilter.toLowerCase()) return false;
      return true;
    });
  }, [normalizedLogs, dateFilter, typeFilter, currentWeekStart, currentMonthKey]);

  // Overview Stats
  const ovThisWeekLogs = useMemo(() => normalizedLogs.filter(l => l.weekStart === currentWeekStart), [normalizedLogs, currentWeekStart]);
  const ovLastWeekLogs = useMemo(() => normalizedLogs.filter(l => l.weekStart === lastWeekStart), [normalizedLogs, lastWeekStart]);
  
  const ovThisWeekDays = new Set(ovThisWeekLogs.map(l => l.dayKey)).size;
  const ovLastWeekDays = new Set(ovLastWeekLogs.map(l => l.dayKey)).size;
  
  const ovThisWeekReps = ovThisWeekLogs.filter(l => l.isRepBased).reduce((sum, l) => sum + (l.reps || 0), 0);
  const ovLastWeekReps = ovLastWeekLogs.filter(l => l.isRepBased).reduce((sum, l) => sum + (l.reps || 0), 0);
  
  // Use bodyweight from hook for workload
  const ovThisWeekLoad = ovThisWeekLogs.filter(l => l.isRepBased).reduce((sum, l) => sum + ((bodyweight + (l.weight || 0)) * (l.reps || 0)), 0);
  const ovLastWeekLoad = ovLastWeekLogs.filter(l => l.isRepBased).reduce((sum, l) => sum + ((bodyweight + (l.weight || 0)) * (l.reps || 0)), 0);

  // Consistency & Streak
  const allUniqueDays = useMemo(() => [...new Set(normalizedLogs.map(l => l.dayKey))].sort((a,b) => b.localeCompare(a)), [normalizedLogs]);
  
  const getDaysAgoStr = (days) => {
    const d = new Date();
    d.setDate(d.getDate() - days);
    return d.toISOString().split('T')[0];
  };

  const currentStreak = useMemo(() => {
    if (!logs || logs.length === 0) return 0;
    
    // Step 1: get all unique training dates, sorted newest first
    const uniqueDates = [...new Set(logs.map(l => l.date))]
      .sort((a, b) => new Date(b) - new Date(a));

    if (uniqueDates.length === 0) return 0;

    // Step 2: get today's date at midnight, no time component
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Step 3: get the most recent training date at midnight
    const mostRecentStr = uniqueDates[0];
    const mostRecent = new Date(mostRecentStr + 'T12:00:00'); // Midday to safety check local date
    mostRecent.setHours(0, 0, 0, 0);

    // Step 4: how many days ago was the last workout?
    const daysSinceLast = Math.round((today - mostRecent) / (1000 * 60 * 60 * 24));

    // Step 5: if last workout was 2+ days ago, streak is broken — return 0 immediately
    if (daysSinceLast > 1) return 0;

    // Step 6: count consecutive days backwards from most recent
    let streak = 1;
    for (let i = 1; i < uniqueDates.length; i++) {
      const prev = new Date(uniqueDates[i - 1] + 'T12:00:00');
      const curr = new Date(uniqueDates[i] + 'T12:00:00');
      prev.setHours(0, 0, 0, 0);
      curr.setHours(0, 0, 0, 0);

      const diff = Math.round((prev - curr) / (1000 * 60 * 60 * 24));

      if (diff === 1) {
        // Consecutive day — extend streak
        streak++;
      } else {
        // Gap found — stop counting
        break;
      }
    }

    return streak;
  }, [logs]);

  const heatmapData = useMemo(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = d.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay();
    const offset = firstDay === 0 ? 6 : firstDay - 1;
    const data = [];
    for(let i=0; i<offset; i++) data.push(null);
    for(let i=1; i<=daysInMonth; i++) {
        const dStr = `${year}-${String(month+1).padStart(2,'0')}-${String(i).padStart(2,'0')}`;
        data.push({ date: dStr, label: i, hasWorkout: allUniqueDays.includes(dStr) });
    }
    return data;
  }, [allUniqueDays]);

  // Muscle Balance Radar
  const radarData = useMemo(() => {
    const RADAR_AXES = ['Push', 'Pull', 'Legs', 'Core'];
    const sm = startOfMonth();
    const monthLogs = logs.filter(l => new Date(l.date) >= sm);

    const data = RADAR_AXES.map(axis => {
      const matchingLogs = monthLogs.filter(l => l.category === axis);
      const uniqueDays = new Set(matchingLogs.map(l => l.date)).size;
      return { axis, value: uniqueDays };
    });

    const maxValue = Math.max(...data.map(d => d.value), 1);
    return data.map(d => ({
      subject: d.axis,
      normalized: Math.round((d.value / maxValue) * 100),
      full: 100,
      rawValue: d.value
    }));
  }, [logs]);

  // Personal Bests
  const pbs = useMemo(() => {
    return ['Muscle-up', 'Front Lever', 'Handstand', 'L-sit'].map(name => {
      const exLogs = normalizedLogs.filter(l => (getExerciseMeta(l.exercise).pbTarget || l.exercise).toLowerCase() === name.toLowerCase());
      if(!exLogs.length) return { name, val: 0, hasData: false, unit: EXERCISE_MAP[name]?.isHold ? 's' : 'reps' };
      const max = Math.max(...exLogs.map(l => EXERCISE_MAP[l.exercise]?.isHold ? (l.hold_seconds || 0) : (l.reps || 0)));
      return { name, val: max > 0 ? max : 0, hasData: max > 0, unit: EXERCISE_MAP[name]?.isHold ? 's' : 'reps' };
    });
  }, [normalizedLogs]);

  // Skill Progression
  const skillChartData = useMemo(() => {
    const rawSkillLogs = normalizedLogs.filter(l => l.exercise === skillChartEx && l.isHold);
    const weeklyObj = {};
    rawSkillLogs.forEach(l => {
      if (!weeklyObj[l.weekStart]) weeklyObj[l.weekStart] = { best: 0, sum: 0, count: 0 };
      weeklyObj[l.weekStart].best = Math.max(weeklyObj[l.weekStart].best, l.hold_seconds || 0);
      weeklyObj[l.weekStart].sum += (l.hold_seconds || 0);
      weeklyObj[l.weekStart].count++;
    });
    return Object.keys(weeklyObj).sort().slice(-4).map(w => ({
      week: w.split('-').slice(1).join('/'),
      best: weeklyObj[w].best,
      avg: Math.round(weeklyObj[w].sum / weeklyObj[w].count) || 0
    }));
  }, [normalizedLogs, skillChartEx]);

  // Rest Efficiency
  const restData = useMemo(() => {
    const loggedRest = activeLogs.filter(l => (l.restSeconds || 0) > 0);
    const avg = loggedRest.length ? Math.round(loggedRest.reduce((a,b) => a + (b.restSeconds || 0), 0) / loggedRest.length) : 0;
    return { avg, status: avg > 180 ? 'High' : avg > 140 ? 'Optimal' : 'Low' };
  }, [activeLogs]);
  const categoriesList = ['Push', 'Pull', 'Legs', 'Core'];

  const thisWeekFreq = useMemo(() => {
    const sw = startOfWeek();
    const weekLogs = logs.filter(l => new Date(l.date) >= sw);
    return categoriesList.reduce((acc, cat) => {
      acc[cat] = new Set(weekLogs.filter(l => l.category === cat).map(l => l.date)).size;
      return acc;
    }, {});
  }, [logs]);

  const thisMonthFreq = useMemo(() => {
    const sm = startOfMonth();
    const monthLogs = logs.filter(l => new Date(l.date) >= sm);
    return categoriesList.reduce((acc, cat) => {
      acc[cat] = new Set(monthLogs.filter(l => l.category === cat).map(l => l.date)).size;
      return acc;
    }, {});
  }, [logs]);

  // 8. Last workout summary
  const lastWorkoutDetails = useMemo(() => {
    if (!logs.length) return null;
    const sorted = [...logs].sort((a, b) => new Date(b.date) - new Date(a.date));
    const lastSessionDate = sorted[0]?.date;
    const sessionLogs = logs.filter(l => l.date === lastSessionDate);
    const lastCategory = sorted[0]?.category || '—';
    
    // Format date as "27 March"
    let formattedDate = lastSessionDate;
    try {
      const d = new Date(lastSessionDate + 'T12:00:00');
      formattedDate = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' });
    } catch(e) {}

    return {
      date: formattedDate,
      category: lastCategory,
      sets: sessionLogs.length
    };
  }, [logs]);


  return (
    <div className="space-y-8 pb-20 animate-in fade-in duration-500">
      {/* Overview Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-surface-container-lowest p-6 rounded-2xl shadow-sm border border-outline-variant/10 gap-4">
        <div>
          <h2 style={{ fontSize: '28px', fontWeight: 700 }} className="font-headline tracking-tighter text-on-surface">{welcomeText}</h2>
          <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', fontWeight: 400, opacity: 0.6 }}>
            {logs.length} sessions logged
          </p>
        </div>
        <div className="flex gap-2">
            <select value={dateFilter} onChange={e => setDateFilter(e.target.value)} className="bg-surface border border-outline-variant/10 rounded-xl text-xs font-black uppercase py-2.5 pl-4 pr-10 outline-none focus:ring-2 focus:ring-primary/20">
              <option>This Week</option>
              <option>This Month</option>
              <option>All Time</option>
            </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Quick Review Cards */}
        <section className="md:col-span-12 grid grid-cols-1 sm:grid-cols-3 gap-6">
          {[
            { label: 'Workout days', val: ovThisWeekDays, last: ovLastWeekDays },
            { label: 'Total reps', val: ovThisWeekReps, last: ovLastWeekReps },
            { label: 'Workload (kg)', val: Math.round(ovThisWeekLoad).toLocaleString(), last: Math.round(ovLastWeekLoad).toLocaleString(), isNum: true }
          ].map((s, i) => {
            const current = typeof s.val === 'string' ? parseFloat(s.val.replace(/,/g, '')) : s.val;
            const previous = typeof s.last === 'string' ? parseFloat(s.last.replace(/,/g, '')) : s.last;
            const trendArrow = current > previous ? '↑' : current < previous ? '↓' : '→';
            const trendColor = current > previous ? 'text-[#1D9E75]' : current < previous ? 'text-[#E24B4A]' : 'text-on-surface-variant/40';

            return (
              <div key={i} className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant/10 shadow-sm flex flex-col justify-between h-40 hover:border-outline-variant/30 transition-colors">
                  <div>
                    <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginBottom: '4px', opacity: 0.6 }}>
                      {s.label}
                    </p>
                    <p style={{ fontSize: '28px', fontWeight: '600', margin: '0' }} className="text-on-surface">
                      {s.val}
                    </p>
                  </div>
                  <p style={{ fontSize: '12px', marginTop: '4px' }} className={trendColor}>
                    {trendArrow} {s.last} last week
                  </p>
              </div>
            );
          })}
        </section>

        {/* 1. Volume Chart */}
        <section className="md:col-span-12">
            <VolumeChart logs={logs} />
        </section>

        {/* 2. Consistency */}
        <section className="md:col-span-12 bg-surface-container-lowest p-8 rounded-2xl border border-outline-variant/10 shadow-sm">
           <div className="flex justify-between items-center mb-8">
              <h3 style={{ fontSize: '22px', fontWeight: 700, fontFamily: 'inherit' }} className="font-headline tracking-tighter">Consistency</h3>
              <div className="px-3 py-1 border border-[#1D9E75]/30 rounded-full text-[12px] font-medium text-[#1D9E75] bg-transparent">{currentStreak} day streak</div>
           </div>
           
           <div className="max-w-sm mx-auto mb-10">
              {/* Day Labels */}
              <div className="grid grid-cols-7 gap-1.5 mb-2">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
                  <div key={d} style={{ textAlign: 'center', fontSize: '11px', color: 'var(--color-text-secondary)', fontWeight: 500, opacity: 0.6 }}>
                    {d}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1.5">
                {heatmapData.map((d, i) => d ? (
                  <div key={i} title={d.date} className={`aspect-square rounded-lg flex items-center justify-center text-[11px] font-black transition-all ${d.hasWorkout ? 'bg-primary text-on-primary scale-105 shadow-md shadow-primary/10' : 'bg-surface-container-high text-on-surface-variant/20'}`}>{d.label}</div>
                ) : <div key={i} className="aspect-square" />)}
              </div>
           </div>

           <div className="space-y-4 pt-6 border-t border-outline-variant/5">
              <style>{`
                .freq-row {
                  display: flex;
                  flex-direction: column;
                  gap: 6px;
                  margin-bottom: 12px;
                }
                .freq-label {
                  font-size: 12px;
                  color: var(--color-text-secondary);
                  font-weight: 500;
                  white-space: nowrap;
                }
                .freq-badges {
                  display: flex;
                  gap: 6px;
                  flex-wrap: nowrap;
                }
                .freq-badge {
                  flex: 1;
                  text-align: center;
                  padding: 5px 0;
                  border-radius: 20px;
                  font-size: 12px;
                  font-weight: 600;
                  border: 1px solid var(--color-border-secondary, #e0e3e5);
                  white-space: nowrap;
                }
                .freq-badge.active {
                  background: #1D9E75;
                  color: #ffffff;
                  border-color: #1D9E75;
                }
                .freq-badge.inactive {
                  background: transparent;
                  color: var(--color-text-secondary, #73777f);
                  opacity: 0.4;
                }
              `}</style>

              {/* Category frequency */}
              <div className="freq-row">
                <span className="freq-label">This week</span>
                <div className="freq-badges">
                  {categoriesList.map(cat => (
                    <div
                      key={cat}
                      className={`freq-badge ${thisWeekFreq[cat] > 0 ? 'active' : 'inactive'}`}
                    >
                      {cat} {thisWeekFreq[cat]}
                    </div>
                  ))}
                </div>
              </div>

              <div className="freq-row">
                <span className="freq-label">This month</span>
                <div className="freq-badges">
                  {categoriesList.map(cat => (
                    <div
                      key={cat}
                      className={`freq-badge ${thisMonthFreq[cat] > 0 ? 'active' : 'inactive'}`}
                    >
                      {cat} {thisMonthFreq[cat]}
                    </div>
                  ))}
                </div>
              </div>

              {/* Last workout */}
              {lastWorkoutDetails && (
                <>
                  <style>{`
                    .last-workout-row {
                      display: flex;
                      flex-direction: column;
                      gap: 6px;
                      margin-top: 4px;
                    }
                    .last-workout-label {
                      font-size: 12px;
                      color: var(--color-text-secondary);
                      font-weight: 500;
                    }
                    .last-workout-value {
                      font-size: 13px;
                      color: var(--color-text-primary, #191c1e);
                      font-weight: 600;
                    }
                  `}</style>
                  <div className="last-workout-row">
                    <span className="last-workout-label">Last workout</span>
                    <span className="last-workout-value">
                      {lastWorkoutDetails.date} · {lastWorkoutDetails.category} · {lastWorkoutDetails.sets} sets
                    </span>
                  </div>
                </>
              )}
           </div>
        </section>

        {/* 3. Muscle Balance Radar */}
        <section className="md:col-span-12 bg-surface-container-lowest p-8 rounded-2xl border border-outline-variant/10 shadow-sm flex flex-col items-center">
            <h3 style={{ fontSize: '22px', fontWeight: 700 }} className="font-headline tracking-tighter w-full text-left mb-6">Muscle balance</h3>
            <div className="w-full h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius={100} data={radarData}>
                        <PolarGrid stroke="#e0e3e5" />
                        <PolarAngleAxis dataKey="subject" tick={{ fill: '#73777f', fontSize: 11, fontWeight: 600 }} />
                        <Tooltip 
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const data = payload[0].payload;
                              return (
                                <div className="bg-white p-3 rounded-xl border border-outline-variant/20 shadow-xl text-xs font-bold text-on-surface">
                                  {data.subject} — {data.rawValue} days this month
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Radar name="Training Balance" dataKey="normalized" stroke="#10b981" fill="#10b981" fillOpacity={0.6} />
                    </RadarChart>
                </ResponsiveContainer>
            </div>
        </section>

        {/* 4. Skill Progression */}
        <section className="md:col-span-12 bg-surface-container-lowest p-8 rounded-2xl border border-outline-variant/10 shadow-sm">
            <div className="flex justify-between items-center mb-8">
                <h3 style={{ fontSize: '22px', fontWeight: 700 }} className="font-headline tracking-tighter">Skills</h3>
                <select value={skillChartEx} onChange={e => setSkillChartEx(e.target.value)} className="bg-surface border border-outline-variant/10 rounded-xl text-[10px] font-black uppercase px-4 py-2 outline-none focus:ring-2 focus:ring-primary/20">
                    {holdExercises.map(ex => <option key={ex}>{ex}</option>)}
                </select>
            </div>
            <div className="h-64 w-full">
                {skillChartData.length === 0 ? (
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '160px',
                    color: 'var(--color-text-secondary)',
                    fontSize: '13px',
                    textAlign: 'center',
                    gap: '8px'
                  }}>
                    <span style={{ fontSize: '24px' }}>—</span>
                    <p style={{ margin: 0 }}>No skill holds logged yet</p>
                    <p style={{ margin: 0, fontSize: '11px' }}>Log an L-sit, planche, or handstand hold to see your progress here</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={skillChartData}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e0e3e5" />
                          <XAxis dataKey="week" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 900, fill: '#73777f' }} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 900, fill: '#73777f' }} />
                          <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                          <Line type="stepAfter" dataKey="best" name="Weekly Best" stroke="#10b981" strokeWidth={5} dot={{ r: 6, fill: '#10b981' }} />
                          <Line type="monotone" dataKey="avg" name="Weekly Avg" stroke="#73777f" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                      </LineChart>
                  </ResponsiveContainer>
                )}
            </div>
        </section>

        {/* 5. Personal Bests Grid */}
        <section className="md:col-span-7 bg-surface-container-lowest p-8 rounded-2xl border border-outline-variant/10 shadow-sm">
            <h3 style={{ fontSize: '22px', fontWeight: 700 }} className="font-headline tracking-tighter mb-8">Personal bests</h3>
            <div className="grid grid-cols-2 gap-4">
                {pbs.map(pb => (
                    <div key={pb.name} className={`p-6 rounded-3xl border transition-all ${pb.hasData ? 'bg-primary/5 border-primary/10' : 'bg-surface border-outline-variant/5 opacity-50'}`}>
                        <p className="text-[10px] font-black uppercase text-on-surface-variant/40 mb-4 tracking-widest">{pb.name}</p>
                        <div className="flex items-baseline gap-1.5">
                            <span className="text-4xl font-black text-primary tracking-tighter">{pb.val || 0}</span>
                            <span className="text-[10px] font-black uppercase text-on-surface-variant/20 tracking-widest">{pb.unit}</span>
                        </div>
                    </div>
                ))}
            </div>
        </section>

        {/* 6. Rest Efficiency Gauge */}
        <section className="md:col-span-5 bg-surface-container-lowest p-8 rounded-2xl border border-outline-variant/10 shadow-sm flex flex-col justify-between">
            <div>
                <h3 style={{ fontSize: '22px', fontWeight: 700 }} className="font-headline tracking-tighter mb-1">Rest</h3>
                <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest opacity-40">Average set recovery</p>
            </div>
            <div className="py-10 text-center">
                <p className="text-6xl font-black text-on-surface tracking-tighter leading-none">{restData.avg || 0}s</p>
                <div className={`mt-6 inline-block px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${restData.status === 'Optimal' ? 'bg-green-500 text-white' : 'bg-orange-500 text-white'}`}>
                    {restData.status} Efficiency
                </div>
            </div>
            <p className="text-[9px] font-bold text-center text-on-surface-variant/30 uppercase px-4 leading-relaxed">
              Target rest between 120s and 180s for maximum strength gains during rep training.
            </p>
        </section>

      </div>

      {/* Settings Footer */}
      <footer className="pt-20 space-y-8">
        <div className="h-px bg-outline-variant/10 w-full" />
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-surface-container-low p-8 rounded-3xl border border-outline-variant/10 shadow-sm flex flex-col justify-between">
                <div>
                   <h4 style={{ fontSize: '22px', fontWeight: 700 }} className="font-headline tracking-tighter mb-1">Identity</h4>
                   <p style={{ fontSize: '13px', fontWeight: 400, opacity: 0.7 }} className="text-on-surface-variant">Connected as: <span className="font-normal">{user?.email}</span></p>
                </div>
                <div style={{ fontSize: '13px', fontWeight: 400, opacity: 0.6 }} className="mt-8 text-on-surface-variant leading-relaxed tracking-tight">
                    Your training data is synced to your account.
                </div>
            </div>

            <div className="bg-surface-container-low p-8 rounded-3xl border border-outline-variant/10 shadow-sm flex flex-col justify-between">
                <div>
                   <h4 style={{ fontSize: '22px', fontWeight: 700 }} className="font-headline tracking-tighter mb-1">Data library</h4>
                   <p className="text-on-surface-variant text-[10px] font-bold uppercase tracking-widest opacity-40">Download your full history</p>
                </div>
                <button onClick={downloadBackup} disabled={logs.length === 0} className="mt-8 w-full bg-surface border border-outline-variant/20 py-4 rounded-2xl text-xs font-black uppercase flex items-center justify-center gap-3 hover:bg-surface-container-high transition-all disabled:opacity-30">
                    <span className="material-symbols-outlined">download</span>
                    Export Backup (.csv)
                </button>
            </div>
        </div>

        {/* Cloud Migration */}
        {localLogs.length > 0 && !migrationStatus && (
          <div className="bg-primary/5 border-2 border-dashed border-primary/20 p-10 rounded-3xl flex flex-col md:flex-row justify-between items-center gap-8 animate-pulse text-center md:text-left">
             <div className="max-w-md">
               <h4 style={{ fontSize: '22px', fontWeight: 700 }} className="font-headline tracking-tighter text-primary">Found offline data</h4>
               <p className="text-on-surface-variant/60 text-xs font-bold leading-relaxed mt-2 tracking-wide">You have {localLogs.length} workouts stored in this browser that haven't been secured to your account. Sync them to the cloud now.</p>
             </div>
             <button onClick={async () => { const res = await migrateToCloud(); setMigrationStatus(res); }} className="bg-primary hover:bg-primary-container text-on-primary px-10 py-5 rounded-3xl text-sm font-black uppercase tracking-widest shadow-2xl shadow-primary/20 transition-all hover:scale-[1.05] whitespace-nowrap">Sync to Cloud</button>
          </div>
        )}

        {migrationStatus?.success && (
          <div className="bg-primary p-8 rounded-3xl text-on-primary text-sm font-black text-center shadow-xl shadow-primary/20">
             ⚡️ SUCCESSFULLY CONFIGURED {migrationStatus.count} WORKOUTS
          </div>
        )}
      </footer>
    </div>
  );
}
