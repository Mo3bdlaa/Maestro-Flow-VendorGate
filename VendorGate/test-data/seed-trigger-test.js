// Seed a portal-style submission: 4 VendorDocument rows first, Vendor row last
// (the Vendor insert is the trigger event). Mirrors exactly what the portal does.
const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const VENDOR_ENTITY = 'a78eb607-7792-f111-b338-000d3ab4d3b7';
const DOC_ENTITY = 'd350af0d-7792-f111-b338-000d3ab4d3b7';

const payload = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));

const ref = 'VND-T-' + Date.now().toString(36).toUpperCase().slice(-5);
const now = new Date().toISOString();

// Split the packet text into per-document sections like the portal produces
const text = payload.packetText;
const sections = [
  { key: 'trade_licence', marker: 'TRADE LICENCE' },
  { key: 'insurance', marker: 'INSURANCE CERTIFICATE' },
  { key: 'bank_letter', marker: 'BANK' },
  { key: 'iso_cert', marker: 'ISO' },
];
const idxs = sections.map((s) => text.indexOf(s.marker)).map((i) => (i < 0 ? null : i));
const chunks = sections.map((s, i) => {
  const startIdx = idxs[i];
  if (startIdx == null) return text; // fallback: whole packet
  const next = idxs.slice(i + 1).find((x) => x != null);
  return text.slice(startIdx, next == null ? undefined : next).trim();
});

function insert(entityId, record) {
  const tmp = path.join(os.tmpdir(), 'df-row-' + Math.random().toString(36).slice(2) + '.json');
  fs.writeFileSync(tmp, JSON.stringify(record));
  const out = execFileSync('uip', ['df', 'records', 'insert', entityId, '-f', tmp, '--output', 'json'], {
    shell: true,
    encoding: 'utf8',
  });
  fs.unlinkSync(tmp);
  return out;
}

for (let i = 0; i < 4; i++) {
  insert(DOC_ENTITY, {
    docId: `${ref}-${sections[i].key}`,
    vendorId: ref,
    docType: i,
    extractedFields: JSON.stringify({ rawText: chunks[i] }),
    valid: false,
    issueNote: `${sections[i].key}.pdf uploaded via portal - awaiting extraction`,
  });
  console.log('doc inserted:', sections[i].key, chunks[i].length, 'chars');
}

insert(VENDOR_ENTITY, {
  vendorId: ref,
  legalName: payload.legalName,
  country: payload.country,
  contactEmail: 'supplier@aurorasteel.example',
  status: 0,
  submittedAt: now,
  updatedAt: now,
});
console.log('VENDOR INSERTED (trigger event):', ref);
