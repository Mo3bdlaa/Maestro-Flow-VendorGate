# VendorGate — vendor onboarding & risk clearance

A UiPath **Maestro Flow** solution built for the Maestro Flow Challenge.

Straight-through vendor registration is a solved problem. **VendorGate starts where
the old automation gave up** — the packet that doesn't validate cleanly. The
exception paths are the main event: a 48-hour human-vs-timer race, agent-driven
cross-document validation, sanctions screening against **real OFAC data**,
risk-tiered parallel approvals, and compensation when provisioning fails.

One `.uipx` solution, one deployable artifact, two projects:

```
VendorGate.uipx
├── VendorClearance   Maestro Flow  — the orchestration
└── VendorPortal      Coded App    — vendor portal + procurement console
```

| | |
|---|---|
| Flow canvas | [Studio Web designer](https://cloud.uipath.com/moshaker/studio_/designer/d47d327a-ef17-436b-b5b5-816799f26b2d?solutionId=3e054f21-d53a-4f5f-9823-08def396904e) |
| Live portal | <https://moshaker.uipath.host/vendor-portal> |
| Demo runbook | [DEMO.md](DEMO.md) |
| Feature list | [FEATURES.md](FEATURES.md) |

---

## The pipeline

![Pipeline overview](docs/pipeline.svg)

A supplier submits a packet of four documents — trade licence, insurance
certificate, bank details letter, ISO certificate. The flow persists every state
transition to **Data Fabric**, so a run can pause for 48 hours on a human task
and resume against durable state, and the portal reads live progress at any time.

### 1 · Intake & generative extraction
`Vendor` and `VendorDocument` rows are written before anything else — the record
of the application exists even if every later step fails. An **extraction agent**
then turns the packet into typed document records: give it raw unstructured text
(OCR output, pasted document contents — see
`test-data/debug-vendor-a-rawtext.json`) and it extracts the four documents
generatively, reporting anything ambiguous in its extraction notes; give it
pre-structured JSON and it normalises and passes through. Names are copied
exactly as written — suffix drift like *FZE* vs *LLC* is evidence for the next
agent, never silently normalised away.

### 2 · Cross-document validation (inline agent)
Not per-document field checking — the point is **consistency across documents**:
the legal entity name must match everywhere (suffix drift like *FZE* vs *LLC* is
a blocking finding, a declared trade name is not), nothing may be expired or
near expiry, the bank account holder must be the licensed entity, and the
licence jurisdiction must match the stated country. Typed output: an issue list
with severities, discovered name variants, and a confidence.

### 3 · The vendor query loop

![Query loop](docs/query-loop.svg)

When blocking issues exist, the vendor gets a task listing exactly what's wrong
— and a **48-hour timer starts in parallel**. Response wins: the flow loops back
to **Extract** (the corrected packet is re-read, not re-judged blind).
Timeout wins: **escalation to a procurement officer**, recorded on the vendor's
record. Nothing fails silently.

### 4 · Screening (inline agent + live tools)

![Screening](docs/screening.svg)

The screening agent calls two tools *inside the flow* — a Data Fabric query
against the `ScreeningList` register (seeded with **real OFAC SDN entities**
from the US Treasury's public endpoint, plus synthetic demo entities), and a
GenAI web search for adverse media. Matching is deliberately fuzzy: suffix
variants and punctuation differences still hit. Every verdict carries the
matched record and a written rationale.

### 5 · Risk & approvals
Judgment lives in the agents; **policy lives in code**. A Script node scores
0–100 deterministically, with one compliance override: a sanctions or debarment
hit can never route below high. Low auto-clears, medium takes one approver,
high fans out to **Legal ∥ Security in parallel — both must return**. Approvers
see the full case in the task: entity, country, score, tier, register hits, and
the agent's rationale.

### 6 · Provisioning & compensation
The vendor master record is written, then the portal API is called. On failure,
a **compensation step unwinds the record to `Failed`** with a structured reason
— this path has been executed live, not just drawn.

---

## The portal

**Vendors** land on a two-card gate: *New submission* (form + four document
uploads, stored as Data Fabric file attachments) or *Track my submission* — a
named stage strip with a "you are here" marker, plain-language status, the
validation feedback when action is required, and their documents.

**Procurement** gets a console: live KPI tiles, a searchable and filterable
vendor table, and per-vendor drill-in showing documents, screening evidence
(register hits, recommended tier, confidence, rationale, adverse media), the
validation issues, and override actions.

---

## How to run

Prereqs: [`uip` CLI](https://www.npmjs.com/package/@uipath/cli) ≥ 1.198, Node 18+, `uip login` into the target tenant.

```bash
cd VendorGate

# 1. Validate + upload the solution to Studio Web
uip maestro flow validate VendorClearance/VendorClearance.flow   # 7 sticky-note errors are a known false positive
uip solution upload . --force

# 2. Run a vendor through (CHANGE vendorId first — it is unique per run)
uip maestro flow debug ./VendorClearance -i "@test-data/debug-vendor-a-clean.json"

# 3. Or pack everything into one deployable artifact
uip solution pack . ./out          # → out/VendorGate_1.0.0.zip (Flow + App)
uip solution publish ./out/VendorGate_1.0.0.zip
```

### What to expect

| Payload | What happens |
|---|---|
| `debug-vendor-a-clean.json` | Straight through: validation passes → screening clear → low tier → auto-provisioned. Vendor row ends `Provisioned` with score, tier and screening rationale written back. |
| `debug-vendor-b-defective.json` | Three blocking issues (expired insurance, bank holder mismatch, name drift) → `Action required` + 48h deadline persisted, vendor task raised, timer armed. The CLI "timeout" is the flow **correctly waiting for a human**. |
| `debug-vendor-c-sanctioned.json` | Screening hits *Crimson Horizon Trading FZE* on the register → compliance override forces high tier → parallel Legal + Security tasks appear in Action Center. |

Synthetic PDF packets for portal uploads live in `test-data/documents/`.

### Test-data snapshots

```bash
cd VendorGate/test-data
node df-export.js my-snapshot.json          # export Vendor / VendorDocument / ScreeningList
node df-import.js my-snapshot.json          # re-import (new rows; vendorId must not collide)
node df-import.js my-snapshot.json --entities ScreeningList
node make-pdfs.js                           # regenerate the synthetic PDF packets
node build-ofac-records.js sdn.csv 300 out.json   # rebuild register rows from a fresh OFAC SDN.CSV
```

---

## What is real vs. what is a stand-in

Honesty table — every stand-in sits behind a swappable node.

| Component | Status |
|---|---|
| Flow orchestration (HITL race, parallel join, compensation) | **Real — executed live** |
| Data Fabric persistence (status, issues, deadlines, screening evidence) | **Real** |
| Validation + screening agents, typed IO, chained outputs | **Real** |
| Agent tool calls (register query, web search) inside the flow | **Real** |
| Sanctions register content | **Real OFAC SDN rows** + synthetic demo entities |
| Risk scoring & compliance override | **Real (deterministic code)** |
| Portal (submission, uploads, tracking, admin console) | **Real, live** |
| Eval datasets (7 cases incl. adversarial) | Authored; run from the Studio Web canvas |
| Document extraction | **Real — generative extraction agent.** Raw packet text → typed documents (verified live, `mode: generative`). An IxP model remains the swap-in for scanned/image PDFs. |
| ERP provisioning | **Stand-in** — writes vendor-master state to Data Fabric; an RPA package drops in |
| Vendor portal provisioning API | **Stub** — echo endpoint behind a managed HTTP node |
| Vendor identity / portal auth separation | Demo-grade: one UiPath login, tab-based roles |

## Repository map

```
DEMO.md              demo runbook — run order, script, pitfalls
FEATURES.md          feature inventory
docs/                architecture SVGs used above
VendorGate/
  VendorGate.uipx    solution manifest (Flow + AppV2)
  VendorClearance/   the Maestro Flow + two inline agents + eval sets
  VendorPortal/      coded app (source/ = Vite + React + TS + Tailwind)
  test-data/         payloads, synthetic PDFs, OFAC ingest, snapshot tools
  out/               packed solution artifact
```
