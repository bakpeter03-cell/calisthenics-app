import { useRef } from 'react';
import { useTimer } from '../contexts/TimerContext';

export default function PulseTimer({ onPresetChange }) {
  const { 
    targetSeconds, 
    secondsLeft, 
    isRunning, 
    isReady, 
    startTimer, 
    pauseTimer, 
    resumeTimer, 
    resetTimer, 
    setPreset 
  } = useTimer();

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const handlePresetClick = (secs) => {
    setPreset(secs);
    if (onPresetChange) onPresetChange(secs);
  };

  const PRESETS = [90, 120, 150, 180];

  return (
    <section className="bg-surface-container-low rounded-xl p-6 sm:p-8 flex flex-col items-center justify-center relative overflow-hidden group shadow-sm">
      <div className={`absolute inset-0 transition-opacity duration-1000 pointer-events-none ${isReady ? 'opacity-20 bg-primary' : isRunning ? 'opacity-5 bg-gradient-to-tr from-primary to-transparent' : 'opacity-0'}`}></div>
      
      <div className="relative z-10 w-full flex flex-col items-center">
        <div className="flex justify-between w-full items-center mb-6">
           <span className="font-label text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Rest Timer</span>
           <div className="flex gap-2">
             {PRESETS.map(p => (
               <button 
                 key={p} 
                 onClick={() => handlePresetClick(p)} 
                 className={`text-[10px] font-bold px-2 py-1 rounded transition-colors ${targetSeconds === p ? 'bg-primary/20 text-primary' : 'bg-surface border border-outline-variant/20 text-on-surface-variant hover:bg-surface-container-high'}`}
               >
                 {p}s
               </button>
             ))}
           </div>
        </div>

        <div className={`text-[6rem] sm:text-[7rem] font-black tabular-nums tracking-tighter leading-none transition-colors duration-500 ${isReady ? 'text-primary' : isRunning ? 'text-on-surface' : 'text-on-surface-variant/40'}`}>
          {isReady ? 'READY' : formatTime(secondsLeft)}
        </div>

        <div className="flex gap-4 mt-8 w-full sm:w-auto">
          <button 
            onClick={resetTimer} 
            className="flex-1 sm:flex-none bg-surface border border-outline-variant/20 text-on-surface-variant px-6 py-3 rounded-xl font-bold uppercase tracking-widest text-xs transition-all active:scale-95 shadow-sm"
          >
            Reset
          </button>
          
          <button 
            onClick={isRunning ? pauseTimer : resumeTimer} 
            className={`flex-[2] sm:flex-none px-10 py-3 rounded-xl font-black uppercase tracking-wider text-sm transition-all active:scale-95 shadow-sm ${isRunning ? 'bg-surface-container-highest text-on-surface' : 'text-white'}`}
            style={!isRunning ? { backgroundColor: '#016c48' } : {}}
          >
            {isRunning ? 'Pause' : isReady ? 'Restart' : 'Resume & Start'}
          </button>
        </div>
      </div>
    </section>
  );
}
