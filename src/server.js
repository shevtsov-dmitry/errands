import express from 'express';
import cors from 'cors';
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Initialize SQLite
const db = new Database('errands.db');
db.exec(`
  CREATE TABLE IF NOT EXISTS errands (
    id TEXT PRIMARY KEY,
    text TEXT NOT NULL,
    position INTEGER NOT NULL,
    completed BOOLEAN DEFAULT 0
  )
`);

// API Endpoints
app.get('/api/errands', (req, res) => {
  const errands = db.prepare('SELECT * FROM errands ORDER BY position ASC').all();
  res.json(errands.map(e => ({ ...e, completed: !!e.completed })));
});

app.post('/api/errands', (req, res) => {
  const { id, text, position } = req.body;
  db.prepare('INSERT INTO errands (id, text, position, completed) VALUES (?, ?, ?, 0)').run(id, text, position);
  res.json({ success: true });
});

app.put('/api/errands/reorder', (req, res) => {
  const { items } = req.body; // Array of { id, position }
  const stmt = db.prepare('UPDATE errands SET position = ? WHERE id = ?');
  const transaction = db.transaction((items) => {
    for (const item of items) stmt.run(item.position, item.id);
  });
  transaction(items);
  res.json({ success: true });
});

app.delete('/api/errands/:id', (req, res) => {
  db.prepare('DELETE FROM errands WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// Serve Frontend in Production
app.use(express.static(path.join(__dirname, 'dist')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
