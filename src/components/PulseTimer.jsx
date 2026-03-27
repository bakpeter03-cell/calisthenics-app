import { useState, useEffect, useRef } from 'react';

export default function PulseTimer({ targetSeconds = 150, autoStartTrigger = 0, onPresetChange }) {
  const [secondsLeft, setSecondsLeft] = useState(targetSeconds);
  const [isRunning, setIsRunning] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const timerRef = useRef(null);
  const audioContextRef = useRef(null);

  const playAlert = () => {
    if ('vibrate' in navigator) navigator.vibrate([200, 100, 200, 100, 200]);
    try {
      if (!audioContextRef.current) audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      const ctx = audioContextRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(1, ctx.currentTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 1);
    } catch(e) {}
  };

  useEffect(() => {
    setSecondsLeft(targetSeconds);
    if (autoStartTrigger > 0) {
      setIsRunning(true);
      setIsReady(false);
    } else {
      setIsRunning(false);
      setIsReady(false);
    }
  }, [autoStartTrigger, targetSeconds]);

  useEffect(() => {
    if (isRunning && secondsLeft > 0) {
      timerRef.current = setInterval(() => {
        setSecondsLeft(s => {
          if (s <= 1) {
            clearInterval(timerRef.current);
            setIsRunning(false);
            setIsReady(true);
            playAlert();
            return 0;
          }
          return s - 1;
        });
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [isRunning, secondsLeft]);

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const setPreset = (secs) => {
    setIsRunning(false);
    setIsReady(false);
    setSecondsLeft(secs);
    if (onPresetChange) onPresetChange(secs);
  };

  const handleToggle = () => {
    if (isReady) {
      setIsReady(false);
      setSecondsLeft(targetSeconds);
      setIsRunning(true);
    } else {
      setIsRunning(!isRunning);
    }
  };

  const handleReset = () => {
    setIsRunning(false);
    setIsReady(false);
    setSecondsLeft(targetSeconds);
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
                 onClick={() => setPreset(p)} 
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
            onClick={handleReset} 
            className="flex-1 sm:flex-none bg-surface border border-outline-variant/20 text-on-surface-variant px-6 py-3 rounded-xl font-bold uppercase tracking-widest text-xs transition-all active:scale-95 shadow-sm"
          >
            Reset
          </button>
          
          <button 
            onClick={handleToggle} 
            className={`flex-[2] sm:flex-none px-10 py-3 rounded-xl font-black uppercase tracking-wider text-sm transition-all active:scale-95 shadow-sm ${isRunning ? 'bg-surface-container-highest text-on-surface' : isReady ? 'bg-primary text-on-primary' : 'bg-primary-container text-on-primary-container'}`}
          >
            {isRunning ? 'Pause' : isReady ? 'Restart' : 'Resume & Start'}
          </button>
        </div>
      </div>
    </section>
  );
}
