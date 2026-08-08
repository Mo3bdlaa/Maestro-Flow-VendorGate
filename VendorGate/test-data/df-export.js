#!/usr/bin/env node
// Export all VendorGate Data Fabric entities to a portable JSON snapshot.
//
//   node df-export.js [outFile]        (default: snapshot-<date>.json)
//
// Requires `uip login`. Uses the uip CLI, so it works anywhere the CLI does.
const { execFileSync } = require('child_process');
const fs = require('fs');

const ENTITIES = {
  Vendor: '7d12060c-3d93-f111-9b33-6045bdd6d6ea',
  VendorDocument: '9312060c-3d93-f111-9b33-6045bdd6d6ea',
  ScreeningList: 'b312060c-3d93-f111-9b33-6045bdd6d6ea',
};

// DF audit columns — server-managed, never importable.
const AUDIT = new Set(['Id', 'CreateTime', 'UpdateTime', 'CreatedBy', 'UpdatedBy', 'RecordOwner']);

function lowerFirst(s) {
  return s.charAt(0).toLowerCase() + s.slice(1);
}

function exportEntity(id) {
  const raw = execFileSync(
    'uip',
    ['df', 'records', 'list', id, '--limit', '1000', '--output', 'json'],
    { encoding: 'utf8', shell: process.platform === 'win32' },
  );
  const items = JSON.parse(raw).Data.Items || [];
  // Strip audit fields and normalise to the camelCase the insert API expects.
  return items.map((r) => {
    const out = {};
    for (const [k, v] of Object.entries(r)) {
      if (AUDIT.has(k)) continue;
      out[lowerFirst(k)] = v;
    }
    return out;
  });
}

const outFile = process.argv[2] || `snapshot-${new Date().toISOString().slice(0, 10)}.json`;
const snapshot = { exportedAt: new Date().toISOString(), entities: {} };
for (const [name, id] of Object.entries(ENTITIES)) {
  snapshot.entities[name] = { id, records: exportEntity(id) };
  console.log(`${name}: ${snapshot.entities[name].records.length} records`);
}
fs.writeFileSync(outFile, JSON.stringify(snapshot, null, 2));
console.log('written:', outFile);
