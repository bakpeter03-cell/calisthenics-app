import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { TimerProvider } from './contexts/TimerContext';
import { LogProvider } from './contexts/LogContext';
import { useWorkoutLogs } from './hooks/useWorkoutLogs';
import TopNav from './components/TopNav';
import BottomNav from './components/BottomNav';
import Dashboard from './pages/Dashboard';
import AddWorkout from './pages/AddWorkout';
import History from './pages/History';
import Profile from './pages/Profile';
import Auth from './components/Auth';
import Chat from './pages/Chat';

function ScrollToTop() {
  const { pathname } = useLocation()
  
  useEffect(() => {
    // Instantly reset scroll without animation — prevents iOS chrome flash
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
  }, [pathname])
  
  return null
}

function AppContent() {
  const { user, initialLoadDone } = useWorkoutLogs();

  // Only show the global spinner on the very first mount/session check
  if (!initialLoadDone) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return <Auth />;
  }

  return (
    <BrowserRouter>
      <ScrollToTop />
      <TopNav />
      <main className="pt-20 px-4 md:px-8 max-w-2xl mx-auto space-y-8 pb-32">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/add" element={<AddWorkout />} />
          <Route path="/history" element={<History />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/chat" element={<Chat />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <BottomNav />
    </BrowserRouter>
  );
}

export default function App() {
  return (
    <LogProvider>
      <TimerProvider>
        <AppContent />
      </TimerProvider>
    </LogProvider>
  );
}
