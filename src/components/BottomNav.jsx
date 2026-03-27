import { Link, useLocation } from 'react-router-dom';

const NavItem = ({ to, icon, label, path }) => {
  const isActive = path === to;
  return (
    <Link to={to} className={`flex flex-col items-center justify-center ${isActive ? 'text-primary scale-110 transition-transform' : 'text-on-surface-variant hover:text-primary transition-colors'}`}>
      <span className="material-symbols-outlined" style={isActive ? {fontVariationSettings: "'FILL' 1"} : {}}>{icon}</span>
      <span className="font-label text-[10px] font-bold uppercase tracking-widest mt-1">{label}</span>
    </Link>
  );
};

export default function BottomNav() {
  const location = useLocation();
  const path = location.pathname;

  return (
    <nav className="fixed bottom-0 w-full z-50 pb-safe bg-surface-container-lowest/80 backdrop-blur-md border-t border-outline-variant/20 shadow-[0_-12px_32px_rgba(25,28,30,0.06)]">
      <div className="max-w-2xl mx-auto h-20 flex justify-around items-center px-4">
        <NavItem to="/add" icon="fitness_center" label="Workout" path={path} />
        <NavItem to="/" icon="leaderboard" label="Analytics" path={path} />
        <NavItem to="/chat" icon="assistant" label="Chat" path={path} />
        <NavItem to="/history" icon="inventory_2" label="History" path={path} />
      </div>
    </nav>
  );
}
