import { createContext, useContext, useState, useEffect, useRef } from 'react';

const TimerContext = createContext();

const TIMER_START_KEY = 'cali_timer_start';
const TIMER_RUNNING_KEY = 'cali_timer_running';

export function TimerProvider({ children }) {
  const [targetSeconds, setTargetSeconds] = useState(150);
  const [secondsLeft, setSecondsLeft] = useState(150);
  const [elapsed, setElapsed] = useState(0);
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

  function getElapsed() {
    const start = localStorage.getItem(TIMER_START_KEY);
    if (!start) return 0;
    return Math.floor((Date.now() - Number(start)) / 1000);
  }

  useEffect(() => {
    if (!isRunning) return;

    const tick = () => {
      const currentElapsed = getElapsed();
      setElapsed(currentElapsed);
      
      const newSecondsLeft = Math.max(0, targetSeconds - currentElapsed);
      setSecondsLeft(newSecondsLeft);

      if (newSecondsLeft === 0) {
        setIsRunning(false);
        setIsReady(true);
        localStorage.setItem(TIMER_RUNNING_KEY, 'false');
        playAlert();
      }
    };

    // Set immediately on mount/resume
    tick();

    timerRef.current = setInterval(tick, 1000);

    return () => clearInterval(timerRef.current);
  }, [isRunning, targetSeconds]);

  useEffect(() => {
    // On mount, check if timer was running before suspension
    const wasRunning = localStorage.getItem(TIMER_RUNNING_KEY) === 'true';
    if (wasRunning) {
      setIsRunning(true);
      const currentElapsed = getElapsed();
      setElapsed(currentElapsed);
      setSecondsLeft(Math.max(0, targetSeconds - currentElapsed));
    }

    // On visibility change (returning to app)
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        const stillRunning = localStorage.getItem(TIMER_RUNNING_KEY) === 'true';
        if (stillRunning) {
          const currentElapsed = getElapsed();
          setElapsed(currentElapsed);
          setSecondsLeft(Math.max(0, targetSeconds - currentElapsed));
          setIsRunning(true);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [targetSeconds]);

  function startTimer(secs) {
    const target = secs !== undefined ? secs : targetSeconds;
    if (secs !== undefined) {
      setTargetSeconds(secs);
    }
    const now = Date.now();
    localStorage.setItem(TIMER_START_KEY, String(now));
    localStorage.setItem(TIMER_RUNNING_KEY, 'true');
    setIsRunning(true);
    setIsReady(false);
    setElapsed(0);
    setSecondsLeft(target);
  }

  function stopTimer() {
    localStorage.removeItem(TIMER_START_KEY);
    localStorage.setItem(TIMER_RUNNING_KEY, 'false');
    setIsRunning(false);
    setElapsed(0);
    setSecondsLeft(targetSeconds);
  }

  function pauseTimer() {
    localStorage.setItem(TIMER_RUNNING_KEY, 'false');
    setIsRunning(false);
  }
  
  function resumeTimer() {
    if (isReady) {
      startTimer(targetSeconds);
    } else {
      const now = Date.now();
      localStorage.setItem(TIMER_START_KEY, String(now - elapsed * 1000));
      localStorage.setItem(TIMER_RUNNING_KEY, 'true');
      setIsRunning(true);
    }
  }

  function resetTimer() {
    stopTimer();
    setIsReady(false);
  }

  function setPreset(secs) {
    resetTimer();
    setTargetSeconds(secs);
    setSecondsLeft(secs);
  }

  return (
    <TimerContext.Provider value={{
      targetSeconds,
      secondsLeft,
      elapsed,
      isRunning,
      isReady,
      startTimer,
      stopTimer,
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
