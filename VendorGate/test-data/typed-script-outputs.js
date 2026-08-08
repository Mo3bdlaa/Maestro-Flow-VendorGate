// Declare JSON schemas on the script nodes' outputs so downstream bindings to
// their properties are statically resolvable (the canvas flags an untyped
// object's properties as "not available in this scope").
const fs = require('fs');
const path = process.argv[2];
const f = JSON.parse(fs.readFileSync(path, 'utf8'));

const SCHEMAS = {
  pickVendor: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    required: ['found'],
    properties: {
      found: { type: 'boolean', description: 'True when an unprocessed portal submission was claimed' },
      Id: { type: 'string', description: 'Data Fabric record id of the claimed Vendor row' },
      vendorId: { type: 'string', description: 'Vendor reference as shown to the supplier' },
      legalName: { type: 'string', description: 'Legal entity name as submitted' },
      country: { type: 'string', description: 'Country as submitted' },
      contactEmail: { type: 'string', description: 'Supplier contact address' },
      status: { type: 'number', description: 'Vendor status at claim time' },
    },
  },
  buildPacket: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    required: ['packetText', 'docsJson', 'docCount'],
    properties: {
      packetText: { type: 'string', description: 'Raw packet text assembled from the submitted documents' },
      docsJson: { type: 'string', description: 'Pre-structured documents when the submission carried them' },
      docCount: { type: 'number', description: 'Number of distinct document types found' },
    },
  },
  riskScore: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    required: ['score', 'tier', 'blockingIssues'],
    properties: {
      score: { type: 'number', description: 'Deterministic risk score, 0-100' },
      tier: { type: 'string', description: 'low | medium | high' },
      blockingIssues: { type: 'number', description: 'Count of blocking validation issues' },
    },
  },
};

let n = 0;
for (const [id, schema] of Object.entries(SCHEMAS)) {
  const node = f.nodes.find((x) => x.id === id);
  if (!node) { console.log('MISSING node', id); continue; }
  node.outputs.output.schema = schema;
  const v = f.variables.nodes.find((x) => x.id === id + '.output');
  if (v) { v.schema = schema; n++; }
}
fs.writeFileSync(path, JSON.stringify(f, null, 2));
console.log('typed script outputs:', n);
