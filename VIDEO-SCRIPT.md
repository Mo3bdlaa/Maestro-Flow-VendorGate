# VendorGate — 4-minute video shot list

One take, screen recording, talk over it. Rehearse once with this open on a second
screen. Target 3:30–4:30. **Record 1080p, hide bookmarks bar, close other tabs.**

Before recording (5 min):
- [ ] Open tabs in order: ① Studio Web designer (flow canvas) · ② Orchestrator
      → `Shared/VendorGate Run` → Processes/Instances · ③ Action Center tasks ·
      ④ portal https://moshaker.uipath.host/vendor-portal (signed in) ·
      ⑤ terminal in `VendorGate/`
- [ ] Run `node test-data/preflight.js` from `VendorGate/` — repairs the screening
      tool file and verifies the cloud copy. Do this LAST before recording.
- [ ] Run the eval sets from the canvas FIRST (agent node → Evaluations → Run) so
      you can show results, not promises.
- [ ] Terminal ready with the studio run, as the agent-path fallback:
      `uip maestro flow debug ./VendorClearance -i "@test-data/debug-vendor-a-rawtext.json"`
      …but FIRST edit the payload's vendorId to something unused (e.g. VND-A-####).
- [ ] Have a PDF from `test-data/documents/vendor-a/` ready to upload in the portal.

---

### 0:00–0:25 · The pitch (canvas, zoomed out)
> "Straight-through vendor registration is solved. VendorGate starts where the old
> automation gave up — the packet that doesn't validate cleanly. Everything you'll
> see runs on UiPath Maestro: three agents, human tasks, a 48-hour timer, real
> sanctions data, and a compensation path — packaged as one solution with a
> customer-facing coded app."

Pan slowly across the six colored sections while talking.

### 0:25–1:10 · A vendor submits — and the flow wakes up by itself (portal → Orchestrator)
In the **portal**, fill the submission form and attach the vendor-a PDFs. Submit.
> "A supplier registers through the portal. The browser reads the PDFs, and the
> packet lands in Data Fabric. Nobody starts a job."

Switch to **Orchestrator → VendorGate Run → instances**. A new instance appears
on its own within about **five seconds** — no waiting, no cut needed.
> "A Data Fabric *Record Created* trigger starts the process. It claims the new
> submission, moves it to extracting, pulls the documents back out, assembles the
> packet, and hands it to the extraction agent — every step you're seeing ran on
> deployed infrastructure, not a debug session."

Then switch to the canvas run view for the agent chain (studio run if the deployed
agent leg is licence-blocked — see Don'ts):
> "Raw, unstructured packet text — no JSON. The first agent does generative
> extraction: four typed documents out of plain text, with notes for anything
> ambiguous. That chains into a validation agent that cross-checks the documents
> against each other, then a screening agent."

When it completes:
> "Clean vendor: validated, screened, scored low, auto-provisioned. Everything
> written back to Data Fabric — that matters in a minute."

### 1:10–2:00 · The main event: vendor B's query loop (canvas + portal)
Open the pre-run VND-B-8002 (or run vendor B live if time). On the canvas, point at
the loop:
> "The defective packet is why this flow exists. The validation agent found three
> blocking issues. The vendor gets a task listing exactly what's wrong — and a
> 48-hour timer starts in parallel. Response loops back to *extraction* — the
> corrected packet is re-read, not re-judged. Timeout escalates to a procurement
> officer. Nothing fails silently."

Switch to the **portal**, track VND-B-8002:
> "The vendor sees the same thing in plain language: current stage, the three
> issues, and a response deadline — read live from Data Fabric."

### 2:00–2:50 · Sanctions hit + parallel approvals (Action Center + portal admin)
Track VND-C-2026 in the portal admin view, open the profile:
> "This vendor is on the sanctions register — real OFAC data seeded from the US
> Treasury's public feed, queried by the screening agent as a tool call *inside*
> the flow, alongside an adverse-media web search. Score forty — but a sanctions
> hit can never route below high; that override is deterministic code, not a
> prompt. High risk means parallel approvals: Legal AND Security, both must
> return."

Switch to Action Center — show the two pending tasks, open one:
> "Approvers see the whole case: entity, score, tier, register hits, and the
> agent's written rationale."
Approve both if time allows; otherwise leave pending.

### 2:50–3:20 · Compensation (portal admin, VND-A-7002)
Open VND-A-7002 (status Failed):
> "Error handling isn't decorative. We pointed the provisioning API at a failing
> endpoint: the boundary error fired, the compensation step rolled the vendor
> master back to Failed with a structured reason. This path has been executed,
> not just drawn."

### 3:20–3:50 · Evals (canvas, Evaluations tab)
Show the eval results for both agents:
> "Each agent ships with ground-truth evals beyond the happy path — including an
> adversarial case: a legitimate registered trade name that must NOT be flagged,
> and fuzzy sanction variants that must still hit."

### 3:50–4:10 · Close (repo README)
Scroll the README:
> "One solution package: the Maestro flow and the coded app deploy together.
> Real components, honest stubs — each behind a swappable node. VendorGate:
> exception-first vendor onboarding on UiPath Maestro."

---

## Don'ts (each one has burned us)
- **If the deployed agent node is licence-blocked** (`170002 / LLM provider
  returned HTTP 403` — robot-executed agents draw on tenant AI Units), show the
  deployed instance up to the agent hand-off, say so plainly, and roll the studio
  run for the agent chain. Named licence boundary reads as production literacy;
  a stalled canvas does not.
- **Don't complete vendor B's resubmission task on camera** — the form carries no
  corrected data; the flow would re-flag identical issues. Narrate the loop.
- **Never start a run with the canvas Run button.** Studio Web regenerates the
  screening tool's config as it launches the run — numbers become strings and
  the pinned entity resets to `Vendor` — so the screening agent crashes or
  silently reports no sanctions hit. Start every run from the terminal with
  `uip maestro flow debug .` and watch it on the canvas.
- **Don't click "Add a connection"** on HITL outcome warnings in the canvas.
- **Don't edit or open the tool node** (Sanctions & Debarment Lookup) in the canvas.
- **Don't reuse a vendorId** in any live run.

## After recording
1. Upload (YouTube unlisted works).
2. Put the link in README's "Demo video" row, commit, push:
   `git add README.md && git commit -m "Add demo video link" && git push`
