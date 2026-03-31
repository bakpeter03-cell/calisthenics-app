import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const env = fs.readFileSync('.env', 'utf8')
const envMap = Object.fromEntries(env.split('\n').filter(l => l.includes('=')).map(l => l.split('=')))

const supabase = createClient(envMap.VITE_SUPABASE_URL, envMap.VITE_SUPABASE_ANON_KEY)

async function checkDiscrepancies() {
  const { data, error } = await supabase.from('workout_logs').select('exercise, profile_name, user_id')
  if (error) {
    console.error(error)
    return
  }

  const exerciseCount = {}
  data.forEach(l => { exerciseCount[l.exercise] = (exerciseCount[l.exercise] || 0) + 1 })
  const profiles = [...new Set(data.map(l => l.profile_name))]
  const userIds = [...new Set(data.map(l => l.user_id))]

  console.log('--- Exercise Discrepancies ---')
  console.log(exerciseCount)
  console.log('\n--- Profile Discrepancies ---')
  console.log(profiles)
  console.log('\n--- User ID Discrepancies ---')
  console.log(userIds)
}

checkDiscrepancies()
