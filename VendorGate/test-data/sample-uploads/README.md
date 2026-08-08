# sample-uploads — dummy files & fresh test data

Everything here is safe, synthetic or public-domain test material for exercising
the flow and the portal without touching the staged demo vendors.

## Sample PDFs (downloaded from public sources)

Generic dummy PDFs for **portal upload testing** — drop them into the four
document slots on the "New vendor submission" form. Their content is lorem-ipsum
style, so they prove the upload + Data Fabric attachment path, not extraction.
For extraction-realistic PDFs use `../documents/<vendor>/*.pdf` instead.

| File | Source |
|---|---|
| `w3c-dummy.pdf` | w3.org accessibility test corpus |
| `pdfobject-sample.pdf` | pdfobject.com sample |
| `orimi-sample.pdf` | orimi.com PDF test file |

## Fresh vendor payloads (never used in demo staging)

Run with `uip maestro flow debug ./VendorClearance -i "@test-data/sample-uploads/<file>"`
from the `VendorGate/` directory — or copy the field values into the portal form.
**Change `vendorId` before every rerun** — it is unique in Data Fabric.

| Payload | Vendor | What it exercises |
|---|---|---|
| `vendor-d-payload.json` | Oasis Falcon Logistics LLC | Clean straight-through run → Provisioned |
| `vendor-e-debarred-payload.json` | Quantum Facility Services **F.Z.E.** | Fuzzy **debarment** hit (register holds "FZE", payload has "F.Z.E.") → high tier → parallel approvals |
| `vendor-f-rawtext-payload.json` | Marina Pearl Catering LLC | **Generative extraction** — raw packet text only, different wording/labels than the agent prompt examples, dates in "3 March 2025" format |

## Rebuilding / extending test data

```bash
node ../make-pdfs.js                      # regenerate extraction-realistic PDF packets
node ../df-export.js snapshot.json        # snapshot current Data Fabric state
node ../df-import.js snapshot.json        # restore it
node ../build-ofac-records.js sdn.csv 300 rows.json   # refresh register from a new OFAC SDN.CSV
```
