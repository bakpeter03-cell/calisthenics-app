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

// --- Formulas ---

function isoWeek(dateStr) {
  const d = new Date(dateStr);
  const day = d.getDay() || 7;
  d.setDate(d.getDate() + 4 - day);
  const yearStart = new Date(d.getFullYear(), 0, 1);
  return d.getFullYear() + '-W' + String(Math.ceil((((d - yearStart) / 86400000) + 1) / 7)).padStart(2, '0');
}

function weekLabel(mondayDateStr) {
  const d = new Date(mondayDateStr);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
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
  const nonzero = weeklyData.filter(v => v > 0);
  if (nonzero.length < 3) return null;
  const n = weeklyData.length;
  const xMean = (n - 1) / 2;
  const yMean = weeklyData.reduce((s, v) => s + v, 0) / n;
  let num = 0, den = 0;
  weeklyData.forEach((v, i) => {
    num += (i - xMean) * (v - yMean);
    den += (i - xMean) ** 2;
  });
  const slope = den === 0 ? 0 : num / den;
  return yMean === 0 ? 0 : (slope / yMean) * 100;
}

// Helper to get starting Monday of an ISO week
function getMonday(date) {
  const d = new Date(date);
  const day = d.getDay() || 7;
  d.setDate(d.getDate() - day + 1);
  return d.toISOString().split('T')[0];
}

export default function VolumeChart({ logs = [] }) {
  const [activeCategory, setActiveCategory] = useState('Push');
  const [viewMode, setViewMode] = useState('volume'); // 'volume', 'reps', 'intensity'
  const [bodyweightKg, setBodyweightKg] = useState(72);
  const [hiddenExercises, setHiddenExercises] = useState(new Set());
  const [loadingBodyweight, setLoadingBodyweight] = useState(true);
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  const [showInsight, setShowInsight] = useState(false);

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
  const { chartData, exercises, metrics, isReady } = useMemo(() => {
    if (!logs.length) return { isReady: false };

    // Get range of last 8 weeks
    const weekBuckets = [];
    for (let i = 7; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - (i * 7));
      weekBuckets.push({
        iso: isoWeek(d.toISOString().split('T')[0]),
        monday: getMonday(d),
      });
    }

    const categoryLogs = logs.filter(l => l.category === activeCategory);
    if (!categoryLogs.length) return { isReady: false };

    const uniqueExercises = [...new Set(categoryLogs.map(l => l.exercise))].sort();
    
    // Aggregate by week and exercise
    const aggregation = {}; // { [exercise]: { [isoWeek]: value } }
    uniqueExercises.forEach(ex => {
      aggregation[ex] = {};
      weekBuckets.forEach(wb => aggregation[ex][wb.iso] = 0);
    });

    categoryLogs.forEach(log => {
      const week = isoWeek(log.date);
      if (aggregation[log.exercise] && aggregation[log.exercise][week] !== undefined) {
        let val = 0;
        if (viewMode === 'volume') val = volumeScore(log, bodyweightKg);
        else if (viewMode === 'reps') val = repsValue(log);
        else if (viewMode === 'intensity') val = intensityScore(log, bodyweightKg);

        if (viewMode === 'intensity') {
          aggregation[log.exercise][week] = Math.max(aggregation[log.exercise][week], val);
        } else {
          aggregation[log.exercise][week] += val;
        }
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
    const currentWeekIdx = 7;
    const lastWeekIdx = 6;
    const currentWeekIso = weekBuckets[currentWeekIdx].iso;
    const lastWeekIso = weekBuckets[lastWeekIdx].iso;

    const getWeeklyTotal = (iso) => uniqueExercises.reduce((sum, ex) => sum + (aggregation[ex][iso] || 0), 0);
    const currentTotal = getWeeklyTotal(currentWeekIso);
    const lastTotal = getWeeklyTotal(lastWeekIso);
    const delta = lastTotal > 0 ? ((currentTotal - lastTotal) / lastTotal) * 100 : 0;

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

    return {
      chartData,
      exercises: exercisesWithMeta,
      isReady: true,
      metrics: {
        currentTotal,
        delta,
        bestSetEx,
        bestSetVal,
        progressingCount,
        totalInCat: uniqueExercises.length
      }
    };
  }, [logs, activeCategory, viewMode, bodyweightKg]);

  const toggleExercise = (name) => {
    const next = new Set(hiddenExercises);
    if (next.has(name)) next.delete(name);
    else next.add(name);
    setHiddenExercises(next);
  };

  const unit = viewMode === 'volume' ? 'pts' : (viewMode === 'intensity' ? 'pts' : 'reps');

  return (
    <div className="bg-surface-container-lowest p-6 rounded-3xl border border-outline-variant/10 shadow-sm space-y-8">
      
      {/* 1. Title */}
      <h2 className="text-[28px] font-semibold text-on-surface">Volume analysis</h2>

      {/* 2. View Mode Toggle — Full Width */}
      <div className="flex gap-2 p-1 bg-surface-container-high rounded-2xl w-full">
        {[
          { id: 'volume', label: 'Relative volume' },
          { id: 'reps', label: 'Reps' },
          { id: 'intensity', label: 'Intensity' }
        ].map(mode => (
          <button
            key={mode.id}
            onClick={() => setViewMode(mode.id)}
            className={`flex-1 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all border ${viewMode === mode.id ? 'bg-primary text-on-primary border-primary shadow-lg shadow-primary/20' : 'bg-transparent border-transparent text-on-surface-variant hover:bg-surface-container-highest'}`}
          >
            {mode.label}
          </button>
        ))}
      </div>

      {/* 3. Category Tabs */}
      <div className="flex gap-2 p-1 bg-surface-container-high rounded-2xl w-fit">
        {['Push', 'Pull', 'Legs', 'Core'].map(cat => (
          <button
            key={cat}
            onClick={() => { setActiveCategory(cat); setHiddenExercises(new Set()); }}
            className={`px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${activeCategory === cat ? 'bg-primary text-on-primary shadow-lg shadow-primary/20' : 'text-on-surface-variant hover:bg-surface-container-highest'}`}
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
              display: flex;
              gap: 8px;
              overflow-x: auto;
              scrollbar-width: none;
              -webkit-overflow-scrolling: touch;
              margin-bottom: 8px;
              padding-bottom: 4px;
            }
            .metric-row::-webkit-scrollbar { display: none; }
            .metric-chip {
              flex: 0 0 auto;
              background: var(--color-background-primary, #f8f9fb);
              border: 1px solid var(--color-border-secondary, #e0e3e5);
              border-radius: 20px;
              padding: 8px 14px;
              display: flex;
              flex-direction: column;
              gap: 2px;
              min-width: 120px;
              max-width: 180px;
            }
          `}</style>
          
          <div className="metric-row">
            {/* Weekly Volume Chip */}
            <div className="metric-chip">
              <span style={{ fontSize: '11px', color: 'var(--color-text-secondary, #73777f)', fontWeight: 400, whiteSpace: 'nowrap' }}>
                {viewMode === 'volume' ? 'Weekly volume' : (viewMode === 'reps' ? 'Weekly reps' : 'Peak intensity')}
              </span>
              <div style={{ fontSize: '15px', color: 'var(--color-text-primary, #191c1e)', fontWeight: 700, whiteSpace: 'nowrap' }}>
                {metrics.currentTotal === 0 ? (
                  <span style={{ fontWeight: 400, opacity: 0.5 }}>No sessions yet</span>
                ) : (
                  <>
                    {Math.round(metrics.currentTotal).toLocaleString()}
                    {metrics.delta !== 0 && (
                      <span style={{ 
                        marginLeft: '4px',
                        color: Math.abs(metrics.delta) <= 5 ? 'var(--color-text-secondary, #73777f)' : (metrics.delta > 0 ? '#1D9E75' : '#E24B4A')
                      }}>
                        {metrics.delta > 0 ? '↑' : '↓'} {Math.abs(Math.round(metrics.delta))}%
                      </span>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Best Set Chip */}
            <div className="metric-chip">
              <span style={{ fontSize: '11px', color: 'var(--color-text-secondary, #73777f)', fontWeight: 400, whiteSpace: 'nowrap' }}>Best set</span>
              <div style={{ fontSize: '15px', color: 'var(--color-text-primary, #191c1e)', fontWeight: 700, whiteSpace: 'nowrap' }}>
                {metrics.bestSetVal === 0 ? (
                  <span style={{ fontWeight: 400, opacity: 0.5 }}>Log a session</span>
                ) : (
                   `${metrics.bestSetEx.length > 14 ? metrics.bestSetEx.substring(0, 13) + '…' : metrics.bestSetEx} · ${Math.round(metrics.bestSetVal).toLocaleString()} ${unit}`
                )}
              </div>
            </div>

            {/* Progressing Chip */}
            <div className="metric-chip">
              <span style={{ fontSize: '11px', color: 'var(--color-text-secondary, #73777f)', fontWeight: 400, whiteSpace: 'nowrap' }}>Progressing</span>
              <div style={{ fontSize: '15px', color: 'var(--color-text-primary, #191c1e)', fontWeight: 700, whiteSpace: 'nowrap' }}>
                {metrics.totalInCat < 1 ? (
                  <span style={{ fontWeight: 400, opacity: 0.5 }}>No data</span>
                ) : (
                  // Assuming progression check needs at least some data points as per chart logic
                  exercises.some(ex => ex.dataPoints >= 3) 
                    ? `${metrics.progressingCount} of ${metrics.totalInCat} exercises`
                    : <span style={{ fontWeight: 400, opacity: 0.5 }}>Need 3+ weeks</span>
                )}
              </div>
            </div>
          </div>

          {/* 5. Chart */}
          <div className="h-[400px] w-full pt-4">
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
                  formatter={(v) => [v.toLocaleString(), viewMode.charAt(0).toUpperCase() + viewMode.slice(1)]}
                />
                {exercises.map(ex => (
                  <Line
                    key={ex.name}
                    type="monotone"
                    dataKey={ex.name}
                    stroke={ex.color}
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: ex.color, strokeWidth: 0 }}
                    activeDot={{ r: 5, strokeWidth: 0 }}
                    connectNulls
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

          {/* Disclaimers — Side-by-Side under pills */}
          <div className="flex flex-wrap gap-x-12 gap-y-6 pt-6 border-t border-outline-variant/10">
            {/* How it works */}
            <div className="flex-1 min-w-[280px]">
              <button 
                  onClick={() => setShowHowItWorks(!showHowItWorks)}
                  className="flex items-center gap-2 text-on-surface-variant/60 hover:text-on-surface-variant transition-colors text-[13px] font-medium"
              >
                  <span className="material-symbols-outlined text-[18px]">info</span>
                  How are these numbers calculated?
                  <span className={`material-symbols-outlined transform transition-transform duration-200 ${showHowItWorks ? 'rotate-180' : ''}`}>expand_more</span>
              </button>
              
              {showHowItWorks && (
                  <div className="mt-4 bg-surface-container/50 border border-outline-variant/10 rounded-2xl p-6 text-[13px] text-on-surface-variant leading-relaxed animate-in slide-in-from-top-2 duration-300">
                    <div className="space-y-6">
                        <div>
                            <h4 className="font-bold text-on-surface mb-1">Volume score</h4>
                            <p>Each set is scored as: <strong>Reps × (Bodyweight + Added weight) × Hold multiplier</strong>.</p>
                            <p className="mt-2 text-[12px] opacity-70">The hold multiplier adds credit for pausing at the top of a rep — Push exercises use a 3-second divisor, Pull/Legs/Core use 5 seconds. Pure isometric holds (L-sit, planche) score as: Load × Hold seconds ÷ Divisor.</p>
                        </div>
                        <div>
                            <h4 className="font-bold text-on-surface mb-1">Reps</h4>
                            <p>Raw rep count summed per exercise per week. For isometric exercises, hold seconds are used instead of reps.</p>
                        </div>
                        <div>
                            <h4 className="font-bold text-on-surface mb-1">Intensity</h4>
                            <p>Your hardest single set each week — measured as <strong>Load × Reps (or Load × Hold for isometrics)</strong>.</p>
                        </div>
                        <div>
                            <h4 className="font-bold text-on-surface mb-1">Progression velocity</h4>
                            <p>A linear regression (slope) over your last 8 weeks of data. Requires at least 3 weeks of data per exercise.</p>
                            <p className="mt-2 text-[12px] opacity-70 text-on-primary-container bg-primary-container/20 px-3 py-1 rounded-lg inline-block">
                                <span className="font-bold">Slope:</span> Above +5%/week = progressing.
                            </p>
                        </div>
                    </div>
                  </div>
              )}
            </div>

            {/* Insight Banner */}
            <div className="flex-1 min-w-[280px]">
              <button 
                  onClick={() => setShowInsight(!showInsight)}
                  className="flex items-center gap-2 text-on-surface-variant/60 hover:text-on-surface-variant transition-colors text-[13px] font-medium"
              >
                  <span className="material-symbols-outlined text-[18px]">info</span>
                  How to read this chart
                  <span className={`material-symbols-outlined transform transition-transform duration-200 ${showInsight ? 'rotate-180' : ''}`}>expand_more</span>
              </button>
              
              {showInsight && (
                  <div className="mt-4 bg-surface-container-low border-l-4 border-primary p-4 rounded-r-2xl animate-in slide-in-from-top-2 duration-300">
                    <p className="text-[13px] italic text-on-surface-variant leading-relaxed">
                        {viewMode === 'volume' && "Each line shows your weekly training load for one exercise — the higher and steeper the line, the better. A consistent upward slope over 4–6 weeks means you're successfully overloading. Crossing lines between exercises are normal and often mean you're shifting focus. Watch for flat lines lasting more than 3 weeks — that's a plateau signal."}
                        {viewMode === 'reps' && "Each line shows total reps logged per week for one exercise. More reps week-over-week means higher training frequency or more sets — both are valid overload strategies. If your reps plateau while your volume score keeps rising, you're likely adding weight or holds — which is the stronger progression signal."}
                        {viewMode === 'intensity' && "Each line shows your best single set each week — your peak effort regardless of how many sets you did. A rising line here means you're genuinely getting stronger, not just doing more work. This is the closest equivalent to a 1RM trend in calisthenics. A flat line for 3+ weeks at the same rep/weight combination is a clear signal to try a harder variation or add weight."}
                    </p>
                  </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}


function ExercisePill({ exercise, active, onClick }) {
  const vel = exercise.velocity;
  const isPending = vel === null;
  const isPositive = vel > 5;
  const isNegative = vel < -5;

  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-2 py-1 rounded-md transition-all ${
        active 
          ? 'bg-gray-100 opacity-100' 
          : 'bg-gray-100 opacity-30 font-light'
      }`}
    >
      <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: exercise.color }} />
      <span className="text-[12px] text-gray-600 font-normal">{exercise.name}</span>
      <span className={`text-[10px] font-bold ${
        isPending ? 'text-gray-400' : 
        isPositive ? 'text-green-600' : 
        isNegative ? 'text-red-500' : 
        'text-gray-400'
      }`}>
        {isPending ? `${exercise.dataPoints}/3 wks` : `${vel > 0 ? '+' : ''}${Math.round(vel)}%`}
      </span>
    </button>
  );
}
