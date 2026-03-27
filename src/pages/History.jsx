import { useWorkoutLogs } from '../hooks/useWorkoutLogs';
import { Card } from '../components/ui/Card';
import { useState } from 'react';

export default function History() {
  const { logs, deleteLog } = useWorkoutLogs();
  const [expandedDates, setExpandedDates] = useState([]);

  const toggleDate = (date) => {
    setExpandedDates(prev => prev.includes(date) ? prev.filter(d => d !== date) : [...prev, date]);
  };

  const groupedByDate = logs.reduce((acc, log) => {
    if (!acc[log.date]) acc[log.date] = [];
    acc[log.date].push(log);
    return acc;
  }, {});

  const dates = Object.keys(groupedByDate).sort((a,b) => new Date(b) - new Date(a));

  return (
    <div className="space-y-6">
      <h2 className="font-headline text-3xl font-black text-on-surface tracking-tighter mb-8">Training Log</h2>
      
      {dates.length === 0 ? (
        <p className="text-center text-on-surface-variant font-medium mt-12 block py-8">No workouts logged yet.</p>
      ) : (
        <div className="space-y-4">
          {dates.map(dateStr => {
            const isExpanded = expandedDates.includes(dateStr);
            const dayLogs = groupedByDate[dateStr];
            
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
            
            let displayDate = dateStr;
            try {
              const dObj = new Date(dateStr);
              if (!isNaN(dObj.getTime())) {
                const day = String(dObj.getDate()).padStart(2, '0');
                const month = String(dObj.getMonth() + 1).padStart(2, '0');
                const year = dObj.getFullYear();
                displayDate = `${day}/${month}/${year}`;
              }
            } catch (e) {
              console.error("Date parsing error in History", e);
            }
            const headerLabel = `${catLabel} - ${displayDate}`;

            return (
              <Card key={dateStr} className="overflow-hidden p-0 border border-outline-variant/20 shadow-sm transition-all duration-300 hover:shadow-md">
                <button 
                  onClick={() => toggleDate(dateStr)}
                  className="w-full flex justify-between items-center p-5 bg-surface text-left"
                >
                  <div>
                    <h3 className="font-headline text-xl font-black text-on-surface tracking-tight uppercase">{headerLabel}</h3>
                    <p className="font-label text-xs font-bold text-primary uppercase tracking-widest mt-1">
                      {dayLogs.length} Sets Total
                    </p>
                  </div>
                  <span className={`material-symbols-outlined text-on-surface-variant transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
                    expand_more
                  </span>
                </button>
                
                {isExpanded && (
                  <div className="px-3 md:px-5 pb-5 pt-4 space-y-8 border-t border-outline-variant/10 bg-surface-container-lowest">
                    {Object.keys(groupedByEx).map(ex => (
                      <div key={ex} className="space-y-3">
                        <h4 className="font-black text-[16px] text-primary flex items-center gap-2 uppercase tracking-wide px-2">
                          <span className="material-symbols-outlined text-[20px] font-bold">bolt</span>
                          {ex}
                        </h4>
                        <div className="flex flex-col space-y-2">
                          {[...groupedByEx[ex]].reverse().map((log, listIdx) => (
                            <div key={log.id} className="flex justify-between items-center py-3 px-4 bg-white dark:bg-surface-container-low rounded-xl border border-surface-variant/40 group hover:border-secondary/40 transition-colors shadow-sm">
                              {/* SET */}
                              <div className="w-20 text-left">
                                <span className="font-black text-[20px] text-primary tracking-tight uppercase">
                                  SET {listIdx + 1}
                                </span>
                              </div>
                              
                              {/* REPS */}
                              <div className="flex-1 text-center flex flex-col items-center justify-center">
                                <span className="font-black text-[20px] text-on-surface leading-none block mb-0.5">
                                  {log.reps || 0}
                                </span>
                                <span className="text-[9px] font-black text-on-surface-variant tracking-widest uppercase">
                                  REPS
                                </span>
                              </div>

                              {/* HOLD */}
                              <div className="flex-1 text-center flex flex-col items-center justify-center">
                                <span className="font-black text-[20px] text-on-surface leading-none block mb-0.5">
                                  {`${log.hold_seconds || 0}s`}
                                </span>
                                <span className="text-[9px] font-black text-on-surface-variant tracking-widest uppercase">
                                  HOLD
                                </span>
                              </div>

                              {/* WEIGHT */}
                              <div className="flex-1 text-center flex flex-col items-center">
                                {log.weight > 0 ? (
                                  <span className="font-black text-[20px] text-on-surface leading-none block mb-0.5">+{log.weight}<span className="text-[10px] text-on-surface-variant ml-0.5">KG</span></span>
                                ) : (
                                  <span className="font-black text-[14px] text-on-surface-variant/60 uppercase block pt-1 mb-0.5">BW</span>
                                )}
                                <span className="text-[9px] font-black text-on-surface-variant tracking-widest uppercase mt-0.5">
                                  WEIGHT
                                </span>
                              </div>

                              {/* DELETE */}
                              <div className="w-8 flex justify-end">
                                <button onClick={(e) => { e.stopPropagation(); deleteLog(log.id); }} className="text-outline-variant hover:text-error transition-colors p-1.5 rounded-lg hover:bg-surface-container-highest">
                                  <span className="material-symbols-outlined text-[18px]">delete</span>
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
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
