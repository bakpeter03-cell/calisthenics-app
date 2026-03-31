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
  Legs: ['Squat', 'Pistol Squat', 'Lunge', 'One-leg Lunge', 'Calf Raise'],
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
    const prevDates = [...new Set(prevLogs.map(l => l.date))].sort((a,b) => b.localeCompare(a));
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
        <label className="font-bold text-[11px] text-on-surface-variant uppercase tracking-widest flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">calendar_today</span>
          Workout Date
        </label>
        <input 
          type="date" 
          value={date} 
          onChange={e => setDate(e.target.value)} 
          className="bg-surface rounded-lg border-none px-3 py-1.5 focus:ring-primary text-sm font-bold text-primary outline-none"
        />
      </div>

      <nav className="flex justify-between gap-2 overflow-x-auto pb-2 no-scrollbar">
        {Object.keys(EXERCISES).map(cat => (
          <button
            key={cat}
            onClick={() => handleCategoryChange(cat)}
            className={`flex-1 py-3 px-4 rounded-xl font-bold text-center uppercase tracking-wide text-sm ${
              category === cat 
                ? 'bg-primary text-on-primary shadow-md' 
                : 'bg-transparent border border-outline-variant/30 text-on-surface-variant hover:bg-surface-container-low'
            }`}
          >
            {cat}
          </button>
        ))}
      </nav>

      <Card className="space-y-6">
        <div className="space-y-4">
          <div className="relative group">
             <label className="block font-label text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1 ml-1">Exercise</label>
             <select 
               value={exercise} 
               onChange={e => setExercise(e.target.value)}
               className="w-full bg-surface-container-low border border-outline-variant/10 focus:border-secondary focus:bg-secondary/5 rounded-xl px-4 py-3 focus:ring-0 text-on-surface font-bold transition-colors uppercase tracking-wide"
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
                onDecrement={() => setReps(r => String(Math.max(0, (parseInt(r)||0) - 1)))} 
                onIncrement={() => setReps(r => String((parseInt(r)||0) + 1))} 
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
              onDecrement={() => setRest(r => String(Math.max(0, (parseInt(r)||0) - 10)))} 
              onIncrement={() => setRest(r => String((parseInt(r)||0) + 10))} 
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
              onDecrement={() => setHold(h => String(Math.max(0, (parseInt(h)||0) - 1)))} 
              onIncrement={() => setHold(h => String((parseInt(h)||0) + 1))} 
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
          <Button className="flex-[2] shadow-lg shadow-secondary/20" variant="primary" onClick={handleSave}>
            Save Set
          </Button>
        </div>
      </Card>

      <section className="space-y-6 mt-8">
        <div className="flex justify-between items-end px-1 mb-2">
          <h2 style={{ fontSize: '22px', fontWeight: 700 }} className="font-headline tracking-tighter text-on-surface">
            {isToday ? "Today's workout" : "Logged for " + date.split('-').reverse().join('/')}
          </h2>
          <span className="font-bold text-sm text-primary tracking-wide uppercase mb-1">{targetLogs.length} total</span>
        </div>
        
        {Object.keys(groupedTodaysLogs).length === 0 ? (
          <p className="text-center text-on-surface-variant text-sm font-medium py-8 bg-surface-container-low rounded-xl border border-dashed border-outline-variant/30">No exercises logged for {isToday ? 'today' : date} yet. Get started!</p>
        ) : (
          <div className="space-y-6">
            {Object.keys(groupedTodaysLogs).map(ex => {
              const exLogs = groupedTodaysLogs[ex];
              const totalReps = exLogs.reduce((sum, l) => sum + l.reps, 0);
              const totalWorkload = exLogs.reduce((sum, l) => sum + ((72 + (l.weight||0)) * l.reps), 0);
              const avgReps = exLogs.length ? Math.round(totalReps / exLogs.length) : 0;
              const bestSetReps = exLogs.length ? Math.max(...exLogs.map(l => l.reps)) : 0;
              const prevStats = getPrevSessionStats(ex);

              return (
              <div key={ex} className="space-y-3 bg-surface-container-lowest p-5 rounded-2xl border border-outline-variant/20 shadow-sm">
                <div className="flex flex-col mb-4">
                  <h4 className="font-black text-[22px] text-primary flex items-center gap-2 uppercase tracking-tight leading-none">
                    <span className="material-symbols-outlined text-[24px]">bolt</span>
                    {ex}
                  </h4>
                  
                  {/* Stats Grid */}
                  <div className="grid grid-cols-4 gap-2 mt-4 text-center">
                    <div className="bg-surface-container-low p-2 rounded-lg flex flex-col justify-center">
                      <p className="text-[9px] uppercase font-black tracking-widest text-on-surface-variant mb-0.5">Sets</p>
                      <p className="font-black text-on-surface text-lg leading-none">{exLogs.length}</p>
                    </div>
                    <div className="bg-surface-container-low p-2 rounded-lg flex flex-col justify-center">
                      <p className="text-[9px] uppercase font-black tracking-widest text-on-surface-variant mb-0.5">Avg Reps</p>
                      <p className="font-black text-on-surface text-lg leading-none">{avgReps}</p>
                    </div>
                    <div className="bg-surface-container-low p-2 rounded-lg flex flex-col justify-center">
                      <p className="text-[9px] uppercase font-black tracking-widest text-on-surface-variant mb-0.5">Total Reps</p>
                      <p className="font-black text-on-surface text-lg leading-none">{totalReps}</p>
                    </div>
                    <div className="bg-surface-container-low p-2 rounded-lg flex flex-col justify-center">
                      <p className="text-[9px] uppercase font-black tracking-widest text-on-surface-variant mb-0.5">Best</p>
                      <p className="font-black text-on-surface text-lg leading-none">{bestSetReps}</p>
                    </div>
                  </div>

                  {/* Previous Session Comp */}
                  {prevStats && (
                    <div className="mt-3 bg-surface px-4 py-3 rounded-xl border border-surface-variant/40 flex justify-between items-center text-xs shadow-sm">
                       <span className="font-bold text-on-surface-variant">Last: {prevStats.sets} sets, {prevStats.reps} reps</span>
                       <span className={`font-black tracking-widest uppercase ${totalReps >= prevStats.reps ? 'text-primary' : 'text-error'}`}>
                         Change: {totalReps >= prevStats.reps ? '+' : ''}{totalReps - prevStats.reps}
                       </span>
                    </div>
                  )}
                </div>
                
                <div className="flex flex-col space-y-2">
                  {exLogs.map((log, listIdx) => (
                    <div key={log.id} className="flex justify-between items-center py-3 px-4 bg-white dark:bg-surface-container-low rounded-xl border border-surface-variant/40 group hover:border-secondary/40 transition-colors shadow-sm">
                      {/* SET */}
                      <div className="w-20 text-left">
                        <span className="font-black text-[20px] text-primary tracking-tight uppercase">
                          SET {listIdx + 1}
                        </span>
                      </div>
                      
                      {/* REPS */}
                      <div className="flex-1 text-center flex flex-col items-center justify-center">
                         <span className="font-black text-[20px] text-on-surface leading-none block mb-0.5">
                           {log.reps || 0}
                         </span>
                         <span className="text-[9px] font-black text-on-surface-variant tracking-widest uppercase">
                           REPS
                         </span>
                      </div>

                      {/* HOLD */}
                      <div className="flex-1 text-center flex flex-col items-center justify-center">
                         <span className="font-black text-[20px] text-on-surface leading-none block mb-0.5">
                           {`${log.hold_seconds || 0}s`}
                         </span>
                         <span className="text-[9px] font-black text-on-surface-variant tracking-widest uppercase">
                           HOLD
                         </span>
                      </div>

                      {/* WEIGHT */}
                      <div className="flex-1 text-center flex flex-col items-center">
                        {log.weight > 0 ? (
                          <span className="font-black text-[20px] text-on-surface leading-none block mb-0.5">+{log.weight}<span className="text-[10px] text-on-surface-variant ml-0.5">KG</span></span>
                        ) : (
                          <span className="font-black text-[14px] text-on-surface-variant/60 uppercase block pt-1 mb-0.5">BW</span>
                        )}
                        <span className="text-[9px] font-black text-on-surface-variant tracking-widest uppercase mt-0.5">
                          WEIGHT
                        </span>
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
            )})}
          </div>
        )}
      </section>
    </div>
  );
}
