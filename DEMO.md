# VendorGate — demo runbook

Everything below is live. Links, references and click paths are exact.

| | |
|---|---|
| **Demo video** | **<https://youtu.be/1rHno7CtIBk>** |
| Flow canvas | [Studio Web designer](https://staging.uipath.com/shakertechs/studio_/designer/a0978eee-a8ab-41a3-aa91-3bdb35e3bf1f) |
| Vendor portal | <https://shakertechs.staging.uipath.host/vendor-portal> |
| Solution package | `VendorGate/out/VendorGate_1.0.0.zip` (Flow + App in one artifact) |
| Test PDFs | `VendorGate/test-data/documents/<vendor>/` |
| Test payloads | `VendorGate/test-data/debug-vendor-*.json` |

---

## The 90-second story

> Straight-through vendor registration is a solved problem. **This flow starts
> where the old automation gave up** — the packet that doesn't validate cleanly.
> The exception paths are the main event.

Four documents arrive. The flow extracts them, cross-checks them *against each
other*, screens the entity against a real sanctions register, scores the risk in
code, routes for approval by tier, provisions, and unwinds if provisioning fails.

---

## Run order

### 1. Canvas (30s)
Open the designer. Walk the six coloured sections left to right: intake, validation,
the query loop, screening, tiered approvals, provisioning and compensation.

Say out loud: *judgment lives in the agents, policy thresholds live in a Script node.*

### 2. Vendor A — the clean path, from RAW TEXT (75s)
```bash
cd VendorGate
uip maestro flow debug ./VendorClearance -i "@test-data/debug-vendor-a-rawtext.json"
```
Change `vendorId` first — it is unique per run. This payload carries **raw
unstructured packet text**, not JSON: the extraction agent parses it
generatively (`mode: "generative"`, extraction notes included), then validation,
screening and provisioning run on what it extracted. Ends `Provisioned` with
status, tier, score and screening JSON written back. Say out loud: *no
pre-structured input — the agent read the documents.*
(`debug-vendor-a-clean.json` is the pre-structured variant of the same vendor.)

### 3. Vendor B — the loop-back (the strongest moment, 90s)
```bash
uip maestro flow debug ./VendorClearance -i "@test-data/debug-vendor-b-defective.json"
```
The validation agent returns **three blocking issues** — expired insurance, bank
account holder mismatch, entity name mismatch across documents. The vendor record
flips to `Action required` with a 48-hour `queryDeadline`, a task lands in Action
Center, and the 48h timer arms.

Show both branches on the canvas: **resubmission returns to Extract** (not to
Validation — the corrected document must be re-read), **timeout escalates** to a
procurement officer rather than failing silently.

Then open the portal as the vendor and show the same three issues rendered in
plain language with the response deadline.

### 4. Vendor C — sanctions hit (60s)
```bash
uip maestro flow debug ./VendorClearance -i "@test-data/debug-vendor-c-sanctioned.json"
```
The screening agent calls two live tools and reports:

> Sanctions register hit: "Crimson Horizon Trading FZE" (AE) — "Designated
> 2025-11-02 - trade sanctions evasion". No relevant adverse media.

Score 40 → the compliance override forces **high** tier → **parallel Legal +
Security** approvals, both must return. Complete them in Action Center.

### 5. The portal (60s)
**Vendor view** — entry modal offers *New submission* or *Track*. Submit a real
PDF from `test-data/documents/`, land on the tracker, walk the stage strip.

**Admin view** — vendor list with search and status filter; click into a vendor
for documents and the agents' recommendations (sanctions/debarment badges,
recommended tier, confidence, full rationale, validation issues).

### 6. Evals (30s)
Open each agent node in the canvas → **Evaluations** → run.

- Validation: vendor A → zero issues · vendor B → three blocking · **adversarial
  trade-name case that must NOT be flagged**.
- Screening: vendor C → `sanctionsHit: true`, high tier · plus suffix-variant and
  punctuation-variant fuzzy matches.

---

## What is real vs stubbed — say this out loud

**Real:** Data Fabric state (the flow survives a 48-hour pause), both agents with
live tool calls, **real OFAC SDN records** pulled from the US Treasury's public
endpoint, deterministic risk scoring, HITL tasks, parallel approvals, compensation,
and the portal reading live entity state.

**Stubbed, each behind a swappable node:** extraction is a script passthrough (an
IxP model node drops into that slot), ERP provisioning writes to Data Fabric
instead of an ERP (an RPA package drops in), and the vendor portal API call hits
an echo endpoint.

Naming the gaps reads as architecture. Hiding them reads as fake.

---

## Gotchas during the demo

- **Change `vendorId` before every run** — it is unique in Data Fabric.
- **Don't click "Add a connection"** on the HITL outcome warnings in the canvas.
  Studio Web's own export uses the same `completed` port the runtime expects;
  adding outcome ports breaks validation. The warnings are cosmetic.
- The 7 sticky-note errors from `uip maestro flow validate` are a **known false
  positive** — removing the definition is what makes the notes render coloured.
- A vendor B run "times out" from the CLI because it is **waiting for a human**.
  That is correct behaviour, not a failure.
