import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const env = fs.readFileSync('.env', 'utf8')
const envMap = Object.fromEntries(env.split('\n').filter(l => l.includes('=')).map(l => l.split('=')))

const supabase = createClient(envMap.VITE_SUPABASE_URL, envMap.VITE_SUPABASE_ANON_KEY)

// Normalization Map (Legacy -> Canonical)
const MAPPING = {
  'pull-up': 'Pull-up',
  'pullups': 'Pull-up',
  'pull-ups': 'Pull-up',
  'chinups': 'Chin-up',
  'chin-up': 'Chin-up',
  'knee raise': 'Knee Raise',
  'knee raises': 'Knee Raise',
  'dragon flag': 'Dragon Flag',
  'toes-to-bar': 'Toes-to-bar',
  'toestobar': 'Toes-to-bar',
  'dip': 'Dip',
  'dips': 'Dip',
  'row': 'Row',
  'rows': 'Row',
  'push-up': 'Push-up',
  'pushups': 'Push-up',
  'push-ups': 'Push-up',
  'decline push-up': 'Decline Push-up',
  'incline push-up': 'Incline Push-up',
  'advanced tucked front lever raise': 'Advanced Tucked Front Lever Raise'
}

async function cleanData() {
  console.log('🚀 Starting Data Normalization...')

  const { data: logs, error } = await supabase.from('workout_logs').select('id, exercise')
  if (error) {
    console.error('Fetch error:', error)
    return
  }

  let updateCount = 0
  for (const log of logs) {
    const original = log.exercise?.toLowerCase().trim()
    const target = MAPPING[original]

    if (target && log.exercise !== target) {
      console.log(`Fixing Log [${log.id}]: "${log.exercise}" -> "${target}"`)
      const { error: upErr } = await supabase
        .from('workout_logs')
        .update({ exercise: target })
        .eq('id', log.id)
      
      if (upErr) console.error(`Error updating log ${log.id}:`, upErr)
      else updateCount++
    }
  }

  console.log(`\n✅ Normalization complete! ${updateCount} logs updated.`)
}

cleanData()
