import { useState, useEffect } from 'react';
import { supabase } from '../utils/supabaseClient';
import { useWorkoutLogs } from '../hooks/useWorkoutLogs';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

export default function Profile() {
  const { user } = useWorkoutLogs();
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [profile, setProfile] = useState({ username: '', avatar_url: '' });
  const [message, setMessage] = useState(null);

  useEffect(() => {
    if (user) fetchProfile();
  }, [user]);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      // Use * to prevent "Column not found" errors if schema cache is stale
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error && error.code !== '406') throw error;
      if (data) {
          setProfile(data);
      }
    } catch (err) {
      console.error("Error fetching profile:", err);
      // Fallback state to prevent UI crash
      setProfile(prev => ({ ...prev, username: user?.email.split('@')[0] }));
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setUpdating(true);
    setMessage(null);

    try {
      const payload = {
        id: user.id,
        username: profile.username,
        avatar_url: profile.avatar_url,
        updated_at: new Date().toISOString(),
      };
      
      // Only include bodyweight if the schema confirms it exists
      if (profile.bodyweight !== undefined && profile.bodyweight !== null) {
          payload.bodyweight = Number(profile.bodyweight);
      }

      const { error } = await supabase
        .from('profiles')
        .upsert(payload);

      if (error) throw error;
      setMessage({ type: 'success', text: 'Profile updated successfully!' });
    } catch (err) {
      console.error("Update error:", err);
      if (err.message.includes("could not find the 'bodyweight' column")) {
          setMessage({ type: 'error', text: "DATABASE SYNC PENDING: Please run `NOTIFY pgrst, 'reload schema';` in your SQL Editor." });
      } else {
          setMessage({ type: 'error', text: err.message });
      }
    } finally {
      setUpdating(false);
    }
  };


  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <h2 className="font-headline text-3xl font-black text-on-surface tracking-tighter uppercase">My Profile</h2>
      
      <Card className="p-8">
        <div className="mb-10 text-center relative group inline-block mx-auto w-full">
           <div className="w-24 h-24 bg-surface-container-high rounded-3xl mx-auto flex items-center justify-center border-2 border-outline-variant/20 shadow-md">
             <span className="material-symbols-outlined text-outline text-5xl">person</span>
           </div>
           <p className="text-[13px] font-normal text-on-surface-variant leading-relaxed mt-4 opacity-60">Connected as</p>
           <h3 className="text-xl font-normal text-on-surface">{user.email}</h3>
        </div>

        <form onSubmit={handleUpdate} className="space-y-6">
          <Input 
            label="Display Name" 
            value={profile.username || ''} 
            onChange={(e) => setProfile({ ...profile, username: e.target.value })} 
            placeholder="What should we call you?"
          />
          <Input 
             label="Current Bodyweight (kg)" 
             type="number"
             step="0.1"
             value={profile.bodyweight || ''} 
             onChange={(e) => setProfile({ ...profile, bodyweight: e.target.value })} 
             placeholder="e.g. 72"
           />
          <Input 
            label="Avatar URL (Optional)" 
            value={profile.avatar_url || ''} 
            onChange={(e) => setProfile({ ...profile, avatar_url: e.target.value })} 
            placeholder="https://..."
          />

          {message && (
            <div className={`p-4 rounded-xl text-[11px] font-black uppercase tracking-widest border ${
              message.type === 'success' ? 'bg-primary/5 border-primary/20 text-primary' : 'bg-error/5 border-error/20 text-error'
            }`}>
              {message.text}
            </div>
          )}

          <Button 
            type="submit" 
            className="w-full shadow-lg shadow-primary/20 mt-4" 
            variant="primary" 
            disabled={updating}
          >
            {updating ? 'Saving Settings...' : 'Save Profile Changes'}
          </Button>
        </form>
      </Card>

      <div className="bg-surface-container-low border border-outline-variant/10 p-6 rounded-2xl">
         <h4 className="font-headline text-lg font-bold text-on-surface uppercase mb-4">Security Information</h4>
         <div className="space-y-4">
            <div className="flex justify-between items-center py-3 border-b border-outline-variant/5">
               <span className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">User ID</span>
               <span className="text-[10px] font-mono text-on-surface-variant/70 overflow-hidden text-ellipsis whitespace-nowrap max-w-[150px]">{user.id}</span>
            </div>
            <div className="flex justify-between items-center py-2">
               <span className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">Authentication</span>
               <span className="bg-primary/10 text-primary text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-[0.1em]">Supabase Cloud</span>
            </div>
         </div>
      </div>

      <div className="pt-8 flex flex-col gap-4">
         <button 
           onClick={async () => {
             await supabase.auth.signOut();
             window.location.href = '/';
           }}
           className="w-full flex items-center justify-center gap-3 bg-error text-on-error py-4 rounded-xl font-black uppercase tracking-widest text-sm shadow-xl shadow-error/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
         >
           <span className="material-symbols-outlined text-[20px]">logout</span>
           Sign Out of All Sessions
         </button>
         
         <p className="text-center text-[10px] text-on-surface-variant font-bold uppercase tracking-widest opacity-50 px-8">
            Your data is locally cached and cloud-synchronized via Supabase. Signing out will clear your local cache for security.
         </p>
      </div>
    </div>
  );
}
