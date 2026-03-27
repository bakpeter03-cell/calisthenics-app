import { Link } from 'react-router-dom';

export default function TopNav() {
  return (
    <header className="fixed top-0 w-full z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md shadow-sm dark:shadow-none">
      <div className="max-w-2xl mx-auto h-16 px-6 flex justify-center items-center">
        <Link to="/" className="font-inter tracking-tight font-black uppercase text-xl text-slate-900 dark:text-slate-50">
          CALI
        </Link>
      </div>
    </header>
  );
}
