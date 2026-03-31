import { Link } from 'react-router-dom';
import { supabase } from '../utils/supabaseClient';
import { useWorkoutLogs } from '../hooks/useWorkoutLogs';

export default function TopNav() {
  const { user } = useWorkoutLogs();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <header className="fixed top-0 w-full z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md shadow-sm border-b border-outline-variant/10">
      <div className="max-w-2xl mx-auto h-16 px-6 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Link to="/profile" className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary hover:bg-primary hover:text-white transition-all shadow-sm">
            <span className="material-symbols-outlined text-[20px]">person</span>
          </Link>
          <Link to="/" className="font-headline tracking-tighter font-black uppercase text-xl text-on-surface hover:text-primary transition-colors">
            CALI
          </Link>
        </div>
        
        {user && (
          <div className="flex items-center gap-4">
             <span className="hidden sm:inline text-[11px] font-bold text-on-surface-variant/40 lowercase tracking-widest">{user.email}</span>
          </div>
        )}
      </div>
    </header>
  );
}
