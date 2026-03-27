import { Link, useLocation } from 'react-router-dom';

const BicepFlexIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
    <path d="M12 2a2 2 0 1 1-2 2 2 2 0 0 1 2-2zm2.5 13.5c-.9 0-1.7-.3-2.5-.7-.8.4-1.6.7-2.5.7h-1v4a1 1 0 0 1-1 1h-1a1 1 0 0 1-1-1v-4.5c0-1.1.9-2 2-2h1c.9 0 1.7.3 2.5.7.8-.4 1.6-.7 2.5-.7h1c1.1 0 2 .9 2 2v4.5a1 1 0 0 1-1 1h-1a1 1 0 0 1-1-1v-4zm-8.2-1.9a3.5 3.5 0 0 1-3.3-3.1v-.2a1 1 0 0 1 1-1h.5a1 1 0 0 1 1 1v.5a1.5 1.5 0 0 0 1.5 1.5h.5V11zm11.4 0V11h.5a1.5 1.5 0 0 0 1.5-1.5v-.5a1 1 0 0 1 1-1h.5a1 1 0 0 1 1 1v.2a3.5 3.5 0 0 1-3.3 3.1z"/>
  </svg>
);

const NavItem = ({ to, icon, label, path }) => {
  const isActive = path === to;
  return (
    <Link to={to} className={`flex flex-col items-center justify-center ${isActive ? 'text-primary scale-110 transition-transform' : 'text-on-surface-variant hover:text-primary transition-colors'}`}>
      {typeof icon === 'string' ? (
        <span className="material-symbols-outlined" style={isActive ? {fontVariationSettings: "'FILL' 1"} : {}}>{icon}</span>
      ) : (
        icon
      )}
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
        <NavItem to="/add" icon={<BicepFlexIcon />} label="Workout" path={path} />
        <NavItem to="/" icon="leaderboard" label="Analytics" path={path} />
        <NavItem to="/chat" icon="assistant" label="Chat" path={path} />
        <NavItem to="/history" icon="inventory_2" label="History" path={path} />
      </div>
    </nav>
  );
}
