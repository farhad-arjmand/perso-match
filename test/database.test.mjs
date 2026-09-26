import {test} from 'node:test';
import {execFileSync} from 'node:child_process';
test('SQLite uses the search-key index and preserves original records',{skip:Number(process.versions.node.split('.')[0])<22},()=>{execFileSync(process.execPath,['examples/database.mjs'],{stdio:'pipe'});});
