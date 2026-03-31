import { useState } from 'react';
import { supabase } from '../utils/supabaseClient';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { Input } from './ui/Input';

export default function Auth() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState(null);

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isSignUp) {
        const { error: signUpError } = await supabase.auth.signUp({ 
          email, 
          password,
          options: {
            data: { username }
          }
        });
        if (signUpError) throw signUpError;
        alert('Check your email for the confirmation link!');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center animate-in fade-in zoom-in duration-500">
      <div className="w-full max-w-sm px-4">
        <div className="mb-8 text-center">
           <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary/20">
             <span className="material-symbols-outlined text-on-primary text-3xl">fitness_center</span>
           </div>
           <h2 className="font-headline text-3xl font-black text-on-surface tracking-tighter uppercase">CALI TRACKER</h2>
           <p className="text-on-surface-variant font-bold text-xs uppercase tracking-[0.2em] mt-1">{isSignUp ? 'Create your profile' : 'Welcome Back'}</p>
        </div>

        <Card className="p-6">
          <form onSubmit={handleAuth} className="space-y-4">
            {isSignUp && (
              <Input 
                label="Your Name" 
                type="text" 
                value={username} 
                onChange={(e) => setUsername(e.target.value)} 
                placeholder="Peter"
                required
              />
            )}
            <Input 
              label="Email Address" 
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              placeholder="you@example.com"
              required
            />
            <Input 
              label="Password" 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              placeholder="••••••••"
              required
            />

            {error && (
              <div className="bg-error/10 border border-error/20 p-3 rounded-lg text-error text-[11px] font-bold">
                {error}
              </div>
            )}

            <Button 
               type="submit" 
               className="w-full shadow-lg shadow-primary/10 mt-2" 
               variant="primary" 
               disabled={loading}
            >
              {loading ? 'Authenticating...' : isSignUp ? 'Create Account' : 'Sign In'}
            </Button>
          </form>
        </Card>

        <div className="mt-8 text-center">
           <button 
             onClick={() => setIsSignUp(!isSignUp)}
             className="text-primary text-[11px] font-black uppercase tracking-widest hover:underline"
           >
             {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Create one"}
           </button>
        </div>
      </div>
    </div>
  );
}
