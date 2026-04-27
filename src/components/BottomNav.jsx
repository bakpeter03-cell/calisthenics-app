import { Link, useLocation } from 'react-router-dom';

const NavItem = ({ to, icon, label, path }) => {
  const isActive = path === to;
  return (
    <Link 
      to={to} 
      className={`flex flex-col items-center gap-1 p-2 rounded-2xl transition-all duration-300 ${
        isActive 
          ? 'text-primary' 
          : 'text-on-surface-variant'
      }`}
    >
      <div className={`relative flex items-center justify-center w-14 h-8 rounded-full transition-all duration-300 ${
        isActive ? 'bg-primary-container' : 'hover:bg-on-surface/5'
      }`}>
        <span className={`material-symbols-outlined text-[24px] ${isActive ? 'variable-ops-bold' : ''}`}>
          {icon}
        </span>
      </div>
      <span className={`text-[12px] font-medium tracking-wide ${isActive ? 'text-primary' : 'text-on-surface-variant'}`}>
        {label}
      </span>
    </Link>
  );
};

export default function BottomNav() {
  const location = useLocation();
  const path = location.pathname;

  return (
    <nav className="fixed bottom-0 w-full z-50 pb-safe border-t border-outline-variant/20 shadow-[0_-12px_32px_rgba(25,28,30,0.06)]" style={{ background: '#ffffff' }}>
      <div className="max-w-2xl mx-auto h-20 flex justify-around items-center px-4">
        <NavItem to="/add" icon="sports_gymnastics" label="Workout" path={path} />
        <NavItem to="/" icon="leaderboard" label="Analytics" path={path} />
        <NavItem to="/chat" icon="assistant" label="Chat" path={path} />
        <NavItem to="/history" icon="inventory_2" label="History" path={path} />
      </div>
    </nav>
  );
}
