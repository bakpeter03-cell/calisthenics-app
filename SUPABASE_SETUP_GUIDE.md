# 🚀 Final Step-by-Step Sync Guide (Corrected)

Follow these steps in order to see your data on your phone.

---

## Part 1: On your Computer 💻
First, we need to upload your history to the cloud.

1.  **Stop/Restart your App**: In your terminal, stop the current process (Ctrl+C) and run `npm run dev` again to make sure it sees the new `.env` file I created.
2.  **Open the App**: Go to [http://localhost:5173](http://localhost:5173).
3.  **Find the Sync Button**: On the **Dashboard**, you will see a new card at the top called **"Data Migration"**.
4.  **Click it**: Click the **"Sync Local Data to Cloud"** button.
    - If it says "Successfully migrated", your data is now in the cloud! ✅

---

## Part 2: In Vercel (Mobile Support) 📱
Vercel needs to know how to connect to your database.

1.  **Open Vercel**: Go to [vercel.com](https://vercel.com) and click on your project.
2.  **Settings**: Click the **"Settings"** tab at the top.
3.  **Environment Variables**: Click **"Environment Variables"** in the left sidebar.
4.  **Add Variable 1**:
    - **Key**: `VITE_SUPABASE_URL`
    - **Value**: `https://wgkhjngavtjtvzknatco.supabase.co`
    - Click **"Save"**.
5.  **Add Variable 2**:
    - **Key**: `VITE_SUPABASE_ANON_KEY`
    - **Value**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indna2hqbmdhdnRqdHZ6a25hdGNvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2MTAxNDQsImV4cCI6MjA5MDE4NjE0NH0.CxuLhvjEEbB7124qIkGchxXGT4tZHnqpPs4185IJXLw`
    - Click **"Save"**.
6.  **Redeploy**:
    - Click the **"Deployments"** tab at the top.
    - Click the three dots `...` next to your latest deployment.
    - Select **"Redeploy"** and click **"Redeploy"** again to confirm.

---

## Part 3: Fixing the SQL Error (If the table is missing)
If you got an error before, please copy and run this **corrected** code in the Supabase SQL Editor:

```sql
CREATE TABLE workout_logs (
  id BIGINT PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  date DATE NOT NULL,
  exercise TEXT NOT NULL,
  category TEXT,
  weight FLOAT DEFAULT 0,
  reps INTEGER DEFAULT 0,
  hold_seconds INTEGER DEFAULT 0,
  rest INTEGER DEFAULT 0,
  profile_name TEXT DEFAULT 'Guest'
);
alter table workout_logs disable row level security;
```
