import { Link, useLocation } from 'react-router-dom';

const BicepFlexIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
    <path d="M12 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm-1.5 5c-1.1 0-2 .9-2 2v2H5.7a1.5 1.5 0 0 0-1.5 1.5v2a1.5 1.5 0 0 0 1.5 1.5h1.8v3.5A1.5 1.5 0 0 0 9 21h6a1.5 1.5 0 0 0 1.5-1.5V16h1.8a1.5 1.5 0 0 0 1.5-1.5v-2a1.5 1.5 0 0 0-1.5-1.5h-2.8V9c0-1.1-.9-2-2-2h-3zm-5.3 5h2.3v2H6.5a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5zm10.6 0h2.3a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-2.3v-2z"/>
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
