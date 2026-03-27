import { createContext, useContext, useState, useEffect, useRef } from 'react';

const TimerContext = createContext();

export function TimerProvider({ children }) {
  const [targetSeconds, setTargetSeconds] = useState(150);
  const [secondsLeft, setSecondsLeft] = useState(150);
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

  const startTimer = (secs) => {
    if (secs !== undefined) {
      setTargetSeconds(secs);
      setSecondsLeft(secs);
    }
    setIsRunning(true);
    setIsReady(false);
  };

  const pauseTimer = () => setIsRunning(false);
  
  const resumeTimer = () => {
    if (isReady) {
      setSecondsLeft(targetSeconds);
      setIsReady(false);
    }
    setIsRunning(true);
  };

  const resetTimer = () => {
    setIsRunning(false);
    setIsReady(false);
    setSecondsLeft(targetSeconds);
  };

  const setPreset = (secs) => {
    setIsRunning(false);
    setIsReady(false);
    setTargetSeconds(secs);
    setSecondsLeft(secs);
  };

  return (
    <TimerContext.Provider value={{
      targetSeconds,
      secondsLeft,
      isRunning,
      isReady,
      startTimer,
      pauseTimer,
      resumeTimer,
      resetTimer,
      setPreset,
      setTargetSeconds
    }}>
      {children}
    </TimerContext.Provider>
  );
}

export const useTimer = () => useContext(TimerContext);
