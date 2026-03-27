import { Link } from 'react-router-dom';

export default function TopNav() {
  return (
    <header className="fixed top-0 w-full z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md shadow-sm dark:shadow-none">
      <div className="max-w-2xl mx-auto h-16 px-6 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <span className="material-symbols-outlined text-slate-500 dark:text-slate-400">menu</span>
        </div>
        <Link to="/" className="font-inter tracking-tight font-black uppercase text-xl text-slate-900 dark:text-slate-50">
          CALI
        </Link>
        <div className="w-8 h-8 rounded-full bg-surface-container-highest overflow-hidden">
          <img alt="Profile" className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuA9kdOFH3FvTr9BgNN2jocyFsQqgg99x4pesjxVfAEve6TRI85ckpFo_EPwoxZjtVGJ0BJCdMl2D_1VlSdlvNo7Q5acepiPvHilavoryN6oYJVOnXDXHaGGxlIorM8Z7xF6RvybDkRyQZ7_Nq7kceXaB-6P2EUkap-c7AUm5z66MMVvNFqOnvAuqS9YbovKpY9f05puVfQLzGMOpdHHhsblg7aeM7MEjO8zNUtQFN0Vrikht9NelpVC4fJ_fpc2S6xb63yqogZFvu4" />
        </div>
      </div>
    </header>
  );
}
