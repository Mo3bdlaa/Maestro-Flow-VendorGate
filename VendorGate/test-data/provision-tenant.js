// Provision a fresh tenant with everything VendorGate needs in Data Fabric:
// three choice sets and three entities, matching the production schema exactly.
// Idempotent — existing choice sets and entities are left alone.
//
//   node test-data/provision-tenant.js --profile staging
//
// Prints the new entity and choice-set IDs at the end; feed those into
// migrate-ids.js to repoint the flow and the portal.
const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const profileArg = process.argv.indexOf('--profile');
const PROFILE = profileArg > -1 ? process.argv[profileArg + 1] : null;
const p = (args) => (PROFILE ? [...args, '--profile', PROFILE] : args);

function uip(args, { quiet = true } = {}) {
  const out = execFileSync('uip', p([...args, '--output', 'json']), { shell: true, encoding: 'utf8' });
  const i = out.indexOf('{');
  if (i < 0) throw new Error('no JSON in output: ' + out.slice(0, 200));
  const j = JSON.parse(out.slice(i));
  if (j.Result !== 'Success') throw new Error(JSON.stringify(j).slice(0, 300));
  if (!quiet) console.log(JSON.stringify(j.Data).slice(0, 200));
  return j.Data;
}

function withFile(obj, fn) {
  const f = path.join(os.tmpdir(), 'vg-prov-' + Math.random().toString(36).slice(2) + '.json');
  fs.writeFileSync(f, JSON.stringify(obj));
  try { return fn(f); } finally { fs.unlinkSync(f); }
}

// ---------------------------------------------------------------- choice sets
const CHOICE_SETS = {
  VendorStatus: ['submitted', 'extracting', 'action_required', 'screening', 'pending_approval', 'approved', 'rejected', 'provisioned', 'failed'],
  RiskTier: ['low', 'medium', 'high'],
  DocType: ['trade_licence', 'insurance', 'bank_letter', 'iso_cert'],
};

const existingSets = uip(['df', 'choice-sets', 'list']);
const setIds = {};
for (const [name, values] of Object.entries(CHOICE_SETS)) {
  const found = (Array.isArray(existingSets) ? existingSets : []).find((s) => s.Name === name);
  if (found) {
    setIds[name] = found.Id;
    console.log('choice set exists:', name, found.Id);
    continue;
  }
  const created = uip(['df', 'choice-sets', 'create', name, '--display-name', `"${name}"`]);
  setIds[name] = created.Id || created.id;
  console.log('choice set created:', name, setIds[name]);
  // Order matters — the numeric value the flow writes is the position in this list.
  for (const v of values) {
    uip(['df', 'choice-set-values', 'create', setIds[name], v, '--display-name', `"${v}"`]);
  }
  console.log('  values added:', values.join(', '));
}

// ------------------------------------------------------------------- entities
// Types and lengths mirror the production tenant exactly — read back with
// `uip df entities get <id>` there if this ever needs re-verifying.
const str = (n, len, opts = {}) => ({ fieldName: n, type: 'STRING', lengthLimit: len, isRequired: !!opts.required, isUnique: !!opts.unique });
const text = (n) => ({ fieldName: n, type: 'MULTILINE_TEXT', lengthLimit: 10000 });
const dec = (n) => ({ fieldName: n, type: 'DECIMAL', decimalPrecision: 2, minValue: 0, maxValue: 100 });
const bool = (n) => ({ fieldName: n, type: 'BOOLEAN' });
const dtz = (n) => ({ fieldName: n, type: 'DATETIME_WITH_TZ' });
const date = (n) => ({ fieldName: n, type: 'DATE' });
const choice = (n, setName) => ({ fieldName: n, type: 'CHOICE_SET_SINGLE', choiceSetId: setIds[setName] });
const file = (n) => ({ fieldName: n, type: 'FILE' });

const ENTITIES = {
  Vendor: [
    str('vendorId', 100, { required: true, unique: true }),
    str('legalName', 500, { required: true }),
    str('country', 100),
    choice('status', 'VendorStatus'), choice('riskTier', 'RiskTier'),
    dec('riskScore'),
    text('issues'), text('screeningResult'),
    dtz('submittedAt'), dtz('updatedAt'), dtz('queryDeadline'),
    str('contactEmail', 200),
  ],
  VendorDocument: [
    str('docId', 100, { required: true, unique: true }),
    str('vendorId', 100, { required: true }),
    choice('docType', 'DocType'),
    text('extractedFields'), date('expiryDate'), bool('valid'),
    str('issueNote', 1000), file('documentFile'),
  ],
  ScreeningList: [
    str('entityName', 200, { required: true }),
    str('listType', 200, { required: true }),
    str('country', 200), str('reason', 200),
  ],
};

const existingEntities = uip(['df', 'entities', 'list']);
const entityIds = {};
for (const [name, fields] of Object.entries(ENTITIES)) {
  const found = (Array.isArray(existingEntities) ? existingEntities : []).find((e) => e.Name === name);
  if (found) {
    entityIds[name] = found.Id;
    console.log('entity exists:', name, found.Id);
    continue;
  }
  const data = withFile({ displayName: name, description: `VendorGate ${name}`, fields }, (f) =>
    uip(['df', 'entities', 'create', name, '-f', f]));
  entityIds[name] = data.Id || data.id;
  console.log('entity created:', name, entityIds[name], `(${fields.length} fields)`);
}

console.log('\n--- IDs for migrate-ids.js ---');
console.log(JSON.stringify({ entities: entityIds, choiceSets: setIds }, null, 2));
