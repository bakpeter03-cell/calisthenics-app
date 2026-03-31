import { useWorkoutLogs } from '../hooks/useWorkoutLogs';
import { Card } from '../components/ui/Card';
import { useState, useMemo } from 'react';

// Summarize sets for one exercise
function summarizeSets(sets) {
  const repCounts = sets.map(s => s.reps || 0).filter(r => r > 0);
  const holdCounts = sets.map(s => s.hold_seconds || 0).filter(h => h > 0);
  const weights = sets.map(s => s.weight || 0);
  const uniqueWeights = [...new Set(weights)];

  const repsStr = repCounts.length === 0 ? null
    : Math.min(...repCounts) === Math.max(...repCounts)
      ? `${repCounts[0]} reps`
      : `${Math.min(...repCounts)}–${Math.max(...repCounts)} reps`;

  const holdStr = holdCounts.length === 0 ? null
    : Math.min(...holdCounts) === Math.max(...holdCounts)
      ? `${holdCounts[0]}s hold`
      : `${Math.min(...holdCounts)}–${Math.max(...holdCounts)}s hold`;

  const weightStr = uniqueWeights.every(w => w === 0) ? null
    : uniqueWeights.length === 1
      ? `+${uniqueWeights[0]} kg`
      : `+${Math.min(...uniqueWeights)}–${Math.max(...uniqueWeights)} kg`;

  return [repsStr, holdStr, weightStr].filter(Boolean).join(' · ');
}

export default function History() {
  const { logs, deleteLog } = useWorkoutLogs();
  const [expandedDates, setExpandedDates] = useState([]);

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

  const handleDeleteSession = (dayLogs) => {
    if (window.confirm("Are you sure you want to delete this entire session?")) {
      dayLogs.forEach(log => deleteLog(log.id));
    }
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
            
            // Sort by created_at ascending for the session
            const dayLogs = [...rawDayLogs].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
            
            const groupedByEx = dayLogs.reduce((acc, log) => {
              if (!acc[log.exercise]) acc[log.exercise] = [];
              acc[log.exercise].push(log);
              return acc;
            }, {});

            const catCounts = dayLogs.reduce((acc, log) => {
              const cat = log.category || 'WORKOUT';
              acc[cat] = (acc[cat] || 0) + 1;
              return acc;
            }, {});
            const uniqueCats = Object.keys(catCounts).sort((a,b) => catCounts[b] - catCounts[a]);
            const catLabel = uniqueCats.length > 0 ? uniqueCats.join(' + ').toUpperCase() : 'WORKOUT';
            
            const formattedDate = new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' });
            
            // Top exercise (exercise with most sets)
            const topExercise = Object.keys(groupedByEx).sort((a, b) => groupedByEx[b].length - groupedByEx[a].length)[0];

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
                      {dayLogs.length} sets · {topExercise}
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
                      {dayLogs.length} sets · {Object.keys(groupedByEx).length} exercises · {formattedDate}
                    </div>

                    <div className="flex flex-col">
                      {Object.keys(groupedByEx).map(ex => (
                        <div key={ex} style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '10px 0',
                          borderBottom: '0.5px solid var(--color-border-tertiary, #e0e3e5)'
                        }}>
                          <span style={{ fontSize: '14px', fontWeight: 500 }}>{ex}</span>
                          <span style={{ fontSize: '13px', color: 'var(--color-text-secondary, #73777f)' }}>
                            {groupedByEx[ex].length} sets · {summarizeSets(groupedByEx[ex])}
                          </span>
                        </div>
                      ))}
                    </div>

                    <button
                      onClick={() => handleDeleteSession(dayLogs)}
                      style={{
                        marginTop: '12px',
                        fontSize: '12px',
                        color: 'var(--color-text-danger, #ba1a1a)',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '4px 0'
                      }}
                    >
                      Delete session
                    </button>
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
