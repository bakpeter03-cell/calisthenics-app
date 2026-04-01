import { useWorkoutLogs } from '../hooks/useWorkoutLogs';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { useState, useMemo } from 'react';
import { getExerciseMeta } from '../utils/exerciseMap';
import { supabase } from '../utils/supabaseClient';

function summarizeSets(sets) {
  // Split into bodyweight sets (weight === 0) and weighted sets (weight > 0)
  const bwSets = sets.filter(s => !s.weight || s.weight === 0);
  const weightedSets = sets.filter(s => s.weight > 0);

  const parts = [];

  if (bwSets.length > 0) {
    parts.push(summarizeGroup(bwSets, false));
  }

  if (weightedSets.length > 0) {
    // Further group weighted sets by weight value
    const byWeight = weightedSets.reduce((acc, s) => {
      const key = s.weight;
      if (!acc[key]) acc[key] = [];
      acc[key].push(s);
      return acc;
    }, {});

    Object.entries(byWeight).sort((a,b) => Number(a[0]) - Number(b[0])).forEach(([weight, group]) => {
      parts.push(summarizeGroup(group, true, Number(weight)));
    });
  }

  return parts;
}

function summarizeGroup(sets, isWeighted, weight) {
  const repCounts = sets.map(s => s.reps || 0).filter(r => r > 0);
  const holdCounts = sets.map(s => s.hold_seconds || 0).filter(h => h > 0);

  const repsStr = repCounts.length === 0 ? null
    : Math.min(...repCounts) === Math.max(...repCounts)
      ? `${repCounts[0]} reps`
      : `${Math.min(...repCounts)}–${Math.max(...repCounts)} reps`;

  const holdStr = holdCounts.length === 0 ? null
    : Math.min(...holdCounts) === Math.max(...holdCounts)
      ? `${holdCounts[0]}s hold`
      : `${Math.min(...holdCounts)}–${Math.max(...holdCounts)}s hold`;

  const weightStr = isWeighted ? `+${weight} kg` : 'BW';

  const details = [repsStr, holdStr, weightStr].filter(Boolean).join(' · ');
  return `${sets.length} ${sets.length === 1 ? 'set' : 'sets'} · ${details}`;
}

export default function History() {
  const { logs, deleteLog, fetchLogs, user } = useWorkoutLogs();
  const [expandedDates, setExpandedDates] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editFields, setEditFields] = useState({});

  const toggleDate = (date) => {
    setExpandedDates(prev => prev.includes(date) ? prev.filter(d => d !== date) : [...prev, date]);
  };

  const groupedByDate = useMemo(() => {
    return logs.reduce((acc, log) => {
      if (!acc[log.date]) acc[log.date] = [];
      acc[log.date].push(log);
      return acc;
    }, {});
  }, [logs]);

  const dates = useMemo(() => {
    return Object.keys(groupedByDate).sort((a,b) => new Date(b) - new Date(a));
  }, [groupedByDate]);

  const handleDeleteExercise = (sets) => {
    if (window.confirm(`Delete all ${sets.length} sets of ${sets[0].exercise}?`)) {
      sets.forEach(log => deleteLog(log.id));
    }
  };

  const handleEditSave = async (sets) => {
    try {
      const { error } = await supabase
        .from('workout_logs')
        .update({
          reps: parseInt(editFields.reps) || 0,
          hold_seconds: parseInt(editFields.hold_seconds) || 0,
          weight: parseFloat(editFields.weight) || 0
        })
        .in('id', sets.map(s => s.id));
      
      if (error) throw error;
      
      setEditingId(null);
      if (user) fetchLogs(user.id);
    } catch (err) {
      console.error("Error updating logs:", err);
      alert("Failed to save changes.");
    }
  };

  const startEditing = (exName, sets) => {
    const firstSet = sets[0];
    setEditingId(`${exName}-${firstSet.date}`); // Unique ID for the exercise group edit
    setEditFields({
      reps: firstSet.reps,
      hold_seconds: firstSet.hold_seconds,
      weight: firstSet.weight
    });
  };

  return (
    <div className="space-y-6">
      <h2 className="font-headline text-3xl font-black text-on-surface tracking-tighter mb-8">Training Log</h2>
      
      {dates.length === 0 ? (
        <p className="text-center text-on-surface-variant font-medium mt-12 block py-8">No workouts logged yet.</p>
      ) : (
        <div className="space-y-2">
          {dates.map(dateStr => {
            const isExpanded = expandedDates.includes(dateStr);
            const rawDayLogs = groupedByDate[dateStr];
            
            const sortedLogs = [...rawDayLogs].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
            
            // Group and summarize by Exercise + Weight + Hold
            const groupByExerciseAndWeight = (logs) => {
              const map = new Map();
              const order = [];
              for (const log of logs) {
                const weight = log.weight || 0;
                const hold = log.hold_seconds || 0;
                const key = `${log.exercise}__${weight}__${hold}`;
                if (!map.has(key)) {
                  map.set(key, { exercise: log.exercise, weight, hold_seconds: hold, sets: [] });
                  order.push(key);
                }
                map.get(key).sets.push(log);
              }
              return order.map(k => map.get(k));
            };

            const blocks = groupByExerciseAndWeight(sortedLogs);

            const catCounts = sortedLogs.reduce((acc, log) => {
              const cat = log.category || 'WORKOUT';
              acc[cat] = (acc[cat] || 0) + 1;
              return acc;
            }, {});
            const uniqueCats = Object.keys(catCounts).sort((a,b) => catCounts[b] - catCounts[a]);
            const catLabel = uniqueCats.length > 0 ? uniqueCats.join(' + ').toUpperCase() : 'WORKOUT';
            
            const formattedDate = new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' });
            
            // Top exercise (exercise with most cumulative sets across session)
            const groupedForHeader = sortedLogs.reduce((acc, l) => {
              if (!acc[l.exercise]) acc[l.exercise] = [];
              acc[l.exercise].push(l);
              return acc;
            }, {});
            const topExercise = Object.keys(groupedForHeader).sort((a, b) => groupedForHeader[b].length - groupedForHeader[a].length)[0];

            return (
              <Card key={dateStr} className="overflow-hidden p-0 border border-outline-variant/20 shadow-sm transition-all duration-300 hover:shadow-md">
                <button 
                  onClick={() => toggleDate(dateStr)}
                  className="w-full flex justify-between items-center p-5 bg-surface text-left"
                >
                  <div>
                    <h3 className="font-headline text-[16px] font-bold text-on-surface tracking-tight">
                      <span className="uppercase">{catLabel}</span> - {formattedDate}
                    </h3>
                    <p className="text-[13px] text-primary mt-1">
                      {sortedLogs.length} sets · {topExercise}
                    </p>
                  </div>
                  <span className={`material-symbols-outlined text-on-surface-variant transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
                    expand_more
                  </span>
                </button>
                
                {isExpanded && (
                  <div className="px-5 pb-5 pt-4 bg-surface-container-lowest border-t border-outline-variant/10">
                    <div style={{
                      fontSize: '12px',
                      color: 'var(--color-text-secondary, #73777f)',
                      paddingBottom: '10px',
                      borderBottom: '0.5px solid var(--color-border-tertiary, #e0e3e5)',
                      marginBottom: '4px'
                    }}>
                      {sortedLogs.length} sets · {blocks.length} exercise blocks · {formattedDate}
                    </div>

                    <div className="flex flex-col">
                      {blocks.map((block, blockIndex) => {
                        const exName = block.exercise;
                        const sets = block.sets;
                        const groupId = `${exName}-${sets[0].id}`; // Unique ID for the block group edit
                        const isEditing = editingId === groupId;
                        const meta = getExerciseMeta(exName);

                        return (
                          <div key={`${groupId}-${blockIndex}`} className="flex flex-col">
                            <div style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              padding: '10px 0',
                              borderBottom: '0.5px solid var(--color-border-tertiary, #e0e3e5)'
                            }}>
                              <span style={{ fontSize: '14px', fontWeight: 500, color: '#1a1a1a' }}>{exName}</span>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                                  {summarizeSets(sets).map((part, i) => (
                                    <span key={i} style={{ fontSize: '13px', color: '#1a1a1a' }}>
                                      {part}
                                    </span>
                                  ))}
                                </div>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                  <button 
                                    onClick={() => startEditing(exName, sets)} 
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-secondary, #73777f)', padding: '4px' }}
                                    className="flex items-center justify-center hover:text-primary transition-colors"
                                  >
                                    <span className="material-symbols-outlined text-[18px]">edit</span>
                                  </button>
                                  <button 
                                    onClick={() => handleDeleteExercise(sets)} 
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-secondary, #73777f)', padding: '4px' }}
                                    className="flex items-center justify-center hover:text-error transition-colors"
                                  >
                                    <span className="material-symbols-outlined text-[18px]">delete</span>
                                  </button>
                                </div>
                              </div>
                            </div>

                            {isEditing && (
                              <div style={{ padding: '12px', background: 'var(--color-background-secondary)', borderRadius: '8px', margin: '8px 0', border: '1px solid var(--color-border-secondary)' }}>
                                <div className="grid grid-cols-3 gap-3 mb-4">
                                  {(meta.isRepBased || !meta.isHold) && (
                                    <div>
                                      <label className="block text-[10px] uppercase font-bold text-on-surface-variant mb-1">Reps</label>
                                      <Input 
                                        type="number" 
                                        value={editFields.reps} 
                                        onChange={(e) => setEditFields({...editFields, reps: e.target.value})}
                                        className="text-center"
                                      />
                                    </div>
                                  )}
                                  {(meta.isHold || !meta.isRepBased) && (
                                    <div>
                                      <label className="block text-[10px] uppercase font-bold text-on-surface-variant mb-1">Hold (s)</label>
                                      <Input 
                                        type="number" 
                                        value={editFields.hold_seconds} 
                                        onChange={(e) => setEditFields({...editFields, hold_seconds: e.target.value})}
                                        className="text-center"
                                      />
                                    </div>
                                  )}
                                  <div>
                                    <label className="block text-[10px] uppercase font-bold text-on-surface-variant mb-1">Weight</label>
                                    <Input 
                                      type="number" 
                                      value={editFields.weight} 
                                      onChange={(e) => setEditFields({...editFields, weight: e.target.value})}
                                      className="text-center"
                                    />
                                  </div>
                                </div>
                                <div className="flex gap-2">
                                  <Button variant="primary" size="sm" className="flex-1" onClick={() => handleEditSave(sets)}>Save all sets</Button>
                                  <Button variant="outline" size="sm" className="flex-1" onClick={() => setEditingId(null)}>Cancel</Button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
