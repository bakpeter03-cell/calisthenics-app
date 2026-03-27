import { BrowserRouter, Routes, Route } from 'react-router-dom';
import TopNav from './components/TopNav';
import BottomNav from './components/BottomNav';
import Dashboard from './pages/Dashboard';
import AddWorkout from './pages/AddWorkout';
import History from './pages/History';

export default function App() {
  return (
    <BrowserRouter>
      <TopNav />
      <main className="pt-20 px-4 md:px-8 max-w-2xl mx-auto space-y-8 pb-32">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/add" element={<AddWorkout />} />
          <Route path="/history" element={<History />} />
          <Route path="/chat" element={
            <div className="flex items-center justify-center h-64 text-on-surface-variant font-bold">
              AI Chat Assistant Coming Soon
            </div>
          } />
        </Routes>
      </main>
      <BottomNav />
    </BrowserRouter>
  );
}
