// Deployment-target remap: point every connection reference in the PACKAGED
// artifact at the connections living in the deployment folder (VendorGate Run),
// then dedupe the packager's case-duplicated bindings_v2 rows.
// Local sources stay bound to Vendor Gate for canvas debug.
// Usage: node patch-package2.js <extracted-solution-dir>
const fs = require('fs');
const path = require('path');
const root = process.argv[2];

const MAP = {
  // DF activity connection: Vendor Gate -> VendorGate Run
  '0c89d875-23ba-425a-af78-801786c50537': '7ab4be89-9b69-474d-b123-0a1efd597341',
  // GenAI/airdk connection: ACME Project -> VendorGate Run
  '87fce6c9-d681-4f42-b246-ca0959034a22': 'e8dbdd2a-5fa7-48dc-934b-bc22ecefacb1',
  // folder keys: Vendor Gate + ACME Project -> VendorGate Run
  'f919e064-57e8-4d56-9a55-c92796fb53c1': '1ec1d1ab-7f34-4c16-832d-3d3828f27fc4',
  'f919e064-57e8-4d56-9a55-c92796fb53c1': '1ec1d1ab-7f34-4c16-832d-3d3828f27fc4',
  // rename trigger -> new trigger-resource hash -> installer creates a FRESH
  // IS registration (the old one was destroyed by the 1.2.0 upgrade; enable 404s)
  'Vendor Submitted (Portal - Data Fabric)': 'Vendor Submitted via Portal (Data Fabric)',
};

function remapText(s) {
  for (const [from, to] of Object.entries(MAP)) s = s.split(from).join(to);
  return s;
}

function walk(dir, fn) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, fn);
    else fn(p);
  }
}

// --- 1. remap every text file in the extracted nupkg (<root>/_npk)
let remapped = 0;
walk(path.join(root, '_npk'), (p) => {
  if (!/\.(json|flow|bpmn|nuspec|xml)$/i.test(p)) return;
  const orig = fs.readFileSync(p, 'utf8');
  const next = remapText(orig);
  if (next !== orig) {
    fs.writeFileSync(p, next);
    remapped++;
  }
});
console.log('nupkg files remapped:', remapped);

// --- 2. dedupe bindings_v2 rows (packager emits lowercase+capital duplicates)
const bPath = path.join(root, '_npk', 'content', 'bindings_v2.json');
const b = JSON.parse(fs.readFileSync(bPath, 'utf8'));
const seen = new Set();
b.resources = b.resources.filter((r) => {
  const k = r.resource.toLowerCase() + '|' + r.key;
  if (seen.has(k)) return false;
  seen.add(k);
  return true;
});
b.resources.forEach((r) => { if (r.resource === 'connection') r.resource = 'Connection'; });
// trigger must run on its OWN connection or the installer dict-crashes on the
// duplicate (Connection, id) pair with the activity connection
const TRIG_CONN = '2e6b6652-3d79-47dc-b719-2c65bc32d10d';
const et = b.resources.find((r) => r.resource === 'EventTrigger');
if (et) {
  et.key = TRIG_CONN + '_start';
  et.id = 'EventTrigger' + TRIG_CONN + '_start';
  if (et.value && et.value.ConnectionId) et.value.ConnectionId.defaultValue = TRIG_CONN;
}
fs.writeFileSync(bPath, JSON.stringify(b, null, 2));
console.log('nupkg bindings_v2:', b.resources.map((r) => r.resource + '::' + r.key.slice(0, 12)).join(' | '));

// --- 3. solution manifest: remap + dedupe deps + ensure both activity connections
const pPath = path.join(root, 'resources', 'solution_folder', 'process', 'flow', 'VendorClearance.json');
let p = JSON.parse(remapText(fs.readFileSync(pPath, 'utf8')));
const seen2 = new Set();
p.resource.runtimeDependencies = p.resource.runtimeDependencies.filter((d) => {
  const cid = d.bindingValues && d.bindingValues.connectionId ? d.bindingValues.connectionId.defaultValue : d.bindingKey;
  const k = d.bindingType.toLowerCase() + '|' + cid;
  if (seen2.has(k)) return false;
  seen2.add(k);
  return true;
});
const have = (cid) =>
  p.resource.runtimeDependencies.some(
    (d) => d.bindingType === 'connection' && d.bindingValues.connectionId.defaultValue === cid,
  );
const RUN_FOLDER = '1ec1d1ab-7f34-4c16-832d-3d3828f27fc4';
if (!have('7ab4be89-9b69-474d-b123-0a1efd597341')) {
  p.resource.runtimeDependencies.unshift({
    bindingType: 'connection',
    bindingKey: '7ab4be89-9b69-474d-b123-0a1efd597341',
    bindingValues: { connectionId: { defaultValue: '7ab4be89-9b69-474d-b123-0a1efd597341' } },
    bindingMetadata: { activityName: 'Sanctions & Debarment Lookup (Data Fabric)', bindingsVersion: '2.2', connector: 'uipath-uipath-dataservice', useConnectionService: 'true' },
    resourceKind: 'Connection',
    resourceType: 'uipath-uipath-dataservice',
    resourceKey: '7ab4be89-9b69-474d-b123-0a1efd597341',
    resourceName: 'mohamed.shaker@barqsystems.com',
    folderKey: RUN_FOLDER,
  });
}
if (!have('e8dbdd2a-5fa7-48dc-934b-bc22ecefacb1')) {
  p.resource.runtimeDependencies.unshift({
    bindingType: 'connection',
    bindingKey: 'e8dbdd2a-5fa7-48dc-934b-bc22ecefacb1',
    bindingValues: { connectionId: { defaultValue: 'e8dbdd2a-5fa7-48dc-934b-bc22ecefacb1' } },
    bindingMetadata: { activityName: 'Adverse Media Web Search', bindingsVersion: '2.2', connector: 'uipath-uipath-airdk', useConnectionService: 'true' },
    resourceKind: 'Connection',
    resourceType: 'uipath-uipath-airdk',
    resourceKey: 'e8dbdd2a-5fa7-48dc-934b-bc22ecefacb1',
    resourceName: 'UiPath GenAI Activities',
    folderKey: RUN_FOLDER,
  });
}
const etDep = p.resource.runtimeDependencies.find((d) => d.bindingType === 'EventTrigger');
if (etDep) {
  etDep.bindingKey = '2e6b6652-3d79-47dc-b719-2c65bc32d10d_start';
  if (etDep.bindingValues && etDep.bindingValues.connectionId)
    etDep.bindingValues.connectionId.defaultValue = '2e6b6652-3d79-47dc-b719-2c65bc32d10d';
}
fs.writeFileSync(pPath, JSON.stringify(p, null, 2));
p.resource.runtimeDependencies.forEach((d) =>
  console.log('DEP:', d.bindingType, '::', (d.bindingValues.connectionId || {}).defaultValue.slice(0, 12), '@', (d.folderKey || '-').slice(0, 12)),
);

// --- 4. connection resource JSONs: remap to Run-folder connections
const connDir = path.join(root, 'resources', 'solution_folder', 'connection');
walk(connDir, (f) => {
  const orig = fs.readFileSync(f, 'utf8');
  const next = remapText(orig);
  if (next !== orig) fs.writeFileSync(f, next);
});
console.log('connection resources remapped');
