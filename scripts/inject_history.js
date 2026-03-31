import { createClient } from '@supabase/supabase-js';
import crypto from 'node:crypto';

const supabaseUrl = 'https://wgkhjngavtjtvzknatco.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indna2hqbmdhdnRqdHZ6a25hdGNvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2MTAxNDQsImV4cCI6MjA5MDE4NjE0NH0.CxuLhvjEEbB7124qIkGchxXGT4tZHnqpPs4185IJXLw';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const RawData = [
  { date: '2026-03-17', entries: [
    { sets: 5, reps: 7, weight: 12, ex: 'Pull-up', cat: 'Pull' },
    { sets: 3, reps: 3, weight: 0, ex: 'Advanced Tucked Front Lever Raise', cat: 'Pull' },
    { sets: 4, reps: 8, weight: 12, ex: 'Row', cat: 'Pull' },
    { sets: 2, reps: 3, weight: 0, ex: 'L-sit pull-up', cat: 'Pull' },
  ]},
  { date: '2026-03-18', entries: [
    { sets: 4, reps: 8, weight: 16, ex: 'Decline Push-up', cat: 'Push' },
    { sets: 4, reps: 8, weight: 16, ex: 'Dip', cat: 'Push' },
    { sets: 3, reps: 8, weight: 0, ex: 'Elevated Pike Pushup', cat: 'Push' },
    { sets: 2, reps: 5, weight: 0, ex: 'Dragon Flag', cat: 'Core' },
  ]},
  { date: '2026-03-22', entries: [
    { sets: 5, reps: 8, weight: 16, ex: 'Decline Push-up', cat: 'Push' },
    { sets: 5, reps: 6, weight: 16, ex: 'Incline Push-up', cat: 'Push' },
    { sets: 5, reps: 6, weight: 16, ex: 'Dip', cat: 'Push' },
    { sets: 2, reps: 8, weight: 0, ex: 'Push-up', cat: 'Push' },
    { sets: 3, reps: 4, weight: 0, ex: 'Dragon Flag', cat: 'Core' },
    { sets: 4, reps: 12, weight: 0, ex: 'Knee Raise', cat: 'Core' },
  ]},
  { date: '2026-03-23', entries: [
    { sets: 5, reps: 7, weight: 16, ex: 'Pull-up', cat: 'Pull' },
    { sets: 5, reps: 8, weight: 16, ex: 'Row', cat: 'Pull' },
    { sets: 3, reps: 8, weight: 0, ex: 'Chin-up', cat: 'Pull' },
  ]},
  { date: '2026-03-25', entries: [
    { sets: 5, reps: 8, weight: 16, ex: 'Decline Push-up', cat: 'Push' },
    { sets: 5, reps: 6, weight: 16, ex: 'Dip', cat: 'Push' },
    { sets: 5, reps: 8, weight: 16, ex: 'Incline Push-up', cat: 'Push' },
    { sets: 2, reps: 8, weight: 0, ex: 'Push-up', cat: 'Push' },
    { sets: 3, reps: 4, weight: 0, ex: 'Dragon Flag', cat: 'Core' },
    { sets: 4, reps: 10, weight: 0, ex: 'Knee Raise', cat: 'Core' },
    { sets: 2, reps: 5, weight: 0, ex: 'Toes-to-bar', cat: 'Core' },
  ]},
  { date: '2026-03-27', entries: [
    { sets: 4, reps: 8, weight: 16, ex: 'Pull-up', cat: 'Pull' },
    { sets: 3, reps: 5, weight: 0, ex: 'Advanced Tucked Front Lever Raise', cat: 'Pull' },
    { sets: 1, reps: 3, weight: 0, ex: 'One-leg Front Lever Raise', cat: 'Pull' },
    { sets: 4, reps: 10, weight: 16, ex: 'Row', cat: 'Pull' },
    { sets: 4, reps: 4, weight: 0, ex: 'L-sit pull-up', cat: 'Pull' },
    { sets: 4, reps: 6, weight: 0, ex: 'Chin-up', cat: 'Pull' },
  ]}
];

async function sync() {
  const profileName = 'Guest';
  const dates = RawData.map(d => d.date);

  console.log(`Cleaning up existing logs for Guest on ${dates.join(', ')}...`);
  const { error: delErr } = await supabase
    .from('workout_logs')
    .delete()
    .eq('profile_name', profileName)
    .in('date', dates);

  if (delErr) {
    console.error('Delete error:', delErr);
    return;
  }

  const logsToInsert = [];
  RawData.forEach(day => {
    day.entries.forEach(entry => {
      for (let i = 0; i < entry.sets; i++) {
        logsToInsert.push({
          id: crypto.randomUUID(),
          date: day.date,
          exercise: entry.ex,
          category: entry.cat,
          reps: entry.reps,
          weight: entry.weight,
          hold_seconds: 0,
          rest: 150, // Default rest
          profile_name: profileName
        });
      }
    });
  });

  console.log(`Inserting ${logsToInsert.length} sets...`);
  const { error: insErr } = await supabase
    .from('workout_logs')
    .insert(logsToInsert);

  if (insErr) {
    console.error('Insert error:', insErr);
  } else {
    console.log('Sync complete!');
  }
}

sync();
