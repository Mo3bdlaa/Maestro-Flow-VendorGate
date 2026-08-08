// Rebuild the canvas layout: six phase bands, generous spacing, region notes
// sized to their contents. Positions are hand-set — never run `flow format`.
const fs = require('fs');
const path = process.argv[2];
const f = JSON.parse(fs.readFileSync(path, 'utf8'));
const L = f.layout.nodes || f.layout;

// x,y are top-left. Node grid step 208 (96 wide + 112 gap); agents are 288 wide.
const POS = {
  // ---- 1 · intake & generative extraction (main band, y=0)
  start:                    [64, 0],
  fetchNewVendorRow1:       [272, 0],
  pickVendor:               [480, 0],
  portalGuard:              [688, 0],
  endIgnored:               [688, 208],
  setStatusExtracting1:     [896, 0],
  fetchSubmittedDocuments1: [1104, 0],
  buildPacket:              [1312, 0],
  extractDocs:              [1520, 0],

  // ---- 2 · cross-document validation
  validationAgent:          [1936, 0],
  checkIssues:              [2288, 0],

  // ---- 3 · vendor query loop (above the band)
  setActionRequiredQuerydeadline1: [2512, -480],
  vendorQuery:              [2720, -480],
  delay48h:                 [2928, -480],
  checkDeadline:            [3136, -480],
  escalateTimeout:          [3344, -624],
  recordEscalation1:        [3552, -624],
  endEscalated:             [3760, -624],
  endQueryResolved:         [3344, -336],

  // ---- 4 · screening & risk (below the band)
  screeningAgent:           [2464, 480],
  toolScreeningList:        [2496, 688],
  toolWebSearch:            [2704, 688],
  riskScore:                [2880, 480],
  persistScreeningResult1:  [3088, 480],

  // ---- 5 · risk-tiered approvals
  tierSwitch:               [3360, 448],
  approvalMedium:           [3568, 304],
  checkMediumApproved:      [3776, 304],
  forkHighApprovals:        [3568, 656],
  approvalLegal:            [3776, 576],
  approvalSecurity:         [3776, 768],
  mergeHigh:                [3984, 656],
  checkHighApproved:        [4192, 656],
  setRejected1:             [4192, 896],
  endRejected:              [4400, 896],

  // ---- 6 · provisioning + compensation
  provisionVendorMaster1:        [4672, 480],
  provisionVendorPortalApi1:     [4880, 480],
  endProvisioned:                [5088, 480],
  compensationRevertVendorMaster1: [4880, 688],
  endFailed:                     [5088, 688],
};

for (const [id, [x, y]] of Object.entries(POS)) {
  if (!L[id]) { console.log('MISSING layout entry:', id); continue; }
  L[id].position = { x, y };
}

// region notes: [x, y, width, height]
const NOTES = {
  noteTitle:        [64, -320, 640, 176],
  noteIntake:       [0, -112, 1856, 464],
  noteValidation:   [1888, -112, 544, 464],
  noteQueryLoop:    [2448, -720, 1504, 528],
  noteScreening:    [2416, 384, 848, 464],
  noteApprovals:    [3312, 208, 1232, 832],
  noteProvisioning: [4608, 384, 624, 464],
};
for (const [id, [x, y, w, h]] of Object.entries(NOTES)) {
  if (!L[id]) { console.log('MISSING note:', id); continue; }
  L[id].position = { x, y };
  L[id].size = { width: w, height: h };
}

// --- verify: no two real nodes overlap
const real = f.nodes.filter((n) => n.type !== 'stickyNote');
const box = (id) => {
  const l = L[id];
  return { x: l.position.x, y: l.position.y, w: l.size.width, h: l.size.height };
};
let clashes = 0;
for (let i = 0; i < real.length; i++) {
  for (let j = i + 1; j < real.length; j++) {
    const a = box(real[i].id), b = box(real[j].id);
    if (a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h) {
      console.log('OVERLAP:', real[i].id, '<->', real[j].id);
      clashes++;
    }
  }
}

// --- verify: every node sits inside exactly one region note
const regions = Object.entries(NOTES).filter(([id]) => id !== 'noteTitle');
for (const n of real) {
  const a = box(n.id);
  const inside = regions.filter(([, [x, y, w, h]]) =>
    a.x >= x && a.y >= y && a.x + a.w <= x + w && a.y + a.h <= y + h);
  if (inside.length !== 1) console.log('REGION', inside.length === 0 ? 'ORPHAN' : 'MULTI', n.id, inside.map((r) => r[0]).join('+'));
}

fs.writeFileSync(path, JSON.stringify(f, null, 2));
console.log('layout rebuilt. overlaps:', clashes, '| nodes:', real.length);
