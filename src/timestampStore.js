// src/timestampStore.js
import fs   from 'fs/promises';
import path from 'path';

const FILE = path.resolve(process.cwd(), 'lastRun.json');

export async function getLastRunTimestamp() {
  try {
    const raw = await fs.readFile(FILE, 'utf8');
    return JSON.parse(raw).ts;
  } catch {
    const now = Math.floor(Date.now()/1000);
    await saveLastRunTimestamp(now);
    return now;
  }
}

export async function saveLastRunTimestamp(ts) {
  await fs.writeFile(FILE, JSON.stringify({ ts }), 'utf8');
}
