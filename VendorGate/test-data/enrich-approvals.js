// Give approvers a decision-ready case file.
//  - rebind vendor context onto buildPacket (pickVendor sits upstream of the
//    query-loop cycle, so those bindings never resolve and render empty)
//  - add a "Case Summary" script node that flattens the agents' findings into
//    reviewer-readable lines
//  - widen the approval forms and capture the approver's written reason
const fs = require('fs');
const flowPath = process.argv[2];
const f = JSON.parse(fs.readFileSync(flowPath, 'utf8'));

// ---------- 1. case summary node -------------------------------------------
const SUMMARY_SCRIPT = [
  "// Flatten the agents' structured findings into lines a reviewer can act on.",
  "const v = $vars.validationAgent.output || {};",
  "const s = $vars.screeningAgent.output || {};",
  "const r = $vars.riskScore.output || {};",
  "const p = $vars.buildPacket.output || {};",
  "",
  "const issues = (v.issues || []);",
  "const blocking = issues.filter(i => i.severity === 'blocking');",
  "const issueLines = issues.length",
  "  ? issues.map(i => '- [' + (i.severity || 'info').toUpperCase() + '] ' + (i.docType || 'packet') + '.' + (i.field || '') + ': ' + (i.note || '')).join('\\n')",
  "  : 'No validation issues raised.';",
  "",
  "const media = (s.adverseMedia || []);",
  "const mediaLines = media.length",
  "  ? media.map(m => '- [' + (m.severity || 'low') + '] ' + (m.summary || '') + ' (' + (m.source || 'source not given') + ')').join('\\n')",
  "  : 'No adverse media found.';",
  "",
  "const variants = (v.nameVariants || []);",
  "const variantLine = variants.length > 1",
  "  ? 'Entity name is not consistent across documents: ' + variants.join(' | ')",
  "  : 'Entity name is consistent across all documents.';",
  "",
  "const hits = [];",
  "if (s.sanctionsHit) hits.push('SANCTIONS MATCH');",
  "if (s.debarmentHit) hits.push('DEBARMENT MATCH');",
  "const headline = hits.length ? hits.join(' + ') : 'No register match';",
  "",
  "// Why this landed on a human desk, in one line.",
  "const reasons = [];",
  "if (hits.length) reasons.push('a register match forces high risk regardless of score');",
  "if (blocking.length) reasons.push(blocking.length + ' blocking validation issue(s)');",
  "if (variants.length > 1) reasons.push('inconsistent entity naming');",
  "if (v.expiringWithin30Days) reasons.push('a document expires within 30 days');",
  "if (media.length) reasons.push(media.length + ' adverse media item(s)');",
  "const why = reasons.length",
  "  ? 'Routed for review because ' + reasons.join('; ') + '.'",
  "  : 'Routed by risk tier only; no exceptions were raised.';",
  "",
  "const scoreLine = 'Score ' + (r.score != null ? r.score : '?') + '/100 -> tier ' + (r.tier || '?')",
  "  + ' (screening agent recommended ' + (s.recommendedTier || 'n/a') + ')';",
  "",
  "return {",
  "  headline: headline,",
  "  why: why,",
  "  scoreLine: scoreLine,",
  "  issueLines: issueLines,",
  "  mediaLines: mediaLines,",
  "  variantLine: variantLine,",
  "  blockingCount: blocking.length,",
  "  docCount: p.docCount || 0,",
  "  validationConfidence: v.confidence != null ? v.confidence : null,",
  "  screeningConfidence: s.confidence != null ? s.confidence : null",
  "};",
].join('\n');

const SUMMARY_SCHEMA = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  type: 'object',
  properties: {
    headline: { type: 'string', description: 'Register match headline' },
    why: { type: 'string', description: 'Why this case needs a human' },
    scoreLine: { type: 'string', description: 'Score, tier and the agent recommendation' },
    issueLines: { type: 'string', description: 'Validation issues, one per line' },
    mediaLines: { type: 'string', description: 'Adverse media findings, one per line' },
    variantLine: { type: 'string', description: 'Entity-name consistency across documents' },
    blockingCount: { type: 'number', description: 'Count of blocking validation issues' },
    docCount: { type: 'number', description: 'Documents received' },
    validationConfidence: { type: 'number', description: 'Validation agent confidence' },
    screeningConfidence: { type: 'number', description: 'Screening agent confidence' },
  },
};

if (!f.nodes.some((n) => n.id === 'caseSummary')) {
  f.nodes.push({
    id: 'caseSummary',
    type: 'core.action.script',
    typeVersion: '1.1',
    display: { label: 'Build Reviewer Case File', icon: 'code' },
    inputs: { script: SUMMARY_SCRIPT },
    outputs: {
      output: { type: 'object', description: 'The return value of the script', source: '=result.response', var: 'output', schema: SUMMARY_SCHEMA },
      error: { type: 'object', description: 'Error information if the script fails', source: '=Error', var: 'error' },
    },
  });
  f.variables.nodes.push(
    { id: 'caseSummary.output', type: 'object', description: 'Reviewer case file', schema: SUMMARY_SCHEMA, binding: { nodeId: 'caseSummary', outputId: 'output' } },
    { id: 'caseSummary.error', type: 'object', description: 'Error information if the script fails', binding: { nodeId: 'caseSummary', outputId: 'error' } },
  );
  // insert between persistScreeningResult1 and tierSwitch
  const e = f.edges.find((x) => x.sourceNodeId === 'persistScreeningResult1' && x.targetNodeId === 'tierSwitch');
  if (!e) throw new Error('persistScreeningResult1 -> tierSwitch edge not found');
  e.targetNodeId = 'caseSummary';
  f.edges.push({ id: 'e-caseSummary-tierSwitch', sourceNodeId: 'caseSummary', sourcePort: 'success', targetNodeId: 'tierSwitch', targetPort: 'input' });
  const L = f.layout.nodes || f.layout;
  L['caseSummary'] = { position: { x: 3232, y: 480 }, size: { width: 96, height: 96 }, collapsed: false };
}

// ---------- 2. decision-ready approval forms --------------------------------
const field = (id, label, type, binding) => ({ id, label, type, direction: 'input', binding });

function approvalFields(role) {
  return [
    field('headline', 'Register screening result', 'text', 'vars.caseSummary.output.headline'),
    field('whyhere', 'Why this needs your decision', 'text', 'vars.caseSummary.output.why'),
    field('vendorref', 'Vendor reference', 'text', 'vars.buildPacket.output.vendorId'),
    field('legalname', 'Legal entity name', 'text', 'vars.buildPacket.output.legalName'),
    field('country', 'Country', 'text', 'vars.buildPacket.output.country'),
    field('scoreline', 'Risk assessment', 'text', 'vars.caseSummary.output.scoreLine'),
    field('riskscore', 'Risk score (0-100)', 'number', 'vars.riskScore.output.score'),
    field('risktier', 'Risk tier', 'text', 'vars.riskScore.output.tier'),
    field('sanctionshit', 'Sanctions register hit', 'text', 'vars.screeningAgent.output.sanctionsHit'),
    field('debarmenthit', 'Debarment register hit', 'text', 'vars.screeningAgent.output.debarmentHit'),
    field('rationale', 'Screening agent rationale', 'text', 'vars.screeningAgent.output.rationale'),
    field('media', 'Adverse media findings', 'text', 'vars.caseSummary.output.mediaLines'),
    field('issues', 'Validation issues', 'text', 'vars.caseSummary.output.issueLines'),
    field('variants', 'Entity name consistency', 'text', 'vars.caseSummary.output.variantLine'),
    field('doccount', 'Documents received', 'number', 'vars.caseSummary.output.docCount'),
    field('vconf', 'Validation agent confidence', 'number', 'vars.caseSummary.output.validationConfidence'),
    field('sconf', 'Screening agent confidence', 'number', 'vars.caseSummary.output.screeningConfidence'),
    { id: 'decisionNote', label: `${role} decision note (recorded on the vendor record)`, type: 'text', direction: 'output' },
  ];
}

const APPROVALS = {
  approvalLegal: 'Legal',
  approvalSecurity: 'Security',
  approvalMedium: 'Procurement',
};
let forms = 0;
for (const [id, role] of Object.entries(APPROVALS)) {
  const n = f.nodes.find((x) => x.id === id);
  if (!n) { console.log('MISSING approval node', id); continue; }
  n.inputs.schema.fields = approvalFields(role);
  forms++;
}

// ---------- 3. the vendor query task gets the same treatment ----------------
const vq = f.nodes.find((x) => x.id === 'vendorQuery');
if (vq) {
  vq.inputs.schema.fields = [
    field('vendorref', 'Vendor reference', 'text', 'vars.buildPacket.output.vendorId'),
    field('legalname', 'Legal entity name', 'text', 'vars.buildPacket.output.legalName'),
    field('whatswrong', 'What we need corrected', 'text', 'vars.caseSummary.output.issueLines'),
    field('variants', 'Entity name consistency', 'text', 'vars.caseSummary.output.variantLine'),
    { id: 'vendorResponse', label: 'Your response', type: 'text', direction: 'output' },
  ];
}

// ---------- 4. drop any leftover pickVendor form bindings -------------------
const before = (JSON.stringify(f.nodes.filter((n) => n.type && n.type.includes('quick-form'))).match(/pickVendor/g) || []).length;

fs.writeFileSync(flowPath, JSON.stringify(f, null, 2));
console.log('forms rebuilt:', forms, '| vendorQuery updated:', !!vq, '| leftover pickVendor form bindings:', before);
