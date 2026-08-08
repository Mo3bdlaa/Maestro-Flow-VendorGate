// Seed a portal-style submission from a structured payload (docsJson), so the
// demo tenant carries defective and sanctioned cases as well as clean ones.
// Documents are written first; the Vendor insert is the trigger event.
//   node seed-structured.js debug-vendor-c-sanctioned.json [emailPrefix]
const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const VENDOR_ENTITY = 'a78eb607-7792-f111-b338-000d3ab4d3b7';
const DOC_ENTITY = 'd350af0d-7792-f111-b338-000d3ab4d3b7';
const DOC_TYPES = ['trade_licence', 'insurance', 'bank_letter', 'iso_cert'];

const payload = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const docs = JSON.parse(payload.docsJson);
const tag = (payload.vendorId.split('-')[1] || 'X').toUpperCase();
const ref = `VND-${tag}-${Date.now().toString(36).toUpperCase().slice(-5)}`;
const now = new Date().toISOString();

function insert(entityId, record) {
  const tmp = path.join(os.tmpdir(), 'df-row-' + Math.random().toString(36).slice(2) + '.json');
  fs.writeFileSync(tmp, JSON.stringify(record));
  execFileSync('uip', ['df', 'records', 'insert', entityId, '-f', tmp, '--output', 'json'], {
    shell: true, encoding: 'utf8',
  });
  fs.unlinkSync(tmp);
}

for (const doc of docs) {
  const idx = DOC_TYPES.indexOf(doc.docType);
  if (idx < 0) { console.log('skip unknown docType', doc.docType); continue; }
  // The portal writes the document's readable text; here the structured record
  // stands in for it, which the extraction agent handles as its typed path.
  insert(DOC_ENTITY, {
    docId: `${ref}-${doc.docType}`,
    vendorId: ref,
    docType: idx,
    extractedFields: JSON.stringify(doc),
    valid: false,
    issueNote: `${doc.docType}.pdf uploaded via portal - awaiting extraction`,
  });
  console.log('doc inserted:', doc.docType);
}

insert(VENDOR_ENTITY, {
  vendorId: ref,
  legalName: payload.legalName,
  country: payload.country,
  contactEmail: `${(process.argv[3] || 'supplier')}@example.com`,
  status: 0,
  submittedAt: now,
  updatedAt: now,
});
console.log('VENDOR INSERTED (trigger event):', ref, '-', payload.legalName);
