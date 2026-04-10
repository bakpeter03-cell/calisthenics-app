import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../utils/supabaseClient';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

const PALETTE = [
  '#E63946', // vivid red
  '#2196F3', // bright blue
  '#FF9800', // vivid orange
  '#4CAF50', // vivid green
  '#9C27B0', // vivid purple
  '#00BCD4', // vivid cyan
  '#FF4081', // vivid pink
  '#CDDC39', // vivid lime
  '#FF5722', // deep orange
  '#3F51B5', // indigo
];

const HOLD_DIVISOR = { Push: 3, Pull: 5, Legs: 5, Core: 5 };

// --- Date Helpers & Bucketing ---

function toLocalDateStr(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseLocalDate(dateStr) {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day); // local midnight, no UTC shift
}

function isoWeek(dateStr) {
  const [year, month, day] = dateStr.split('-').map(Number);
  const d = new Date(year, month - 1, day); // local, no UTC shift
  const dayOfWeek = d.getDay() || 7; // 1=Mon, 7=Sun
  const thursday = new Date(d);
  thursday.setDate(d.getDate() + 4 - dayOfWeek);
  const yearStart = new Date(thursday.getFullYear(), 0, 1);
  const weekNum = Math.ceil(((thursday - yearStart) / 86400000 + 1) / 7);
  // Use thursday.getFullYear() — NOT d.getFullYear() — for correct ISO year
  return `${thursday.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

function weekLabel(mondayDateStr) {
  const [year, month, day] = mondayDateStr.split('-').map(Number);
  const d = new Date(year, month - 1, day);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function getWeeksAgoDate(weeks) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - weeks * 7);
  return d; // local midnight
}

function volumeScore(log, bodyweight_kg) {
  const intensity = bodyweight_kg + (log.weight || 0);
  const isIsometric = (log.hold_seconds > 0 && (log.reps === 0 || log.reps == null));
  if (isIsometric) {
    const divisor = HOLD_DIVISOR[log.category] ?? 5;
    return intensity * (log.hold_seconds / divisor);
  }
  const divisor = HOLD_DIVISOR[log.category] ?? 5;
  const holdMultiplier = 1 + (log.hold_seconds || 0) / divisor;
  return (log.reps || 0) * intensity * holdMultiplier;
}

function repsValue(log) {
  const isIsometric = (log.hold_seconds > 0 && (log.reps === 0 || log.reps == null));
  return isIsometric ? (log.hold_seconds || 0) : (log.reps || 0);
}

function intensityScore(log, bodyweight_kg) {
  const load = bodyweight_kg + (log.weight || 0);
  const isIsometric = (log.hold_seconds > 0 && (log.reps === 0 || log.reps == null));
  return isIsometric ? load * (log.hold_seconds || 0) : load * (log.reps || 0);
}

function progressionVelocity(weeklyData) {
  // Only look at weeks that have actual data
  const nonzero = weeklyData.filter(v => v > 0);
  if (nonzero.length < 2) return null; // need at least 2 logged weeks

  // Compare most recent logged week to the one before it
  const latest = nonzero[nonzero.length - 1];
  const previous = nonzero[nonzero.length - 2];

  if (previous === 0) return null;
  return ((latest - previous) / previous) * 100;
}

// Helper to get starting Monday of an ISO week
function getMonday(date) {
  const d = new Date(date);
  const day = d.getDay() || 7;
  d.setDate(d.getDate() - day + 1);
  return toLocalDateStr(d);
}

// --- Date Helpers for Equivalent Comparisons ---

function getDayOfWeek() {
  const day = new Date().getDay();
  return day === 0 ? 7 : day; // Sunday = 7, Monday = 1
}

function getThisWeekStart() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  const day = d.getDay() || 7;
  d.setDate(d.getDate() - day + 1);
  return d;
}

function getLastWeekStart() {
  const d = getThisWeekStart();
  d.setDate(d.getDate() - 7);
  return d;
}

function getLastWeekEquivalentEnd() {
  const d = getThisWeekStart();
  const dow = getDayOfWeek();
  d.setDate(d.getDate() - 7 + (dow - 1));
  d.setHours(23, 59, 59, 999);
  return d;
}

export default function VolumeChart({ logs = [] }) {
  const [activeCategory, setActiveCategory] = useState('Push');
  const [viewMode, setViewMode] = useState('volume'); // 'volume', 'reps', 'intensity'
  const [bodyweightKg, setBodyweightKg] = useState(72);
  const [loadingBodyweight, setLoadingBodyweight] = useState(true);
  const [hiddenExercises, setHiddenExercises] = useState(new Set());
  const [hintOpen, setHintOpen] = useState(false);

  // 1. Fetch Bodyweight
  useEffect(() => {
    async function fetchProfile() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('bodyweight') // Database has 'bodyweight' but spec says 'bodyweight_kg'
        .eq('id', session.user.id)
        .single();

      if (!error && data?.bodyweight) {
        setBodyweightKg(data.bodyweight);
      }
      setLoadingBodyweight(false);
    }
    fetchProfile();
  }, []);

  // 2. Data Processing
  const { chartData, exercises, weeksOfDataCount, metrics, isReady } = useMemo(() => {
    const defaultReturn = { chartData: [], exercises: [], weeksOfDataCount: 0, metrics: { currentTotal: 0, delta: 0, bestSetEx: 'None', bestSetVal: 0, progressingCount: 0, totalInCat: 0 }, isReady: false };
    if (!logs.length) return defaultReturn;

    // 1. Anchor window to most recent log in category
    const categoryLogsRaw = logs.filter(l => l.category === activeCategory);
    if (categoryLogsRaw.length === 0) return defaultReturn;

    const latestDateStr = categoryLogsRaw.reduce((latest, l) => l.date > latest ? l.date : latest, '1970-01-01');
    const [ey, em, ed] = latestDateStr.split('-').map(Number);
    const anchorDate = new Date(ey, em - 1, ed); // local midnight

    // Window End (End of day)
    const windowEnd = new Date(anchorDate);
    windowEnd.setHours(23, 59, 59, 999);

    // Window Start (8 weeks back)
    const windowStart = new Date(anchorDate);
    windowStart.setHours(0, 0, 0, 0);
    windowStart.setDate(windowStart.getDate() - 56);

    const windowLogs = logs.filter(l => {
      const d = parseLocalDate(l.date);
      return d >= windowStart && d <= windowEnd;
    });

    if (!windowLogs.length && categoryLogsRaw.length === 0) return defaultReturn;

    // 2. Get range of last 8 weeks buckets (Ending on the week containing anchorDate)
    const weekBuckets = [];
    const latestMondayStr = getMonday(anchorDate);
    const m = parseLocalDate(latestMondayStr);

    for (let i = 7; i >= 0; i--) {
      const d = new Date(m);
      d.setDate(d.getDate() - (i * 7));
      const isoStr = toLocalDateStr(d);
      weekBuckets.push({
        iso: isoWeek(isoStr),
        monday: isoStr,
      });
    }

    const categoryLogs = windowLogs.filter(l => l.category === activeCategory);
    if (!categoryLogs.length) return defaultReturn;

    const uniqueExercises = [...new Set(categoryLogs.map(l => l.exercise))].sort();

    // Aggregate by week and exercise
    const aggregation = {}; // { [exercise]: { [isoWeek]: value } }
    uniqueExercises.forEach(ex => {
      aggregation[ex] = {};
      weekBuckets.forEach(wb => aggregation[ex][wb.iso] = 0);
    });

    categoryLogs.forEach(log => {
      const week = isoWeek(log.date);
      if (!aggregation[log.exercise]) return;
      // Initialize week if not in bucket (edge case safety)
      if (aggregation[log.exercise][week] === undefined) {
        aggregation[log.exercise][week] = 0;
      }
      let val = 0;
      if (viewMode === 'volume') val = volumeScore(log, bodyweightKg);
      else if (viewMode === 'reps') val = repsValue(log);
      else if (viewMode === 'intensity') val = intensityScore(log, bodyweightKg);

      if (viewMode === 'intensity') {
        aggregation[log.exercise][week] = Math.max(aggregation[log.exercise][week], val);
      } else {
        aggregation[log.exercise][week] += val;
      }
    });

    // Final Chart Data
    const chartData = weekBuckets.map(wb => {
      const row = { name: weekLabel(wb.monday), iso: wb.iso };
      uniqueExercises.forEach(ex => {
        row[ex] = aggregation[ex][wb.iso] || null;
      });
      return row;
    }).filter(row => Object.values(row).some(v => typeof v === 'number' && v > 0));

    // Exercises with colors and velocity
    const exercisesWithMeta = uniqueExercises.map((ex, idx) => {
      const weeklyValues = weekBuckets.map(wb => aggregation[ex][wb.iso]);
      const velocity = progressionVelocity(weeklyValues);
      const dataPoints = weeklyValues.filter(v => v > 0).length;

      return {
        name: ex,
        color: PALETTE[idx % PALETTE.length],
        velocity,
        dataPoints,
      };
    });

    // Metrics for Cards
    // Metrics for Cards
    const weeksWithData = weekBuckets
      .map(wb => ({
        iso: wb.iso,
        total: uniqueExercises.reduce((sum, ex) => sum + (aggregation[ex][wb.iso] || 0), 0)
      }))
      .filter(w => w.total > 0)
      .reverse(); // newest first

    const latestWeekTotal = weeksWithData[0]?.total ?? 0;
    const previousWeekTotal = weeksWithData[1]?.total ?? 0;

    const currentTotal = latestWeekTotal;
    const lastTotalEq = previousWeekTotal;
    const delta = previousWeekTotal > 0
      ? ((latestWeekTotal - previousWeekTotal) / previousWeekTotal) * 100
      : null;

    const currentWeekIso = weeksWithData[0]?.iso ?? weekBuckets[7].iso;

    const currentWeekLogs = categoryLogs.filter(l => isoWeek(l.date) === currentWeekIso);

    // Find best set exercise this week
    let bestSetEx = 'No exercises';
    let bestSetVal = 0;
    currentWeekLogs.forEach(l => {
      let score = 0;
      if (viewMode === 'volume') score = volumeScore(l, bodyweightKg);
      else if (viewMode === 'reps') score = repsValue(l);
      else if (viewMode === 'intensity') score = intensityScore(l, bodyweightKg);

      if (score > bestSetVal) {
        bestSetVal = score;
        bestSetEx = l.exercise;
      }
    });

    const progressingCount = exercisesWithMeta.filter(ex => ex.velocity > 5).length;

    const weeksOfDataCount = chartData.length;

    return {
      chartData,
      exercises: exercisesWithMeta,
      isReady: true,
      weeksOfDataCount,
      metrics: {
        currentTotal,
        delta,
        bestSetEx,
        bestSetVal,
        progressingCount,
        totalInCat: uniqueExercises.length,
        lastTotalEq
      }
    };
  }, [logs, activeCategory, viewMode, bodyweightKg]);

  const getVolumeTrend = (thisWeek, lastWeek) => {
    if (thisWeek === 0 || thisWeek == null) {
      return { statement: 'No sessions yet', color: 'var(--color-text-tertiary)', showSubtitle: false };
    }
    if (lastWeek === 0 || lastWeek == null) {
      return { statement: 'Need 3+ weeks', color: 'var(--color-text-tertiary)', showSubtitle: false };
    }
    const pct = Math.round(((thisWeek - lastWeek) / lastWeek) * 100);
    if (Math.abs(pct) <= 5) {
      return { statement: 'Stayed the same', color: 'var(--color-text-secondary)', showSubtitle: false };
    }
    if (pct > 0) {
      return { statement: `Increased ${pct}%`, color: '#1D9E75', showSubtitle: true };
    }
    return { statement: `Decreased ${Math.abs(pct)}%`, color: '#E24B4A', showSubtitle: true };
  };

  const toggleExercise = (name) => {
    const next = new Set(hiddenExercises);
    if (next.has(name)) next.delete(name);
    else next.add(name);
    setHiddenExercises(next);
  };

  const unit = viewMode === 'volume' ? 'pts' : (viewMode === 'intensity' ? 'pts' : 'reps');

  return (
    <div className="bg-surface-container-lowest p-6 rounded-3xl border border-outline-variant/10 shadow-sm space-y-8">

      {/* 1. Title Row with Hint Icon */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
        <h2 style={{ fontSize: '22px', fontWeight: 700, margin: 0 }}>Volume analysis</h2>
        <button
          onClick={() => setHintOpen(h => !h)}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: '16px',
            color: 'var(--color-text-secondary)',
            padding: '2px',
            lineHeight: 1,
            display: 'flex',
            alignItems: 'center',
          }}
          aria-label="How is this calculated?"
        >
          ⓘ
        </button>
      </div>

      <style>{`
        @keyframes fadeIn { 
          from { opacity: 0; transform: translateY(-4px); } 
          to { opacity: 1; transform: translateY(0); } 
        }
        .recharts-wrapper:focus,
        .recharts-wrapper:focus-visible,
        .recharts-surface:focus,
        .recharts-surface:focus-visible {
          outline: none !important;
        }
      `}</style>

      {/* Hint Popover */}
      {hintOpen && (() => {
        const universalHints = {
          volume: "Your total weekly training load across all sets — reps, weight, and hold time combined into one number. More sessions, more weight, and more reps all push this up. Watch the trend week over week, not the number itself.",
          reps: "Total reps logged this week across all sets. Simple and honest — more reps over time means you're doing more work.",
          intensity: "Your peak effort score for each exercise this week — calculated from your single best set (highest load × reps, or load × hold for isometrics). Unlike volume, doing more sets doesn't move this number. Only a genuinely stronger or heavier best set will. A rising line means your ceiling is going up."
        };

        const sufficiencyNote = weeksOfDataCount < 2 && metrics.totalInCat > 0
          ? ` You need at least 2 weeks of ${activeCategory} data to see trends.`
          : '';

        return (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            padding: '12px 14px',
            background: 'var(--color-background-secondary, #f8f9fb)',
            borderRadius: '10px',
            marginBottom: '12px',
            animation: 'fadeIn 0.15s ease',
            border: '1px solid var(--color-border-secondary, #e0e3e5)',
          }}>
            <span style={{
              fontSize: '13px',
              color: 'var(--color-text-secondary, #44474e)',
              lineHeight: '1.5',
            }}>
              {universalHints[viewMode]}{sufficiencyNote}
            </span>
          </div>
        );
      })()}

      {/* 2. View Mode Toggle — Full Width */}
      <div style={{ backgroundColor: '#E8E8E8', padding: '4px', borderRadius: '16px', display: 'flex', gap: '4px', width: '100%' }}>
        {[
          { id: 'volume', label: 'Relative volume' },
          { id: 'reps', label: 'Reps' },
          { id: 'intensity', label: 'Intensity' }
        ].map(mode => (
          <button
            key={mode.id}
            onClick={() => { setViewMode(mode.id); }}
            style={{
              flex: 1,
              padding: '8px 16px',
              borderRadius: '12px',
              fontSize: '11px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              cursor: 'pointer',
              background: viewMode === mode.id ? '#016c48' : 'transparent',
              color: viewMode === mode.id ? '#ffffff' : '#444444',
              border: viewMode === mode.id ? '2px solid #016c48' : '2px solid transparent',
              transition: 'all 0.15s',
            }}
          >
            {mode.label}
          </button>
        ))}
      </div>

      {/* Category Tabs */}
      <div style={{
        display: 'flex',
        gap: '4px',
        padding: '4px',
        backgroundColor: '#E8E8E8',
        borderRadius: '16px',
        width: 'fit-content',
        overflowX: 'auto',
        WebkitOverflowScrolling: 'touch',
        scrollbarWidth: 'none',
      }}>
        {['Push', 'Pull', 'Legs', 'Core'].map(cat => (
          <button
            key={cat}
            onClick={() => { setActiveCategory(cat); setHiddenExercises(new Set()); }}
            style={{
              flexShrink: 0,
              padding: '8px 20px',
              borderRadius: '12px',
              fontSize: '12px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              cursor: 'pointer',
              background: activeCategory === cat ? '#016c48' : 'transparent',
              color: activeCategory === cat ? '#ffffff' : '#444444',
              border: activeCategory === cat ? '2px solid #016c48' : '2px solid transparent',
              transition: 'all 0.15s',
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      {!isReady ? (
        <div className="h-96 flex flex-col items-center justify-center border-2 border-dashed border-outline-variant/10 rounded-3xl bg-surface/30">
          <span className="material-symbols-outlined text-4xl text-on-surface-variant/20 mb-4">analytics</span>
          <p className="text-on-surface-variant/40 font-label text-xs uppercase tracking-[0.2em]">No logs found for {activeCategory} in the last 8 weeks</p>
        </div>
      ) : (
        <>
          {/* 4. Metric Chips Row */}
          <style>{`
            .metric-row {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 8px;
              margin-bottom: 8px;
            }
            @media (max-width: 480px) {
              .metric-chip { padding: 8px 10px !important; }
              .metric-chip .chip-label { font-size: 10px !important; }
              .metric-chip .chip-value { font-size: 13px !important; }
            }
          `}</style>

          <div className="metric-row">
            {(() => {
              // Helper Chip Component
              const MetricChip = ({ label, value, subtitle, hasData, color = 'var(--color-text-primary)', emptyText }) => {
                const isEmpty = !hasData;
                const hintBodyColor = 'var(--color-text-secondary, #44474e)';
                return (
                  <div className="metric-chip" style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    textAlign: 'left',
                    gap: '4px',
                    padding: '10px 14px',
                    minHeight: '120px',
                    flex: 1,
                    background: 'var(--color-background-secondary, #f8f9fb)',
                    border: '1px solid var(--color-border-secondary, #e0e3e5)',
                    borderRadius: '10px',
                  }}>
                    <span className="chip-label" style={{ fontSize: '11px', fontWeight: 700, color: isEmpty ? hintBodyColor : 'var(--color-text-secondary)' }}>
                      {label}
                    </span>
                    <span className="chip-value" style={{
                      fontSize: '15px',
                      fontWeight: isEmpty ? 400 : 700,
                      color: isEmpty ? hintBodyColor : color,
                    }}>
                      {isEmpty ? (emptyText ?? 'No sessions yet') : value}
                    </span>
                    <span style={{
                      fontSize: '11px',
                      color: 'var(--color-text-tertiary)',
                      height: '16px',
                      display: 'block',
                    }}>
                      {(hasData && subtitle) ? subtitle : ''}
                    </span>
                  </div>
                );
              };

              // 1. Volume/Reps Chip
              const volLabel = viewMode === 'volume' ? 'Weekly volume' : (viewMode === 'reps' ? 'Weekly reps' : 'Peak intensity');
              const volHasData = metrics.currentTotal > 0 && metrics.lastTotalEq > 0;
              const trend = getVolumeTrend(metrics.currentTotal, metrics.lastTotalEq);
              const volValue = trend.statement;
              const volColor = trend.color;
              const volSubtitle = trend.showSubtitle ? 'vs previous logged week' : '';

              // 2. Best Set Chip
              const bestHasData = metrics.bestSetVal > 0;
              const bestValue = bestHasData ? metrics.bestSetEx : '';

              // 3. Progressing Chip
              const progHasData = exercises.some(ex => ex.dataPoints >= 2);
              const progValue = progHasData ? `${metrics.progressingCount} of ${metrics.totalInCat} items` : '';

              return (
                <>
                  <MetricChip
                    label={volLabel}
                    value={volValue}
                    subtitle={volSubtitle}
                    hasData={volHasData}
                    emptyText={volValue}
                    color={volColor}
                  />
                  <MetricChip
                    label="Best set"
                    value={bestValue}
                    subtitle=""
                    hasData={bestHasData}
                  />
                  <MetricChip
                    label="Progressing"
                    value={progValue}
                    subtitle=""
                    hasData={progHasData}
                    emptyText="Need 3+ weeks"
                  />
                </>
              );
            })()}
          </div>

          {/* 5. Chart */}
          <div
            className="h-[400px] w-full pt-4"
            style={{ outline: 'none', WebkitTapHighlightColor: 'transparent' }}
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid stroke="rgba(0,0,0,0.06)" vertical={false} />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: 'var(--md-sys-color-on-surface-variant)', opacity: 0.5 }}
                  dy={10}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: 'var(--md-sys-color-on-surface-variant)', opacity: 0.5 }}
                  tickFormatter={v => v >= 1000 ? (v / 1000).toFixed(1) + 'k' : v}
                  domain={['auto', 'auto']}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    borderRadius: '16px',
                    border: 'none',
                    boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
                    backdropFilter: 'blur(8px)',
                    padding: '12px 16px'
                  }}
                  itemStyle={{ fontSize: 12, fontWeight: 700, padding: '2px 0' }}
                  labelStyle={{ fontSize: 10, fontWeight: 900, textTransform: 'uppercase', color: 'var(--md-sys-color-on-surface-variant)', marginBottom: 8, opacity: 0.5 }}
                  formatter={(value, name) => [value.toLocaleString(), name]}
                  labelFormatter={(label) => label}
                />
                {exercises.map(ex => (
                  <Line
                    key={ex.name}
                    type="monotone"
                    dataKey={ex.name}
                    name={ex.name}
                    stroke={ex.color}
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: ex.color, strokeWidth: 0 }}
                    activeDot={{ r: 5, strokeWidth: 0 }}
                    connectNulls={true}
                    hide={hiddenExercises.has(ex.name)}
                    animationDuration={1000}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* 6. Exercise Pills */}
          <div className="flex flex-wrap gap-2 pt-6 pb-2">
            {exercises.map(ex => (
              <ExercisePill
                key={ex.name}
                exercise={ex}
                active={!hiddenExercises.has(ex.name)}
                onClick={() => toggleExercise(ex.name)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}


function ExercisePill({ exercise, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-2 py-1 rounded-md transition-all ${active
        ? 'bg-gray-100 opacity-100'
        : 'bg-gray-100 opacity-30 font-light'
        }`}
    >
      <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: exercise.color }} />
      <span className="text-[12px] text-gray-600 font-normal">{exercise.name}</span>
    </button>
  );
}
