import express from 'express';
import fs from 'fs';
import cors from 'cors';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(cors());
app.use(express.json());

const CSV_FILE = join(__dirname, 'workout_logs.csv');

// Columns: id,Date,Workout type,Name,set,rep,weight,rest
if (!fs.existsSync(CSV_FILE)) {
  fs.writeFileSync(CSV_FILE, 'id,Date,Workout type,Name,set,rep,weight,rest,hold_seconds\n');
}

const logToCSVLine = (log) => {
  return `${log.id},${log.date},${log.category},${log.exercise},${log.set || 1},${log.reps || 0},${log.weight},${log.rest},${log.hold_seconds || log.hold || 0}`;
};

const csvLineToLog = (line) => {
  const [id, date, category, exercise, set, repStr, weightStr, restStr, holdStr] = line.split(',');
  return {
    id,
    date,
    category,
    exercise,
    set: parseInt(set) || 1,
    reps: parseInt(repStr) || 0,
    weight: parseFloat(weightStr) || 0,
    rest: parseInt(restStr) || 0,
    hold_seconds: parseInt(holdStr) || 0
  };
};

app.get('/api/logs', (req, res) => {
  try {
    const data = fs.readFileSync(CSV_FILE, 'utf8');
    const lines = data.split('\n').filter(l => l.trim() && !l.startsWith('id,'));
    const logs = lines.map(csvLineToLog).reverse();
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: 'Failed to read logs' });
  }
});

app.post('/api/logs', (req, res) => {
  try {
    const log = req.body;
    const line = logToCSVLine(log);
    fs.appendFileSync(CSV_FILE, line + '\n');
    res.status(201).json(log);
  } catch (error) {
    res.status(500).json({ error: 'Failed to save log' });
  }
});

app.delete('/api/logs/:id', (req, res) => {
  try {
    const id = req.params.id;
    const data = fs.readFileSync(CSV_FILE, 'utf8');
    const lines = data.split('\n');
    const header = lines[0];
    const remaining = lines.slice(1).filter(l => {
      const trimmed = l.trim();
      if (!trimmed) return false;
      const [lineId] = trimmed.split(',');
      return lineId !== id;
    });
    fs.writeFileSync(CSV_FILE, [header, ...remaining, ''].join('\n'));
    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete log' });
  }
});

// Run with node server.js
app.listen(3001, () => console.log('Backend running on port 3001'));
