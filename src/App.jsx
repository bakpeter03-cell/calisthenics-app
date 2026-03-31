import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
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
      <TopNav />
      <main className="pt-20 px-4 md:px-8 max-w-2xl mx-auto space-y-8 pb-32">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/add" element={<AddWorkout />} />
          <Route path="/history" element={<History />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/chat" element={
            <div className="flex items-center justify-center h-64 text-on-surface-variant font-bold">
              AI Chat Assistant Coming Soon
            </div>
          } />
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
