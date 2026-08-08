// Copy the ScreeningList register (real OFAC SDN rows plus the synthetic demo
// rows the test vendors match against) from one tenant to another.
//
//   node test-data/copy-screening-list.js <sourceEntityId> <targetEntityId> --to-profile staging
//
// Source reads use the default profile; target writes use --to-profile.
const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const [srcEntity, dstEntity] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const i = process.argv.indexOf('--to-profile');
const TO = i > -1 ? process.argv[i + 1] : null;
if (!srcEntity || !dstEntity) throw new Error('usage: copy-screening-list.js <sourceEntityId> <targetEntityId> [--to-profile <name>]');

function run(args, profile) {
  const full = profile ? [...args, '--profile', profile] : args;
  const out = execFileSync('uip', [...full, '--output', 'json'], { shell: true, encoding: 'utf8' });
  const b = out.indexOf('{');
  return JSON.parse(out.slice(b));
}

const src = run(['df', 'records', 'list', srcEntity], null);
const rows = (src.Data && src.Data.Items) || [];
console.log('source rows:', rows.length);

// Audit columns are server-owned; only the business fields travel.
const clean = rows.map((r) => ({
  entityName: r.EntityName ?? r.entityName ?? '',
  listType: r.ListType ?? r.listType ?? '',
  country: r.Country ?? r.country ?? '',
  reason: r.Reason ?? r.reason ?? '',
})).filter((r) => r.entityName);

let ok = 0;
for (const row of clean) {
  const tmp = path.join(os.tmpdir(), 'vg-sl-' + Math.random().toString(36).slice(2) + '.json');
  fs.writeFileSync(tmp, JSON.stringify(row));
  try {
    run(['df', 'records', 'insert', dstEntity, '-f', tmp], TO);
    ok++;
  } catch (e) {
    console.log('  failed:', row.entityName, String(e.message || e).slice(0, 120));
  } finally {
    fs.unlinkSync(tmp);
  }
}
console.log('inserted into target:', ok, '/', clean.length);
