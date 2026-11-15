// One-off: adds `firstStatus` and `history` to records stored before those
// fields existed, rebuilding history from data/changes/*.jsonl.
import { readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const DATA = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', 'data');
const byTicket = new Map();
for (const f of (await readdir(path.join(DATA, 'changes'))).sort()) {
  for (const line of (await readFile(path.join(DATA, 'changes', f), 'utf8')).split('\n')) {
    if (!line.trim()) continue;
    const c = JSON.parse(line);
    if (!byTicket.has(c.ticket)) byTicket.set(c.ticket, []);
    byTicket.get(c.ticket).push(c);
  }
}
let touched = 0;
for (const f of (await readdir(path.join(DATA, 'incidents'))).filter((x) => x.endsWith('.json'))) {
  const file = path.join(DATA, 'incidents', f);
  const recs = JSON.parse(await readFile(file, 'utf8'));
  let dirty = false;
  for (const r of recs) {
    if (r.history && r.firstStatus) continue;
    const cs = byTicket.get(r.ticket) || [];
    const firstStatusChange = cs.find((c) => c.field === 'status');
    r.firstStatus = firstStatusChange ? firstStatusChange.from : r.status;
    const h = [];
    const groups = new Map();
    for (const c of cs) { if (!groups.has(c.at)) groups.set(c.at, []); groups.get(c.at).push(c); }
    for (const [at, list] of groups) {
      const fields = new Set(list.map((c) => c.field));
      if (fields.has('status') || fields.has('statusLabel')) {
        const st = list.find((c) => c.field === 'status')?.to ?? r.status;
        const lb = list.find((c) => c.field === 'statusLabel')?.to ?? r.statusLabel;
        h.push([at, 's', `${st}|${lb}`]);
      }
      if (fields.has('reply')) h.push([at, 'r']);
      if (fields.has('description') || fields.has('edited')) h.push([at, 'd']);
      if (fields.has('category')) h.push([at, 'c', list.find((c) => c.field === 'category').to]);
      const rem = list.find((c) => c.field === 'removed');
      if (rem) h.push([at, rem.to ? 'x' : 'u']);
    }
    r.history = h;
    dirty = true;
    touched++;
  }
  if (dirty) await writeFile(file, '[\n' + recs.map((x) => JSON.stringify(x)).join(',\n') + '\n]\n');
}
console.log(`migrated ${touched} records`);
