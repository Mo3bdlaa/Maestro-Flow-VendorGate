// Pre-demo preflight: the screening agent's connector tool file is rewritten by
// canvas sessions and agent CLI commands. The rewrite stringifies numeric
// parameters ("3" instead of 3), re-adds a private _sortFieldName parameter, and
// resets the pinned entity — each of which makes the agent fail at runtime with
// AGENT_RUNTIME.UNEXPECTED_ERROR.
//
// Run this before any demo or recording:
//    node test-data/preflight.js          check + repair local, then push to Studio Web
//    node test-data/preflight.js --check  check local only, change nothing
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const TOOL = path.join(
  ROOT, 'VendorClearance', '47e795d6-ca08-4c0d-b1a9-47071a08b775',
  'resources', '7c1a9e42-3d5f-4b8a-9e2c-6f0d8b3a5c71', 'resource.json',
);
const EXPECTED = { entityName: 'ScreeningList', start: 0, limit: 1000, expansionLevel: 3, isAscending: false };
const checkOnly = process.argv.includes('--check');

function readTool() {
  const raw = fs.readFileSync(TOOL);
  const hadBom = raw[0] === 0xef && raw[1] === 0xbb && raw[2] === 0xbf;
  return { json: JSON.parse(raw.toString('utf8').replace(/^﻿/, '')), hadBom };
}

function inspect(j, hadBom) {
  const problems = [];
  if (hadBom) problems.push('UTF-8 BOM present (runtime silently drops every tool)');
  const params = j.properties.parameters || [];
  if (JSON.stringify(j).includes('_sortFieldName')) problems.push('_sortFieldName parameter present (crashes the agent runtime)');
  for (const [name, want] of Object.entries(EXPECTED)) {
    const p = params.find((x) => x.name === name);
    if (!p) { problems.push(`parameter "${name}" is missing`); continue; }
    if (p.fieldVariant !== 'static') problems.push(`"${name}" is ${p.fieldVariant}, must be static`);
    if (p.value !== want) problems.push(`"${name}" is ${JSON.stringify(p.value)} (${typeof p.value}), must be ${JSON.stringify(want)} (${typeof want})`);
  }
  const q = params.find((x) => x.name === 'queryExpression');
  if (q && q.fieldVariant !== 'dynamic') problems.push('"queryExpression" must stay dynamic so the agent can supply it');
  return problems;
}

function repair(j) {
  const params = j.properties.parameters || [];
  j.properties.parameters = params.filter((p) => !p.name.startsWith('_'));
  if (j.inputSchema && j.inputSchema.properties) {
    for (const k of Object.keys(j.inputSchema.properties)) if (k.startsWith('_')) delete j.inputSchema.properties[k];
  }
  for (const [name, want] of Object.entries(EXPECTED)) {
    const p = j.properties.parameters.find((x) => x.name === name);
    if (!p) continue;
    p.fieldVariant = 'static';
    p.dynamic = false;
    p.value = want;
  }
  return j;
}

const wasReadOnly = (() => {
  try { return execFileSync('attrib', [TOOL], { encoding: 'utf8' }).includes(' R '); } catch { return false; }
})();

let { json, hadBom } = readTool();
let problems = inspect(json, hadBom);

if (problems.length === 0) {
  console.log('local tool file: OK');
} else {
  console.log('local tool file: ' + problems.length + ' problem(s)');
  problems.forEach((p) => console.log('  - ' + p));
  if (checkOnly) process.exit(1);
  if (wasReadOnly) execFileSync('attrib', ['-R', TOOL]);
  fs.writeFileSync(TOOL, JSON.stringify(repair(json), null, 2), { encoding: 'utf8' });
  execFileSync('attrib', ['+R', TOOL]);
  const after = readTool();
  const left = inspect(after.json, after.hadBom);
  console.log(left.length ? 'REPAIR INCOMPLETE: ' + left.join('; ') : 'repaired and re-locked read-only');
  if (left.length) process.exit(1);
}

if (checkOnly) process.exit(0);

console.log('pushing to Studio Web...');
execFileSync('uip', ['solution', 'upload', '.', '--force', '--output', 'json'], { cwd: ROOT, shell: true, encoding: 'utf8' });

// Read the cloud copy back — the canvas is what actually executes a canvas run.
const tmp = path.join(require('os').tmpdir(), 'vg-preflight-' + Date.now());
fs.mkdirSync(tmp, { recursive: true });
execFileSync('uip', ['solution', 'download', '3e054f21-d53a-4f5f-9823-08def396904e', '-d', tmp, '-n', 'verify', '--extract', '--output', 'json'], { shell: true, encoding: 'utf8' });

let cloudTool = null;
(function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p);
    else if (e.name === 'resource.json' && p.includes('7c1a9e42')) cloudTool = p;
  }
})(tmp);

if (!cloudTool) {
  console.log('CLOUD: tool file not found in the downloaded solution');
  process.exit(1);
}
const cloud = JSON.parse(fs.readFileSync(cloudTool, 'utf8'));
const cloudProblems = inspect(cloud, false);
console.log(cloudProblems.length ? 'CLOUD: NOT READY\n  ' + cloudProblems.join('\n  ') : 'CLOUD: OK — canvas runs will use a valid tool file');
fs.rmSync(tmp, { recursive: true, force: true });
process.exit(cloudProblems.length ? 1 : 0);
