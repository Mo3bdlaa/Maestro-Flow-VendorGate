// Carry the vendor context through buildPacket so the validation and screening
// agents bind to a node in their own lineage. pickVendor sits upstream of the
// query-loop cycle, and bindings that cross it do not resolve on the canvas.
const fs = require('fs');
const path = require('path');
const flowPath = process.argv[2];
const dir = path.dirname(flowPath);
const f = JSON.parse(fs.readFileSync(flowPath, 'utf8'));

// --- 1. buildPacket returns the vendor context alongside the packet
const bp = f.nodes.find((n) => n.id === 'buildPacket');
bp.inputs.script = bp.inputs.script.replace(
  /return \{\n  packetText:/,
  'return {\n  vendorId: vid,\n  legalName: trig.legalName || trig.LegalName || \'\',\n  country: trig.country || trig.Country || \'\',\n  packetText:',
);
if (!bp.inputs.script.includes('legalName:')) throw new Error('buildPacket script patch did not apply');

const bpSchema = bp.outputs.output.schema;
Object.assign(bpSchema.properties, {
  vendorId: { type: 'string', description: 'Vendor reference as shown to the supplier' },
  legalName: { type: 'string', description: 'Legal entity name as submitted' },
  country: { type: 'string', description: 'Country as submitted' },
});
const bpVar = f.variables.nodes.find((v) => v.id === 'buildPacket.output');
if (bpVar) bpVar.schema = bpSchema;

// --- 2. rebind the two agents onto buildPacket
const REN = {
  pickVendor__output__legalName: ['buildPacket__output__legalName', '=$vars.buildPacket.output.legalName'],
  pickVendor__output__country: ['buildPacket__output__country', '=$vars.buildPacket.output.country'],
};
const agentDirs = {};
let rebound = 0;
for (const id of ['validationAgent', 'screeningAgent']) {
  const node = f.nodes.find((n) => n.id === id);
  agentDirs[id] = node.inputs.source;
  for (const v of node.inputs.agentInputVariables) {
    const hit = REN[v.id];
    if (!hit) continue;
    v.id = hit[0];
    v.binding = hit[1];
    v.description = 'Bound from ' + hit[1].slice(1);
    rebound++;
  }
}
fs.writeFileSync(flowPath, JSON.stringify(f, null, 2));
console.log('flow bindings rebound:', rebound);

// --- 3. rename the matching keys and prompt tokens in the agent projects
for (const [nodeId, agentId] of Object.entries(agentDirs)) {
  const p = path.join(dir, agentId, 'agent.json');
  let s = fs.readFileSync(p, 'utf8');
  let n = 0;
  for (const [from, [to]] of Object.entries(REN)) {
    const before = s;
    s = s.split(from).join(to);
    if (s !== before) n++;
  }
  fs.writeFileSync(p, s);
  const a = JSON.parse(s);
  const keys = Object.keys(a.inputArguments || {});
  const toks = [...new Set([...s.matchAll(/\{\{input\.([^}]*)\}\}/g)].map((m) => m[1]))];
  console.log(nodeId, '| keys:', keys.join(', '));
  console.log('  tokens:', toks.join(', '));
  const missing = toks.filter((t) => !keys.includes(t));
  if (missing.length) console.log('  MISMATCH — tokens with no input argument:', missing.join(', '));
}
