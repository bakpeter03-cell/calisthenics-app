import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://wgkhjngavtjtvzknatco.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indna2hqbmdhdnRqdHZ6a25hdGNvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2MTAxNDQsImV4cCI6MjA5MDE4NjE0NH0.CxuLhvjEEbB7124qIkGchxXGT4tZHnqpPs4185IJXLw'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

console.log("Checking logs...")
const { count, data, error } = await supabase
  .from('workout_logs')
  .select('*', { count: 'exact' })

if (error) {
  console.error("Error:", error)
} else {
  console.log("Total rows in workout_logs:", count)
  if (data && data.length > 0) {
    console.log("Unique profiles:", [...new Set(data.map(l => l.profile_name))])
    console.log("Unique User IDs:", [...new Set(data.map(l => l.user_id))])
    data.slice(0, 3).forEach(l => console.log(l))
  } else {
    console.log("TABLE IS EMPTY")
  }
}
process.exit(0)
