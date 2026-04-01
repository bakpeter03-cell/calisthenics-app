import { useState, useEffect } from 'react';
import { useWorkoutLogs } from '../hooks/useWorkoutLogs';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import PulseTimer from '../components/PulseTimer';
import { useTimer } from '../contexts/TimerContext';
import { getExerciseMeta } from '../utils/exerciseMap';

const EXERCISES = {
  Push: ['Push-up', 'Decline Push-up', 'Incline Push-up', 'Dip', 'Straight Bar Dip', 'Pike Push-up', 'Elevated Pike Pushup', 'Handstand Push-up', 'Archer Push-up'],
  Pull: ['Pull-up', 'Chin-up', 'L-sit pull-up', 'Row', 'Tucked Front Lever Raise', 'Advanced Tucked Front Lever Raise', 'One-leg Front Lever Raise', 'Front Lever Raise'],
  Legs: ['Bulgarian Split Squat', 'Reverse Nordics', 'Nordic Negatives', 'Single-leg RDL', 'Deficit Calf Raise'],
  Core: ['Knee Raise', 'Toes-to-bar', 'Dragon Flag', 'L-sit'],
  Skills: ['Muscle-up', 'Handstand', 'Front Lever', 'L-sit']
};

const formatDuration = (sec) => {
  if (!sec) return "00:00";
  const m = Math.floor(sec / 60).toString().padStart(2, '0');
  const s = (sec % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
};

const parseDuration = (str) => {
  if (!str) return 0;
  if (str.includes(':')) {
    const [m, s] = str.split(':');
    return (parseInt(m) || 0) * 60 + (parseInt(s) || 0);
  }
  return parseInt(str) || 0;
};

export default function AddWorkout() {
  const { addLog, logs, deleteLog } = useWorkoutLogs();
  const { startTimer, setTargetSeconds } = useTimer();
  const [category, setCategory] = useState('Push');
  const [exercise, setExercise] = useState(EXERCISES.Push[0]);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [weight, setWeight] = useState('');
  const [reps, setReps] = useState('');
  const [hold, setHold] = useState('');
  const [rest, setRest] = useState('0'); // Target rest for the next set


  const getTargetRest = (ex) => {
    const userPref = localStorage.getItem(`cali_prefer_rest_${ex}`);
    if (userPref) return parseInt(userPref, 10);
    const meta = getExerciseMeta(ex);
    return meta.defaultRestSeconds || 150;
  };

  useEffect(() => {
    const t = getTargetRest(exercise);
    setTargetSeconds(t);
    setRest(String(t));
  }, [exercise, setTargetSeconds]);



  const handleCategoryChange = (cat) => {
    setCategory(cat);
    setExercise(EXERCISES[cat][0]);
  };

  const handleSave = () => {
    const parsedReps = parseInt(reps) || 0;
    const parsedHold = parseInt(hold) || 0;

    if (parsedReps === 0 && parsedHold === 0) {
      alert('Enter reps or hold duration before saving.');
      return;
    }

    const t = getTargetRest(exercise);
    addLog({
      date,
      category,
      exercise,
      weight: parseFloat(weight) || 0,
      reps: parsedReps,
      hold_seconds: parsedHold,
      rest: parseInt(rest) || 0
    });
    setWeight('');
    setReps('');
    setHold('');
    startTimer(parseInt(rest) || 150);
    setRest(String(t));
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    }
  };

  const handleDuplicateLast = () => {
    const todayTargetLogs = logs.filter(l => l.date === date);
    if (todayTargetLogs.length > 0) {
      const last = todayTargetLogs[0];
      setCategory(last.category || 'Push');
      setExercise(last.exercise);
      setWeight(last.weight === 0 ? '' : String(last.weight));
      setReps(last.reps === 0 ? '' : String(last.reps));
      const holdRaw = last.hold_seconds || 0;
      setHold(holdRaw === 0 ? '' : String(holdRaw));
      setRest(String(last.rest || 0));
    }
  };

  const handleEdit = (log) => {
    setCategory(log.category || 'Push');
    setExercise(log.exercise);
    setWeight(log.weight === 0 ? '' : String(log.weight));
    setReps(log.reps === 0 ? '' : String(log.reps));
    const holdRaw = log.hold_seconds || 0;
    setHold(holdRaw === 0 ? '' : String(holdRaw));
    setRest(String(log.rest || 0));
    deleteLog(log.id);
  };

  const getPrevSessionStats = (exName) => {
    const prevLogs = logs.filter(l => l.exercise === exName && l.date !== date && l.date < date);
    if (!prevLogs.length) return null;
    const prevDates = [...new Set(prevLogs.map(l => l.date))].sort((a, b) => b.localeCompare(a));
    const lastDate = prevDates[0];
    const sessionLogs = prevLogs.filter(l => l.date === lastDate);
    const totalReps = sessionLogs.reduce((sum, l) => sum + l.reps, 0);
    return { date: lastDate, sets: sessionLogs.length, reps: totalReps };
  };

  const targetLogs = logs
    .filter(l => l.date === date)
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

  const groupedTodaysLogs = targetLogs.reduce((acc, log) => {
    if (!acc[log.exercise]) acc[log.exercise] = [];
    acc[log.exercise].push(log);
    return acc;
  }, {});

  const isToday = date === new Date().toISOString().split('T')[0];

  return (
    <div className="space-y-8">
      {/* Smart Countdown Timer */}
      <PulseTimer
        onPresetChange={(secs) => {
          setRest(String(secs));
          localStorage.setItem(`cali_prefer_rest_${exercise}`, secs);
        }}
      />

      {/* Date Picker Button */}
      <div className="flex justify-between items-center bg-surface-container-low p-4 rounded-xl border border-outline-variant/20 mb-4 shadow-sm">
        <label style={{ fontFamily: "'Inter', sans-serif" }} className="font-bold text-[11px] text-on-surface-variant tracking-widest flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">calendar_today</span>
          Workout date
        </label>
        <input
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
          className="bg-surface rounded-lg border-none px-3 py-1.5 focus:ring-primary text-sm font-bold text-primary outline-none"
        />
      </div>

      <nav className="flex justify-between gap-2 overflow-x-auto pb-2 no-scrollbar">
        {Object.keys(EXERCISES).map(cat => {
          const isActive = category === cat;
          return (
            <button
              key={cat}
              onClick={() => handleCategoryChange(cat)}
              style={{
                flex: 1,
                padding: '8px 16px',
                borderRadius: '12px',
                fontSize: '12px',
                fontWeight: 700,
                border: isActive ? '2px solid #016c48' : '2px solid rgba(0,0,0,0.15)',
                cursor: 'pointer',
                transition: 'background 0.15s, color 0.15s, border-color 0.15s',
                whiteSpace: 'nowrap',
                background: isActive ? '#016c48' : 'transparent',
                color: isActive ? '#ffffff' : '#444444',
              }}
            >
              {cat}
            </button>
          );
        })}
      </nav>

      <Card className="space-y-6">
        <div className="space-y-4">
          <div className="relative group">
            <label style={{ fontFamily: "'Inter', sans-serif" }} className="block font-label text-[10px] font-bold tracking-widest text-on-surface-variant mb-1 ml-1">Exercise</label>
            <select
              value={exercise}
              onChange={e => setExercise(e.target.value)}
              className="w-full bg-surface-container-low border border-outline-variant/10 focus:border-secondary focus:bg-secondary/5 rounded-xl px-4 py-3 focus:ring-0 text-on-surface font-bold transition-colors tracking-wide"
            >
              {EXERCISES[category].map(ex => <option key={ex} value={ex}>{ex}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input label="Weight (kg)" type="number" inputMode="numeric" pattern="[0-9]*" value={weight} onChange={e => setWeight(e.target.value)} onKeyDown={handleKeyDown} placeholder="BW" />
            {!['L-sit', 'Handstand', 'Front Lever'].includes(exercise) && (
              <Input
                label="Reps"
                type="number"
                inputMode="numeric"
                pattern="[0-9]*"
                value={reps}
                onChange={e => setReps(e.target.value)}
                onKeyDown={handleKeyDown}
                onDecrement={() => setReps(r => String(Math.max(0, (parseInt(r) || 0) - 1)))}
                onIncrement={() => setReps(r => String((parseInt(r) || 0) + 1))}
                placeholder="0"
              />
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Rest (sec)"
              type="number"
              inputMode="numeric"
              pattern="[0-9]*"
              value={rest}
              onChange={e => setRest(e.target.value)}
              onKeyDown={handleKeyDown}
              onDecrement={() => setRest(r => String(Math.max(0, (parseInt(r) || 0) - 10)))}
              onIncrement={() => setRest(r => String((parseInt(r) || 0) + 10))}
              placeholder="0"
            />
            <Input
              label="Hold (sec)"
              type="number"
              inputMode="numeric"
              pattern="[0-9]*"
              value={hold}
              onChange={e => setHold(e.target.value)}
              onKeyDown={handleKeyDown}
              onDecrement={() => setHold(h => String(Math.max(0, (parseInt(h) || 0) - 1)))}
              onIncrement={() => setHold(h => String((parseInt(h) || 0) + 1))}
              placeholder="0"
            />
          </div>
        </div>

        <div className="flex gap-2 w-full pt-2">
          {targetLogs.length > 0 && (
            <Button className="flex-1 shadow-md bg-surface border border-outline-variant/30 text-on-surface-variant hover:text-primary transition-colors hover:border-primary/50" variant="secondary" onClick={handleDuplicateLast}>
              <span className="material-symbols-outlined text-[18px] mr-1">content_copy</span>
              Duplicate
            </Button>
          )}
          <button 
            onClick={handleSave}
            style={{ 
              flex: 2, 
              background: '#016c48', 
              color: '#ffffff', 
              border: 'none', 
              borderRadius: '12px', 
              fontWeight: 900, 
              textTransform: 'uppercase', 
              letterSpacing: '0.05em', 
              fontSize: '14px',
              padding: '12px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
              cursor: 'pointer'
            }}
          >
            Save Set
          </button>
        </div>
      </Card>

      <section className="space-y-6 mt-8">
        <div className="flex justify-between items-end px-1 mb-2">
          <h2 style={{ fontSize: '22px', fontWeight: 700, fontFamily: "'Inter', sans-serif" }} className="font-headline tracking-tighter text-on-surface">
            {isToday ? "Today's workout" : "Logged for " + date.split('-').reverse().join('/')}
          </h2>
        </div>

        {Object.keys(groupedTodaysLogs).length === 0 ? (
          <p className="text-center text-on-surface-variant text-sm font-medium py-8 bg-surface-container-low rounded-xl border border-dashed border-outline-variant/30">No exercises logged for {isToday ? 'today' : date} yet. Get started!</p>
        ) : (
          <div className="space-y-6">
            {Object.keys(groupedTodaysLogs).map(ex => {
              const exLogs = groupedTodaysLogs[ex];
              const totalReps = exLogs.reduce((sum, l) => sum + l.reps, 0);
              const avgReps = exLogs.length ? Math.round(totalReps / exLogs.length) : 0;
              const bestSetReps = exLogs.length ? Math.max(...exLogs.map(l => l.reps)) : 0;
              const prevStats = getPrevSessionStats(ex);

              return (
                <div key={ex} className="space-y-3 bg-surface-container-lowest p-5 rounded-2xl border border-outline-variant/20 shadow-sm">
                  <div className="flex flex-col mb-4">
                    <h4 style={{ fontFamily: "'Inter', sans-serif" }} className="font-black text-[22px] text-primary flex items-center gap-2 tracking-tight leading-none">
                      {ex}
                    </h4>

                    {/* Stats Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '12px', marginTop: '16px' }}>
                      <div style={{ background: 'var(--color-background-secondary, #f1f3f4)', border: '0.5px solid var(--color-border-tertiary, #e0e3e5)', borderRadius: '8px', padding: '10px 8px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '2px', flex: 1 }}>
                        <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--color-text-secondary)', fontFamily: "'Inter', sans-serif" }}>
                          Sets
                        </span>
                        <span style={{ fontSize: '20px', fontWeight: '700', color: 'var(--color-text-primary)', fontFamily: "'Inter', sans-serif" }}>
                          {exLogs.length}
                        </span>
                      </div>
                      <div style={{ background: 'var(--color-background-secondary, #f1f3f4)', border: '0.5px solid var(--color-border-tertiary, #e0e3e5)', borderRadius: '8px', padding: '10px 8px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '2px', flex: 1 }}>
                        <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--color-text-secondary)', fontFamily: "'Inter', sans-serif" }}>
                          Avg reps
                        </span>
                        <span style={{ fontSize: '20px', fontWeight: '700', color: 'var(--color-text-primary)', fontFamily: "'Inter', sans-serif" }}>
                          {avgReps}
                        </span>
                      </div>
                      <div style={{ background: 'var(--color-background-secondary, #f1f3f4)', border: '0.5px solid var(--color-border-tertiary, #e0e3e5)', borderRadius: '8px', padding: '10px 8px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '2px', flex: 1 }}>
                        <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--color-text-secondary)', fontFamily: "'Inter', sans-serif" }}>
                          Total reps
                        </span>
                        <span style={{ fontSize: '20px', fontWeight: '700', color: 'var(--color-text-primary)', fontFamily: "'Inter', sans-serif" }}>
                          {totalReps}
                        </span>
                      </div>
                      <div style={{ background: 'var(--color-background-secondary, #f1f3f4)', border: '0.5px solid var(--color-border-tertiary, #e0e3e5)', borderRadius: '8px', padding: '10px 8px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '2px', flex: 1 }}>
                        <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--color-text-secondary)', fontFamily: "'Inter', sans-serif" }}>
                          Best
                        </span>
                        <span style={{ fontSize: '20px', fontWeight: '700', color: 'var(--color-text-primary)', fontFamily: "'Inter', sans-serif" }}>
                          {bestSetReps}
                        </span>
                      </div>
                    </div>

                    {/* Previous Session Comp */}
                    {prevStats && (
                      <div className="mt-3 bg-surface px-4 py-3 rounded-xl border border-surface-variant/40 flex justify-between items-center text-xs shadow-sm">
                        <span className="font-bold text-on-surface-variant">Last: {prevStats.sets} sets, {prevStats.reps} reps</span>
                        <span style={{ fontFamily: "'Inter', sans-serif" }} className={`font-black ${totalReps > prevStats.reps ? 'text-primary' : totalReps < prevStats.reps ? 'text-error' : 'text-on-surface-variant/50'}`}>
                          {totalReps > prevStats.reps ? `+${totalReps - prevStats.reps}` : totalReps - prevStats.reps === 0 ? '' : totalReps - prevStats.reps} reps vs last session
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col space-y-2">
                    {exLogs.map((log, listIdx) => (
                      <div key={log.id} className="flex justify-between items-center py-3 px-4 bg-white dark:bg-surface-container-low rounded-xl border border-surface-variant/40 group hover:border-secondary/40 transition-colors shadow-sm">
                        {/* SET */}
                        <div className="w-20 text-left">
                          <span style={{ fontFamily: "'Inter', sans-serif" }} className="font-black text-[18px] text-primary tracking-tight">
                            Set {listIdx + 1}
                          </span>
                        </div>

                        {/* REPS */}
                        <div className="flex-1 flex justify-center">
                          {(log.reps > 0 || !log.hold_seconds) && (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                              <span style={{ fontSize: '20px', fontWeight: '700', color: 'var(--color-text-primary)', fontFamily: "'Inter', sans-serif" }}>
                                {log.reps || 0}
                              </span>
                              <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', fontWeight: '400', fontFamily: "'Inter', sans-serif" }}>
                                Reps
                              </span>
                            </div>
                          )}
                        </div>

                        {/* HOLD */}
                        <div className="flex-1 flex justify-center">
                          {log.hold_seconds > 0 && (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                              <span style={{ fontSize: '20px', fontWeight: '700', color: 'var(--color-text-primary)', fontFamily: "'Inter', sans-serif" }}>
                                {log.hold_seconds}s
                              </span>
                              <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', fontWeight: '400', fontFamily: "'Inter', sans-serif" }}>
                                Hold
                              </span>
                            </div>
                          )}
                        </div>

                        {/* WEIGHT */}
                        <div className="flex-1 flex justify-center">
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                            <span style={{ fontSize: '20px', fontWeight: '700', color: 'var(--color-text-primary)', fontFamily: "'Inter', sans-serif" }}>
                              {log.weight > 0 ? `+${log.weight}kg` : 'BW'}
                            </span>
                            <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', fontWeight: '400', fontFamily: "'Inter', sans-serif" }}>
                              Weight
                            </span>
                          </div>
                        </div>

                        {/* ACTIONS */}
                        <div className="w-16 flex justify-end gap-1">
                          <button onClick={() => handleEdit(log)} className="text-outline-variant hover:text-secondary transition-colors p-1.5 rounded-lg hover:bg-surface-container-highest">
                            <span className="material-symbols-outlined text-[18px]">edit</span>
                          </button>
                          <button onClick={() => deleteLog(log.id)} className="text-outline-variant hover:text-error transition-colors p-1.5 rounded-lg hover:bg-surface-container-highest">
                            <span className="material-symbols-outlined text-[18px]">delete</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
