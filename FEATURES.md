# VendorGate — feature inventory

Status legend: ✅ live & verified · 🟡 authored, needs a human click · 🔶 stand-in behind a swappable node · 🗺 roadmap

## Orchestration (Maestro Flow)

| Feature | Status |
|---|---|
| Packet intake → `Vendor` + `VendorDocument` rows in Data Fabric | ✅ |
| Cross-document validation agent (name consistency, expiry, bank holder, jurisdiction) with typed issue output | ✅ |
| Vendor query loop: task + parallel 48h timer, response → re-extract, timeout → procurement escalation | ✅ |
| Persisted `action_required` state: status, issue list, 48h deadline on the vendor record | ✅ |
| Screening agent with two live tools called inside the flow | ✅ |
| Sanctions & debarment register in Data Fabric seeded with real OFAC SDN entities | ✅ |
| Adverse-media web search with agent-side relevance filtering | ✅ |
| Fuzzy entity matching (suffix drift, punctuation variants) with quoted match + rationale | ✅ |
| Deterministic 0–100 risk score in a Script node | ✅ |
| Compliance override: sanctions/debarment hit can never route below high | ✅ |
| Tiered approvals: low auto-clear · medium single approver · high parallel Legal ∥ Security AND-join | ✅ |
| Approval tasks carry the full case: entity, country, score, tier, register hits, rationale | ✅ |
| Vendor-master provisioning write-back (status, score, tier, screening JSON) | ✅ |
| Compensation on provisioning failure → rollback to `Failed` with structured reason — **executed live** | ✅ |
| Terminal statuses persisted on reject + escalation note on timeout | ✅ |
| Screening evidence persisted before approvals (visible for pending/rejected vendors) | ✅ |
| Colored sticky-note phase annotations on the canvas | ✅ |
| Eval sets: validation (3 cases incl. adversarial trade-name), screening (4 cases incl. fuzzy variants) | 🟡 run from canvas |
| Generative extraction agent: raw packet text → typed documents, with extraction notes (verified live) | ✅ |
| IxP model for scanned/image PDFs (generative agent handles text today) | 🗺 |
| ERP vendor-master system | 🔶 Data Fabric write → RPA package slot |
| Vendor portal provisioning API | 🔶 echo endpoint → real API slot |
| API trigger (portal submission starts the flow automatically) | 🗺 |
| Agent guardrails (prompt-injection screening on vendor-supplied names) | 🗺 |
| Scheduled OFAC register refresh with provenance | 🗺 |

## Portal (Coded App, inside the same solution)

| Feature | Status |
|---|---|
| Entry gate: **New vendor submission** / **Track your submission** cards | ✅ |
| Submission form with four document uploads stored as Data Fabric file attachments | ✅ |
| Submit → auto-navigate to tracking with confirmation banner | ✅ |
| Named stage strip with "you are here" marker + plain-language current-stage banner | ✅ |
| Action-required feedback: issue cards with severity + response deadline | ✅ |
| Document cards with extracted fields and validation state | ✅ |
| Procurement console: KPI tiles, search, status filter, pagination | ✅ |
| Vendor drill-in profile: documents, screening evidence, validation issues, agent rationale | ✅ |
| Procurement actions: approve / reject / send back | ✅ (writes record directly — see roadmap) |
| Live refresh (10s vendor / 15s admin) | ✅ |
| Design system: tokens, shared primitives, focus-visible states, empty/loading/error states | ✅ |
| Vendor identity binding + server-side role separation | 🗺 |
| Admin actions routed through Action Center instead of direct writes | 🗺 |
| Document preview/download in admin view | 🗺 |

## Tooling & docs

| Feature | Status |
|---|---|
| One-artifact packaging: `uip solution pack` → Flow + App zip, published | ✅ |
| Data snapshot export/import (`df-export.js` / `df-import.js`) | ✅ |
| Synthetic PDF packet generator (15 PDFs, 3 vendors) | ✅ |
| OFAC SDN ingest script (public endpoint → register rows) | ✅ |
| README with architecture SVGs, run guide, honesty table | ✅ |
| Demo runbook with script + pitfalls (DEMO.md) | ✅ |
