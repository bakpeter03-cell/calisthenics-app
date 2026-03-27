import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CSV_FILE = join(__dirname, 'workout_logs.csv');

function fixCsv() {
  if (!fs.existsSync(CSV_FILE)) return;
  const content = fs.readFileSync(CSV_FILE, 'utf8');
  const lines = content.split('\n');
  const header = lines[0];
  const newLines = lines.slice(1).map(line => {
    if (!line.trim()) return '';
    const parts = line.split(',');
    if (parts.length < 2) return line;
    
    let dateStr = parts[1];
    try {
      const d = new Date(dateStr);
      if (!isNaN(d.getTime())) {
        dateStr = d.toISOString().split('T')[0];
      }
    } catch (e) {}
    
    parts[1] = dateStr;
    return parts.join(',');
  }).filter(l => l);

  fs.writeFileSync(CSV_FILE, [header, ...newLines, ''].join('\n'));
}

fixCsv();
console.log("CSV Date Normalization Complete.");
