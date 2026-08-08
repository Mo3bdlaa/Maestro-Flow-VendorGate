// Repoint the whole solution at a different tenant.
//
// Everything tenant-specific in VendorGate is a GUID or an org/tenant name, and
// they all appear as plain text in the flow, its bindings, the agent tool files
// and the portal config. This rewrites every one of them in a single pass.
//
//   node test-data/migrate-ids.js test-data/tenants/staging.json
//   node test-data/migrate-ids.js test-data/tenants/staging.json --dry-run
//
// The map file is {from: to} plus an optional `text` block for non-GUID strings
// (org name, tenant name, API base URL). Write the reverse map to migrate back.
const fs = require('fs');
const path = require('path');

const mapPath = process.argv[2];
const dryRun = process.argv.includes('--dry-run');
if (!mapPath) throw new Error('usage: migrate-ids.js <map.json> [--dry-run]');

const map = JSON.parse(fs.readFileSync(mapPath, 'utf8'));
const pairs = Object.entries({ ...(map.ids || {}), ...(map.text || {}) })
  .filter(([from, to]) => from && to && from !== to);
if (!pairs.length) throw new Error('map contains no substitutions');

const ROOT = path.resolve(__dirname, '..');
const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', '.uipath', 'out', '.agent-builder']);
const EXT = new Set(['.json', '.flow', '.ts', '.tsx', '.js', '.uipx', '.md', '.bpmn', '.html']);

// Read-only guards protect the flow and the screening tool file from the
// Studio Web regenerator; drop and restore them around the rewrite.
const { execFileSync } = require('child_process');
const unlocked = [];
function setReadOnly(file, on) {
  try { execFileSync('attrib', [on ? '+R' : '-R', file], { encoding: 'utf8' }); } catch { /* not on Windows */ }
}

const hits = [];
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { walk(p); continue; }
    if (!EXT.has(path.extname(e.name))) continue;
    const orig = fs.readFileSync(p, 'utf8');
    let next = orig;
    const applied = [];
    for (const [from, to] of pairs) {
      if (next.includes(from)) {
        const n = next.split(from).length - 1;
        next = next.split(from).join(to);
        applied.push(`${from.slice(0, 8)}…×${n}`);
      }
    }
    if (next === orig) continue;
    hits.push({ file: path.relative(ROOT, p), applied });
    if (dryRun) continue;
    let wasRO = false;
    try { wasRO = execFileSync('attrib', [p], { encoding: 'utf8' }).includes(' R '); } catch { /* ignore */ }
    if (wasRO) { setReadOnly(p, false); unlocked.push(p); }
    fs.writeFileSync(p, next);
  }
})(ROOT);

for (const f of unlocked) setReadOnly(f, true);

console.log((dryRun ? 'WOULD REWRITE ' : 'rewrote ') + hits.length + ' file(s)');
for (const h of hits) console.log('  ' + h.file + '  [' + h.applied.join(', ') + ']');
if (unlocked.length) console.log('re-locked read-only:', unlocked.length);
