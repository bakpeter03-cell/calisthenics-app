import { useState, useMemo, useEffect } from 'react';
import { useWorkoutLogs } from '../hooks/useWorkoutLogs';
import { normalizeLogs, getDateRanges } from '../utils/analytics';
import { EXERCISE_MAP, getExerciseMeta } from '../utils/exerciseMap';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine } from 'recharts';
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

  // Month Switcher State
  const todayDate = new Date();
  const [calendarYear, setCalendarYear] = useState(todayDate.getFullYear());
  const [calendarMonth, setCalendarMonth] = useState(todayDate.getMonth()); // 0-indexed
  const isCurrentMonth = calendarYear === todayDate.getFullYear() && calendarMonth === todayDate.getMonth();

  const [selectedDay, setSelectedDay] = useState(null); // date string YYYY-MM-DD or null

  // Clear selection on month change
  useEffect(() => {
    setSelectedDay(null);
  }, [calendarMonth, calendarYear]);

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
  const allUniqueDays = useMemo(() => [...new Set(normalizedLogs.map(l => l.dayKey))].sort((a, b) => b.localeCompare(a)), [normalizedLogs]);

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
    const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();
    const firstDay = new Date(calendarYear, calendarMonth, 1).getDay();
    const offset = firstDay === 0 ? 6 : firstDay - 1; // Mon=0, Sun=6
    const data = [];
    for (let i = 0; i < offset; i++) data.push(null);
    for (let i = 1; i <= daysInMonth; i++) {
      const dStr = `${calendarYear}-${String(calendarMonth + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      data.push({ date: dStr, label: i, hasWorkout: allUniqueDays.includes(dStr) });
    }
    return data;
  }, [allUniqueDays, calendarYear, calendarMonth]);

  // Muscle Balance Radar
  const radarData = useMemo(() => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    thirtyDaysAgo.setHours(0, 0, 0, 0);

    const last30Logs = logs.filter(l => {
      const parts = (l.date || '').split('-');
      if (parts.length < 3) return false;
      const date = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      return date >= thirtyDaysAgo;
    });

    const categories = ['Push', 'Pull', 'Legs', 'Core'];
    const data = categories.map(cat => {
      const catLogs = last30Logs.filter(l => l.category === cat);
      const uniqueDays = new Set(catLogs.map(l => l.date)).size;
      return { axis: cat, value: uniqueDays, days: uniqueDays };
    });

    const maxValue = Math.max(...data.map(d => d.value), 1);
    return data.map(d => ({
      ...d,
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
      if (!exLogs.length) return { name, val: 0, hasData: false, unit: EXERCISE_MAP[name]?.isHold ? 's' : 'reps' };
      const max = Math.max(...exLogs.map(l => EXERCISE_MAP[l.exercise]?.isHold ? (l.hold_seconds || 0) : (l.reps || 0)));
      return { name, val: max > 0 ? max : 0, hasData: max > 0, unit: EXERCISE_MAP[name]?.isHold ? 's' : 'reps' };
    });
  }, [normalizedLogs]);

  // Skill Progression
  const { skillChartData, allTimeBest, maxSession } = useMemo(() => {
    const skillLogs = logs.filter(l => l.exercise === skillChartEx && (l.hold_seconds || 0) > 0);
    const best = skillLogs.reduce((max, l) => Math.max(max, l.hold_seconds || 0), 0);
    const sessionData = skillLogs
      .reduce((acc, l) => {
        const existing = acc.find(s => s.date === l.date);
        if (existing) {
          existing.best = Math.max(existing.best, l.hold_seconds || 0);
        } else {
          acc.push({ date: l.date, best: l.hold_seconds || 0 });
        }
        return acc;
      }, [])
      .sort((a, b) => a.date.localeCompare(b.date))
      .map(s => {
        const parts = s.date.split('-').map(Number);
        return {
          ...s,
          label: new Date(parts[0], parts[1] - 1, parts[2]).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
        };
      });
    const max = sessionData.reduce((m, s) => s.best > (m?.best ?? 0) ? s : m, null);
    return { skillChartData: sessionData, allTimeBest: best, maxSession: max };
  }, [logs, skillChartEx]);

  // Rest Efficiency
  const restData = useMemo(() => {
    const loggedRest = activeLogs.filter(l => (l.restSeconds || 0) > 0);
    const avg = loggedRest.length ? Math.round(loggedRest.reduce((a, b) => a + (b.restSeconds || 0), 0) / loggedRest.length) : 0;
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

  const monthlyWorkouts = useMemo(() => {
    const monthLogs = logs.filter(l => {
      const parts = (l.date || '').split('-');
      if (parts.length < 2) return false;
      const y = parseInt(parts[0]);
      const m = parseInt(parts[1]);
      return y === calendarYear && m === (calendarMonth + 1);
    });
    return categoriesList.reduce((acc, cat) => {
      acc[cat] = new Set(monthLogs.filter(l => l.category === cat).map(l => l.date)).size;
      return acc;
    }, {});
  }, [logs, calendarYear, calendarMonth]);

  // 8. Last workout summary
  const lastWorkoutDetails = useMemo(() => {
    if (!logs || logs.length === 0) return null;
    const sorted = [...logs].sort((a, b) => new Date(b.date) - new Date(a.date));
    const lastSessionDate = sorted[0]?.date;
    const sessionLogs = logs.filter(l => l.date === lastSessionDate);
    const lastCategory = sorted[0]?.category || '—';

    // Format date as "27 March"
    let formattedDate = lastSessionDate;
    try {
      const dateObj = new Date(lastSessionDate + 'T12:00:00');
      formattedDate = dateObj.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' });
    } catch (e) { }

    return {
      date: formattedDate,
      category: lastCategory,
      sets: sessionLogs.length,
      reps: sessionLogs.reduce((sum, l) => sum + (l.reps || 0), 0)
    };
  }, [logs]);


  return (
    <div className="space-y-8 pb-20 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Insight Cards */}
        <section className="md:col-span-12">
          {(() => {
            // --- Card 1: Last session ---
            const lastLog = [...logs].sort((a, b) => b.date.localeCompare(a.date))[0];
            const lastDate = lastLog?.date;
            const lastCategory = lastLog?.category ?? '—';

            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const last = lastDate ? new Date(...lastDate.split('-').map((v, i) => i === 1 ? Number(v) - 1 : Number(v))) : null;
            const daysAgo = last ? Math.round((today - last) / (1000 * 60 * 60 * 24)) : null;

            const daysAgoText = daysAgo === 0 ? 'Today'
              : daysAgo === 1 ? 'Yesterday'
                : daysAgo === null ? 'Never'
                  : `${daysAgo} days ago`;

            const daysAgoColor = 'var(--color-text-primary)';

            // --- Card 2: Neglected category ---
            const categories = ['Push', 'Pull', 'Legs', 'Core'];

            const lastPerCategory = categories.map(cat => {
              const catLogs = logs.filter(l => l.category === cat);
              if (catLogs.length === 0) return { cat, daysAgo: 999 };
              const catLastDate = catLogs.reduce((latest, l) => l.date > latest ? l.date : latest, '1970-01-01');
              const catLast = new Date(...catLastDate.split('-').map((v, i) => i === 1 ? Number(v) - 1 : Number(v)));
              const days = Math.round((today - catLast) / (1000 * 60 * 60 * 24));
              return { cat, daysAgo: days };
            });

            const neglected = lastPerCategory.sort((a, b) => b.daysAgo - a.daysAgo)[0];
            const neglectedColor = 'var(--color-text-primary)';

            // --- Card 3: Days trained this week ---
            const startOfWeek = new Date(today);
            const dayOfWeek = startOfWeek.getDay() || 7;
            startOfWeek.setDate(startOfWeek.getDate() - dayOfWeek + 1);
            startOfWeek.setHours(0, 0, 0, 0);

            const thisWeekLogs = logs.filter(l => {
              const d = new Date(...l.date.split('-').map((v, i) => i === 1 ? Number(v) - 1 : Number(v)));
              return d >= startOfWeek;
            });

            const daysTrainedThisWeek = new Set(thisWeekLogs.map(l => l.date)).size;

            return (
              <>
                <style>{`
                  @media (max-width: 480px) {
                    .insight-card {
                      padding: 10px 10px !important;
                      min-height: 100px !important;
                      border-radius: 12px !important;
                    }
                    .insight-label {
                      font-size: 10px !important;
                      white-space: nowrap;
                    }
                    .insight-value {
                      font-size: 18px !important;
                      line-height: 1.2;
                    }
                    .insight-subtitle {
                      font-size: 10px !important;
                    }
                  }
                `}</style>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '8px',
                }}>
                  {/* Card 1 — Last session */}
                  <div className="insight-card" style={{
                    background: '#ffffff',
                    border: '1px solid rgba(0, 0, 0, 0.08)',
                    borderRadius: '16px',
                    padding: '14px 16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    minHeight: '90px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                  }}>
                    <span className="insight-label" style={{ fontSize: '10px', fontWeight: 700, color: 'var(--color-text-secondary)' }}>
                      Last session
                    </span>
                    <span className="insight-value" style={{ fontSize: '20px', fontWeight: 700, color: daysAgoColor }}>
                      {daysAgoText}
                    </span>
                    <span className="insight-subtitle" style={{ fontSize: '10px', color: 'var(--color-text-secondary)', fontWeight: 500 }}>
                      {lastCategory}
                    </span>
                  </div>

                  {/* Card 2 — Category gap */}
                  <div className="insight-card" style={{
                    background: '#ffffff',
                    border: '1px solid rgba(0, 0, 0, 0.08)',
                    borderRadius: '16px',
                    padding: '14px 16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    minHeight: '90px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                  }}>
                    <span className="insight-label" style={{ fontSize: '10px', fontWeight: 700, color: 'var(--color-text-secondary)' }}>
                      Pay attention

                    </span>
                    <span className="insight-value" style={{ fontSize: '20px', fontWeight: 700, color: neglectedColor }}>
                      {neglected.cat}
                    </span>
                    <span className="insight-subtitle" style={{ fontSize: '10px', color: 'var(--color-text-secondary)', fontWeight: 500 }}>
                      {neglected.daysAgo === 999 ? 'Never trained' : `${neglected.daysAgo} days ago`}
                    </span>
                  </div>

                  {/* Card 3 — Days trained this week */}
                  <div className="insight-card" style={{
                    background: '#ffffff',
                    border: '1px solid rgba(0, 0, 0, 0.08)',
                    borderRadius: '16px',
                    padding: '14px 16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    minHeight: '90px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                  }}>
                    <span className="insight-label" style={{ fontSize: '10px', fontWeight: 700, color: 'var(--color-text-secondary)' }}>
                      This week
                    </span>
                    <span className="insight-value" style={{ fontSize: '20px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                      {daysTrainedThisWeek} {daysTrainedThisWeek === 1 ? 'day' : 'days'}
                    </span>
                    <span className="insight-subtitle" style={{ fontSize: '10px', color: 'var(--color-text-secondary)', fontWeight: 500 }}>
                      trained
                    </span>
                  </div>
                </div>
              </>
            );
          })()}
        </section>

        {/* 1. Volume Chart */}
        <section className="md:col-span-12">
          <VolumeChart logs={logs} />
        </section>

        {/* 2. Consistency */}
        <section className="md:col-span-12 bg-surface-container-lowest p-8 rounded-2xl border border-outline-variant/10 shadow-sm">
          <div style={{ marginBottom: '16px' }}>
            {/* Row 1: Title + navigation */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <h2 style={{ fontSize: '22px', fontWeight: 700, margin: 0 }}>Consistency</h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                <button
                  onClick={() => {
                    if (calendarMonth === 0) { setCalendarMonth(11); setCalendarYear(y => y - 1); }
                    else setCalendarMonth(m => m - 1);
                  }}
                  style={{ background: 'none', border: '1px solid rgba(0,0,0,0.15)', borderRadius: '8px', width: '28px', height: '28px', cursor: 'pointer', fontSize: '14px', color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                >‹</button>
                <span style={{ fontSize: '13px', fontWeight: 600, whiteSpace: 'nowrap', color: 'var(--color-text-primary)' }}>
                  {new Date(calendarYear, calendarMonth).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}
                </span>
                <button
                  onClick={() => {
                    if (calendarMonth === 11) { setCalendarMonth(0); setCalendarYear(y => y + 1); }
                    else setCalendarMonth(m => m + 1);
                  }}
                  disabled={isCurrentMonth}
                  style={{ background: 'none', border: '1px solid rgba(0,0,0,0.15)', borderRadius: '8px', width: '28px', height: '28px', cursor: isCurrentMonth ? 'default' : 'pointer', fontSize: '14px', color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, opacity: isCurrentMonth ? 0.3 : 1 }}
                >›</button>
              </div>
            </div>

            {/* Row 2: Streak badge */}
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{ display: 'inline-flex', whiteSpace: 'nowrap', color: '#016c48', border: '1px solid #016c48', background: 'rgba(1,108,72,0.08)', borderRadius: '9999px', padding: '4px 12px', fontSize: '12px', fontWeight: 500, marginRight: '8px' }}>
                {currentStreak} day{currentStreak !== 1 ? 's' : ''} streak
              </div>
            </div>
          </div>

          <div style={{ width: '100%', marginBottom: '40px' }}>
            {/* Day Labels */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', marginBottom: '8px' }}>
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
                <div key={d} style={{ textAlign: 'center', fontSize: '11px', color: 'var(--color-text-secondary)', fontWeight: 500, opacity: 0.6 }}>
                  {d}
                </div>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', width: '100%' }}>
              {heatmapData.map((d, i) => {
                if (!d) return <div key={i} style={{ aspectRatio: '1' }} />;

                const todayDay = new Date().getDate();
                const isToday = isCurrentMonth && d.label === todayDay;
                const isTrained = d.hasWorkout;

                // Background priority: today > trained > untrained
                const cellBackground = isToday
                  ? 'rgba(1, 108, 72, 0.2)' // light green tint
                  : isTrained
                    ? '#016c48' // primary green
                    : '#E8E8E8'; // inactive gray

                const cellTextColor = (isToday && !isTrained)
                  ? '#016c48' // green text on tint
                  : isTrained
                    ? '#ffffff'
                    : 'rgba(0,0,0,0.4)'; // muted gray for numbers

                return (
                  <div
                    key={i}
                    title={d.date}
                    onClick={() => {
                      if (!isTrained) return;
                      const dateStr = `${calendarYear}-${String(calendarMonth + 1).padStart(2, '0')}-${String(d.label).padStart(2, '0')}`;
                      setSelectedDay(prev => prev === dateStr ? null : dateStr);
                    }}
                    style={{
                      cursor: isTrained ? 'pointer' : 'default',
                      backgroundColor: cellBackground,
                      color: cellTextColor,
                      aspectRatio: '1',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '13px',
                      fontWeight: 500,
                      transition: 'all 0.2s',
                      transform: (isTrained && !isToday) ? 'scale(1.05)' : 'none',
                      boxShadow: (isTrained && !isToday) ? '0 4px 6px -1px rgba(0, 0, 0, 0.1)' : 'none'
                    }}
                  >
                    {d.label}
                  </div>
                );
              })}
            </div>

            {selectedDay && (() => {
              const dayLogs = logs.filter(l => l.date === selectedDay);
              if (dayLogs.length === 0) return null;

              const categories = [...new Set(dayLogs.map(l => l.category))].join(' + ');
              const exercises = [...new Set(dayLogs.map(l => l.exercise))];

              const formattedDate = new Date(
                ...selectedDay.split('-').map((v, idx) => idx === 1 ? Number(v) - 1 : Number(v))
              ).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' });

              return (
                <div style={{
                  marginTop: '12px',
                  padding: '12px 16px',
                  background: '#ffffff',
                  border: '1px solid rgba(0,0,0,0.08)',
                  borderRadius: '12px',
                }}>
                  <p style={{ margin: '0 0 4px', fontSize: '12px', color: 'var(--color-text-secondary)', fontWeight: 500 }}>
                    {formattedDate}
                  </p>
                  <p style={{ margin: '0 0 8px', fontSize: '15px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                    {categories}
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                    {exercises.map((ex, idx) => {
                      const exLogs = dayLogs.filter(l => l.exercise === ex);
                      const sets = exLogs.length;
                      return (
                        <div key={ex} style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          padding: '6px 0',
                          borderTop: idx > 0 ? '0.5px solid var(--color-border-tertiary)' : 'none',
                          fontSize: '13px',
                        }}>
                          <span style={{ color: 'var(--color-text-primary)', fontWeight: 500 }}>{ex}</span>
                          <span style={{ color: 'var(--color-text-secondary)' }}>{sets} {sets === 1 ? 'set' : 'sets'}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
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
                  background: #016c48;
                  color: #ffffff;
                  border-color: #016c48;
                }
                .freq-badge.inactive {
                  background: #E8E8E8;
                  color: rgba(0,0,0,0.4);
                  border: none;
                }
              `}</style>

            {/* Category frequency */}
            {isCurrentMonth && (
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
            )}

            <div className="freq-row">
              <span className="freq-label">Monthly workouts</span>
              <div className="freq-badges">
                {categoriesList.map(cat => (
                  <div
                    key={cat}
                    className={`freq-badge ${monthlyWorkouts[cat] > 0 ? 'active' : 'inactive'}`}
                  >
                    {cat} {monthlyWorkouts[cat]}
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
                    {lastWorkoutDetails.date} · {lastWorkoutDetails.category} · {lastWorkoutDetails.sets} {lastWorkoutDetails.sets === 1 ? 'set' : 'sets'}
                  </span>
                </div>
              </>
            )}
          </div>
        </section>

        {/* 3. Muscle Balance Radar */}
        <section className="md:col-span-12 bg-surface-container-lowest p-8 rounded-2xl border border-outline-variant/10 shadow-sm flex flex-col items-center">
          <h3 style={{ fontSize: '22px', fontWeight: 700 }} className="font-headline tracking-tighter w-full text-left">Muscle balance</h3>
          <p style={{ fontSize: '12px', color: 'var(--color-text-secondary, #73777f)', margin: '2px 0 16px', fontWeight: 400, width: '100%', textAlign: 'left' }}>
            Training days per category — last 30 days
          </p>
          <div className="w-full h-[360px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" margin={{ top: 50, right: 40, bottom: 30, left: 40 }} outerRadius={90} data={radarData}>
                <PolarGrid stroke="#e0e3e5" />
                <PolarAngleAxis
                  dataKey="subject"
                  tick={{ fontSize: 13, fontWeight: 600, fill: 'var(--color-text-primary, #191c1e)' }}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload;
                      return (
                        <div className="bg-white p-3 rounded-xl border border-outline-variant/20 shadow-xl text-xs font-bold text-on-surface">
                          {d.subject} — {d.rawValue} days this month
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

          {/* External 2x2 Legend */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '8px 24px',
            marginTop: '16px',
            padding: '0 16px',
            width: '100%'
          }}>
            {radarData.map(item => (
              <div key={item.subject} style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '6px 0',
                borderBottom: '0.5px solid var(--color-border-tertiary, #e0e3e5)',
              }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary, #191c1e)' }}>
                  {item.subject}
                </span>
                <span style={{ fontSize: '13px', fontWeight: 600, color: item.rawValue > 0 ? '#1D9E75' : 'var(--color-text-secondary, #73777f)' }}>
                  {item.rawValue} {item.rawValue === 1 ? 'day' : 'days'}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* 4. Skill Progression */}
        <section className="md:col-span-12 bg-surface-container-lowest p-8 rounded-2xl border border-outline-variant/10 shadow-sm">
          <div className="flex justify-between items-center mb-8">
            <h3 style={{ fontSize: '22px', fontWeight: 700 }} className="font-headline tracking-tighter">Skills</h3>
            <div style={{ display: 'flex', alignItems: 'stretch', gap: '8px' }}>
              {allTimeBest > 0 && (
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'rgba(29,158,117,0.1)',
                  border: '1px solid rgba(29,158,117,0.2)',
                  borderRadius: '12px',
                  padding: '0 14px',
                }}>
                  <span style={{ fontSize: '10px', fontWeight: 600, color: '#1D9E75', letterSpacing: '0.05em' }}>
                    Personal best
                  </span>
                  <span style={{ fontSize: '18px', fontWeight: 700, color: '#1D9E75', lineHeight: 1.2 }}>
                    {allTimeBest}s
                  </span>
                </div>
              )}
              <select value={skillChartEx} onChange={e => setSkillChartEx(e.target.value)} style={{ width: 'auto', minWidth: '120px' }} className="bg-surface border border-outline-variant/10 rounded-xl text-[10px] font-black uppercase px-4 py-2 outline-none focus:ring-2 focus:ring-primary/20">
                {holdExercises.map(ex => <option key={ex}>{ex}</option>)}
              </select>
            </div>
          </div>
          <div style={{ height: '260px', width: '100%' }}>
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
                <LineChart data={skillChartData} margin={{ top: 24, right: 20, bottom: 0, left: 0 }}>
                  <CartesianGrid stroke="rgba(0,0,0,0.05)" vertical={false} strokeDasharray="0" />
                  <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#73777f' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#73777f' }} tickFormatter={v => `${v}s`} />
                  <Tooltip
                    formatter={(value, name) => [`${value}s`, name]}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  />
                  {allTimeBest > 0 && (
                    <ReferenceLine
                      y={allTimeBest}
                      stroke="#10b981"
                      strokeDasharray="4 4"
                      strokeWidth={1}
                      opacity={0.4}
                      label={{ value: `PB ${allTimeBest}s`, position: 'right', fontSize: 10, fill: '#10b981' }}
                    />
                  )}
                  <Line
                    type="monotone"
                    dataKey="best"
                    name="Best hold"
                    stroke="#10b981"
                    strokeWidth={2.5}
                    activeDot={{ r: 5 }}
                    dot={(props) => {
                      const { cx, cy, payload } = props;
                      const isMax = payload.date === maxSession?.date;
                      return (
                        <g key={`dot-${payload.date}`}>
                          <circle cx={cx} cy={cy} r={isMax ? 5 : 3} fill="#10b981" strokeWidth={0} />
                          {isMax && (
                            <text x={cx} y={cy - 12} textAnchor="middle" fontSize={11} fontWeight={700} fill="#10b981">
                              {payload.best}
                            </text>
                          )}
                        </g>
                      );
                    }}
                  />
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
