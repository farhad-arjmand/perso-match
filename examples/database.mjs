// Node.js 22.13+; SQLite support may emit an experimental warning on Node 22.
import {DatabaseSync} from 'node:sqlite';
import assert from 'node:assert/strict';
import {createMatcher} from '../dist/esm/index.js';
const matcher=createMatcher({locale:'fa'});
const db=new DatabaseSync(':memory:');
try {
  db.exec('CREATE TABLE contacts (id INTEGER PRIMARY KEY, display_name TEXT NOT NULL, search_key TEXT NOT NULL, profile TEXT NOT NULL); CREATE INDEX contacts_search ON contacts(profile, search_key);');
  const insert=db.prepare('INSERT INTO contacts VALUES (?, ?, ?, ?)');
  for(const [id,name] of [[1,'علي'],[2,'علی'],[3,'رضا']])insert.run(id,name,matcher.key(name),matcher.profile);
  const rows=db.prepare('SELECT id, display_name FROM contacts WHERE profile = ? AND search_key = ? ORDER BY id').all(matcher.profile,matcher.key('علي'));
  assert.deepEqual(rows.map(r=>r.id),[1,2]);
  assert.equal(rows[0].display_name,'علي');assert.equal(rows[1].display_name,'علی');
  const plan=db.prepare('EXPLAIN QUERY PLAN SELECT id FROM contacts WHERE profile = ? AND search_key = ?').all(matcher.profile,matcher.key('علی'));
  assert.ok(plan.some(row=>row.detail.includes('contacts_search')));
  console.log('SQLite indexed lookup: both spelling variants found; original names preserved.');
  console.log(rows);
  // Keep this index non-unique: equal search keys do not prove identical people.
} finally {db.close();}
