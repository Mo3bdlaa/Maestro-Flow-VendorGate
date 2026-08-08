// Generates the synthetic vendor packets as real one-page PDFs.
// No dependencies - writes minimal but valid PDF 1.4 files.
const fs = require('fs');
const path = require('path');

function esc(s) {
  return String(s).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

function makePdf(title, lines) {
  const body = [];
  body.push('BT', '/F1 16 Tf', '60 760 Td', `(${esc(title)}) Tj`, 'ET');
  body.push('BT', '/F1 11 Tf', '60 725 Td', '14 TL');
  lines.forEach((l, i) => {
    body.push(i === 0 ? `(${esc(l)}) Tj` : `T* (${esc(l)}) Tj`);
  });
  body.push('ET');
  const stream = body.join('\n');

  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>',
    `<< /Length ${Buffer.byteLength(stream, 'latin1')} >>\nstream\n${stream}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ];

  let pdf = '%PDF-1.4\n';
  const offsets = [];
  objects.forEach((obj, i) => {
    offsets.push(Buffer.byteLength(pdf, 'latin1'));
    pdf += `${i + 1} 0 obj\n${obj}\nendobj\n`;
  });
  const xref = Buffer.byteLength(pdf, 'latin1');
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.forEach((o) => {
    pdf += `${String(o).padStart(10, '0')} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(pdf, 'latin1');
}

const VENDORS = {
  'vendor-a-clean': {
    entity: 'Aurora Steel Industries LLC',
    docs: [
      ['trade-licence', 'TRADE LICENCE', [
        'Issuing authority: Abu Dhabi Department of Economic Development',
        'Legal entity name: Aurora Steel Industries LLC',
        'Licence number: CN-1042288',
        'Issue date: 2024-09-15',
        'Expiry date: 2027-09-14',
        'Jurisdiction: Abu Dhabi, United Arab Emirates',
        'Activity: Manufacture of structural steel products',
      ]],
      ['insurance-certificate', 'CERTIFICATE OF INSURANCE', [
        'Insurer: Gulf Assurance Company PJSC',
        'Insured entity name: Aurora Steel Industries LLC',
        'Policy number: PL-88421',
        'Coverage amount: AED 2,000,000',
        'Policy type: Commercial general liability',
        'Expiry date: 2027-01-31',
      ]],
      ['bank-details-letter', 'BANK ACCOUNT CONFIRMATION LETTER', [
        'Bank name: Emirates NBD',
        'Account holder name: Aurora Steel Industries LLC',
        'IBAN: AE070331234567890123456',
        'SWIFT / BIC: EBILAEAD',
        'Branch: Abu Dhabi Main Branch',
        'This letter confirms the above account is held in the name stated.',
      ]],
      ['iso-certificate', 'ISO CERTIFICATE OF REGISTRATION', [
        'Certification body: Global Quality Registrars',
        'Certified entity name: Aurora Steel Industries LLC',
        'Standard: ISO 9001:2015 Quality Management Systems',
        'Certificate number: QMS-55311',
        'Expiry date: 2028-05-20',
      ]],
    ],
  },
  'vendor-b-defective': {
    entity: 'Zenith Gulf Trading FZE',
    docs: [
      ['trade-licence', 'TRADE LICENCE', [
        'Issuing authority: Dubai Department of Economic Development',
        'Legal entity name: Zenith Gulf Trading FZE',
        'Licence number: DL-774210',
        'Issue date: 2023-03-02',
        'Expiry date: 2027-03-01',
        'Jurisdiction: Dubai, United Arab Emirates',
        'Activity: General trading',
      ]],
      ['insurance-certificate', 'CERTIFICATE OF INSURANCE', [
        'Insurer: Meridian Insurance Brokers LLC',
        'Insured entity name: Zenith Gulf Trading FZE',
        'Policy number: PL-44902',
        'Coverage amount: AED 1,000,000',
        'Policy type: Commercial general liability',
        'Expiry date: 2026-03-14      *** EXPIRED ***',
      ]],
      ['bank-details-letter', 'BANK ACCOUNT CONFIRMATION LETTER', [
        'Bank name: Mashreq Bank',
        'Account holder name: Zenith Gulf General Trading LLC',
        'IBAN: AE210260001015333444555',
        'SWIFT / BIC: BOMLAEAD',
        'Branch: Deira Branch',
        'This letter confirms the above account is held in the name stated.',
      ]],
      ['iso-certificate', 'ISO CERTIFICATE OF REGISTRATION', [
        'Certification body: Global Quality Registrars',
        'Certified entity name: Zenith Gulf Trading FZE',
        'Standard: ISO 9001:2015 Quality Management Systems',
        'Certificate number: QMS-88102',
        'Expiry date: 2027-06-30',
      ]],
    ],
  },
  'vendor-c-sanctioned': {
    entity: 'Crimson Horizon Trading FZE',
    docs: [
      ['trade-licence', 'TRADE LICENCE', [
        'Issuing authority: Ajman Free Zone Authority',
        'Legal entity name: Crimson Horizon Trading FZE',
        'Licence number: AJ-330912',
        'Issue date: 2024-05-20',
        'Expiry date: 2027-05-19',
        'Jurisdiction: Ajman, United Arab Emirates',
        'Activity: Import and export of commodities',
      ]],
      ['insurance-certificate', 'CERTIFICATE OF INSURANCE', [
        'Insurer: Gulf Assurance Company PJSC',
        'Insured entity name: Crimson Horizon Trading FZE',
        'Policy number: PL-77120',
        'Coverage amount: AED 1,800,000',
        'Policy type: Commercial general liability',
        'Expiry date: 2027-02-28',
      ]],
      ['bank-details-letter', 'BANK ACCOUNT CONFIRMATION LETTER', [
        'Bank name: RAKBANK',
        'Account holder name: Crimson Horizon Trading FZE',
        'IBAN: AE330550008877665544332',
        'SWIFT / BIC: NRAKAEAK',
        'Branch: Ajman Branch',
        'This letter confirms the above account is held in the name stated.',
      ]],
      ['iso-certificate', 'ISO CERTIFICATE OF REGISTRATION', [
        'Certification body: Global Quality Registrars',
        'Certified entity name: Crimson Horizon Trading FZE',
        'Standard: ISO 9001:2015 Quality Management Systems',
        'Certificate number: QMS-11207',
        'Expiry date: 2027-12-01',
      ]],
    ],
  },
};

const outRoot = path.join(__dirname, 'documents');
let count = 0;
for (const [vendorKey, v] of Object.entries(VENDORS)) {
  const dir = path.join(outRoot, vendorKey);
  fs.mkdirSync(dir, { recursive: true });
  for (const [file, title, lines] of v.docs) {
    fs.writeFileSync(
      path.join(dir, `${file}.pdf`),
      makePdf(title, [`Entity: ${v.entity}`, '', ...lines]),
    );
    count++;
  }
  // A combined packet is handy when the flow takes a single attachment.
  const all = [];
  for (const [, title, lines] of v.docs) {
    all.push(title, ...lines, '');
  }
  fs.writeFileSync(path.join(dir, 'full-packet.pdf'), makePdf(`REGISTRATION PACKET - ${v.entity}`, all));
  count++;
}
console.log('PDFs written:', count, '->', outRoot);
