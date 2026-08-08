#!/usr/bin/env node
// Import a df-export.js snapshot back into Data Fabric.
//
//   node df-import.js <snapshotFile> [--entities Vendor,ScreeningList]
//
// Inserts records as NEW rows (Data Fabric assigns fresh Ids). Vendor.vendorId is
// unique — importing a snapshot on top of existing rows with the same references
// will fail those rows; export/clear first if you want a clean restore.
// Requires `uip login`.
const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const file = process.argv[2];
if (!file) {
  console.error('usage: node df-import.js <snapshotFile> [--entities A,B]');
  process.exit(1);
}
const only = (() => {
  const i = process.argv.indexOf('--entities');
  return i > -1 ? new Set(process.argv[i + 1].split(',')) : null;
})();

const snapshot = JSON.parse(fs.readFileSync(file, 'utf8'));
for (const [name, { id, records }] of Object.entries(snapshot.entities)) {
  if (only && !only.has(name)) continue;
  if (!records.length) {
    console.log(`${name}: nothing to import`);
    continue;
  }
  const tmp = path.join(os.tmpdir(), `df-import-${name}-${Date.now()}.json`);
  fs.writeFileSync(tmp, JSON.stringify(records));
  try {
    execFileSync('uip', ['df', 'records', 'insert', id, '-f', tmp, '--output', 'json'], {
      encoding: 'utf8',
      shell: process.platform === 'win32',
      stdio: ['ignore', 'pipe', 'inherit'],
    });
    console.log(`${name}: imported ${records.length} records`);
  } finally {
    fs.unlinkSync(tmp);
  }
}
console.log('done');
