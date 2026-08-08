import { useCallback, useEffect, useState } from 'react';
import type { VendorService } from '../service';
import {
  Banner,
  Button,
  Card,
  Empty,
  Field,
  FieldLabel,
  Spinner,
  StatusPill,
  TextInput,
} from '../components/ui';
import {
  DOC_TYPES,
  TERMINAL_BAD_STATUSES,
  TRACKER_STAGE_IDS,
  riskTierName,
  stage,
  statusBlurb,
  statusName,
} from '../uipath-config';

import type { ValidationIssue, VendorDocumentRecord, VendorRecord } from '../types';
import { parseJson } from '../types';
import { extractFileText } from '../pdf-text';

/* ---------------------------------- stepper --------------------------------- */

function Stepper({ status }: { status: number | undefined }) {
  const attention = status === 2;
  const bad = status !== undefined && TERMINAL_BAD_STATUSES.includes(status);
  const idx = TRACKER_STAGE_IDS.indexOf(status ?? -1);
  // While the vendor answers a query, the packet has already been read.
  const active = attention ? 1 : idx;

  return (
    <div>
      <ol className="flex items-start overflow-x-auto pb-1" aria-label="Application stages">
        {TRACKER_STAGE_IDS.map((id, i) => {
          const done = active > i;
          const isNow = active === i;
          const last = i === TRACKER_STAGE_IDS.length - 1;
          return (
            <li key={id} className="flex min-w-0 flex-1 items-start">
              <div className="flex min-w-0 flex-col items-center px-1 text-center">
                <span
                  aria-hidden
                  className={
                    'flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 text-sm font-semibold transition-colors ' +
                    (done
                      ? 'border-emerald-600 bg-emerald-600 text-white'
                      : isNow
                        ? 'border-brand-600 bg-brand-600 text-white ring-4 ring-brand-100'
                        : 'border-slate-300 bg-white text-slate-400')
                  }
                >
                  {done ? '✓' : i + 1}
                </span>
                <span
                  className={
                    'mt-2 block max-w-[7.5rem] break-words text-xs font-medium ' +
                    (done || isNow ? 'text-slate-900' : 'text-slate-400')
                  }
                >
                  {statusName(id)}
                  {isNow && <span className="sr-only"> (current stage)</span>}
                </span>
                {isNow && !attention && (
                  <span className="mt-1 rounded-full bg-brand-100 px-2 py-0.5 text-[10px] font-medium text-brand-700">
                    you are here
                  </span>
                )}
              </div>
              {!last && (
                <span
                  className={'mt-4 h-0.5 min-w-4 flex-1 rounded ' + (done ? 'bg-emerald-500' : 'bg-slate-200')}
                  aria-hidden
                />
              )}
            </li>
          );
        })}
      </ol>

      <div className="mt-6">
        <Banner tone={attention ? 'attention' : bad ? 'bad' : 'info'} title={statusName(status)}>
          {stage(status)?.blurb ?? statusBlurb(status)}
        </Banner>
      </div>
    </div>
  );
}

/* --------------------------------- documents -------------------------------- */

function DocumentCards({ docs }: { docs: VendorDocumentRecord[] }) {
  if (!docs.length) return <Empty>No documents recorded yet.</Empty>;
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {docs.map((d) => {
        const type = DOC_TYPES[d.docType ?? -1];
        const extracted = parseJson<Record<string, unknown>[]>(d.extractedFields, []);
        const flat = Array.isArray(extracted) ? (extracted[0] ?? {}) : {};
        return (
          <article key={d.id ?? d.docId} className="rounded-xl border border-slate-200 p-4">
            <header className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h4 className="truncate text-sm font-semibold">{type?.label ?? d.docId}</h4>
                {type && <p className="mt-0.5 break-words text-xs text-slate-400">{type.hint}</p>}
              </div>
              <span
                className={
                  'shrink-0 rounded-full border px-2 py-0.5 text-xs font-medium ' +
                  (d.valid
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                    : 'border-slate-200 bg-slate-50 text-slate-500')
                }
              >
                {d.valid ? 'Validated' : 'In review'}
              </span>
            </header>
            {d.expiryDate && (
              <p className="mt-3 text-xs text-slate-500">Expires {String(d.expiryDate).slice(0, 10)}</p>
            )}
            {Object.keys(flat).length > 0 && (
              <dl className="mt-3 space-y-1 border-t border-slate-100 pt-3">
                {Object.entries(flat)
                  .filter(([k]) => k !== 'docType')
                  .slice(0, 5)
                  .map(([k, v]) => (
                    <div key={k} className="flex flex-wrap gap-x-2 text-xs">
                      <dt className="text-slate-400">{k}</dt>
                      <dd className="min-w-0 break-words font-medium text-slate-700">{String(v)}</dd>
                    </div>
                  ))}
              </dl>
            )}
            {d.issueNote && (
              <p className="mt-3 break-words rounded-lg bg-slate-50 p-2.5 text-xs leading-relaxed text-slate-600">
                {d.issueNote}
              </p>
            )}
          </article>
        );
      })}
    </div>
  );
}

function Feedback({ issues }: { issues: string | undefined }) {
  const parsed = parseJson<ValidationIssue[]>(issues, []);
  if (!parsed.length) return null;
  return (
    <ul className="space-y-3">
      {parsed.map((issue, i) => (
        <li key={i} className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-amber-900">
              {issue.docType ?? 'packet'}
              {issue.field ? ` · ${issue.field}` : ''}
            </span>
            {issue.severity && (
              <span
                className={
                  'rounded-md px-1.5 py-0.5 text-xs font-medium ' +
                  (issue.severity === 'blocking' ? 'bg-red-200 text-red-900' : 'bg-amber-200 text-amber-900')
                }
              >
                {issue.severity}
              </span>
            )}
          </div>
          <p className="mt-1.5 break-words text-sm leading-relaxed text-amber-900">{issue.note}</p>
        </li>
      ))}
    </ul>
  );
}

/* ---------------------------------- forms ----------------------------------- */

function NewSubmission({
  svc,
  onDone,
  onCancel,
}: {
  svc: VendorService;
  onDone: (ref: string) => void;
  onCancel: () => void;
}) {
    const [legalName, setLegalName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [country, setCountry] = useState('');
  const [files, setFiles] = useState<Record<string, File | null>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const ref = 'VND-' + Date.now().toString(36).toUpperCase().slice(-5) + Math.floor(Math.random() * 1296).toString(36).toUpperCase().padStart(2, '0');
    try {
      // Documents first, vendor row last: creating the Vendor record is what
      // fires the flow's Data Fabric trigger, so every document (with its
      // extracted text) must already be in place when the flow wakes up.
      for (let i = 0; i < DOC_TYPES.length; i++) {
        const dt = DOC_TYPES[i];
        const file = files[dt.key];
        if (!file) continue;
        const rawText = await extractFileText(file);
        await svc.createDocument(
          {
            docId: `${ref}-${dt.key}`,
            vendorId: ref,
            docType: i,
            issueNote: `${file.name} uploaded via portal - awaiting extraction`,
            extractedFields: rawText ? JSON.stringify({ rawText }) : '',
          },
          file,
        );
      }
      await svc.createVendor({ vendorId: ref, legalName: legalName.trim(), country: country.trim(), contactEmail: contactEmail.trim() });
      onDone(ref);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Submission failed');
      setBusy(false);
    }
  };

  const uploaded = Object.values(files).filter(Boolean).length;

  return (
    <Card
      title="New vendor submission"
      subtitle="Register your company and upload the four required documents."
      action={
        <Button variant="secondary" onClick={onCancel} className="!px-3 !py-1.5">
          Cancel
        </Button>
      }
    >
      <form onSubmit={submit}>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
            <span className="text-xs uppercase tracking-wide text-slate-400">Your reference</span>
            <p className="mt-0.5 text-sm font-medium text-slate-600">Generated automatically when you submit</p>
          </div>
          <FieldLabel label="Contact email" hint="We use this to notify you about your application.">
            <TextInput required type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="finance@yourcompany.com" />
          </FieldLabel>
          <FieldLabel label="Country">
            <TextInput required value={country} onChange={(e) => setCountry(e.target.value)} placeholder="AE" />
          </FieldLabel>
          <div className="sm:col-span-2">
            <FieldLabel label="Legal entity name">
              <TextInput
                required
                value={legalName}
                onChange={(e) => setLegalName(e.target.value)}
                placeholder="Exactly as printed on your trade licence"
              />
            </FieldLabel>
          </div>
        </div>

        <div className="mt-7 flex items-baseline justify-between">
          <h3 className="text-sm font-semibold">Required documents</h3>
          <span className="text-xs tabular-nums text-slate-400">
            {uploaded} of {DOC_TYPES.length} attached
          </span>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {DOC_TYPES.map((dt) => {
            const f = files[dt.key];
            return (
              <label
                key={dt.key}
                className={
                  'block cursor-pointer rounded-xl border-2 border-dashed p-4 transition-colors ' +
                  (f
                    ? 'border-emerald-300 bg-emerald-50/70'
                    : 'border-slate-200 hover:border-brand-500 hover:bg-brand-50/40')
                }
              >
                <span className="block text-sm font-medium">{dt.label}</span>
                <span className="mt-0.5 block break-words text-xs text-slate-400">{dt.hint}</span>
                <input
                  type="file"
                  accept="application/pdf,image/*"
                  className="sr-only"
                  onChange={(e) => setFiles((s) => ({ ...s, [dt.key]: e.target.files?.[0] ?? null }))}
                />
                <span
                  className={
                    'mt-3 inline-block break-all rounded-lg px-3 py-1.5 text-xs font-medium ' +
                    (f ? 'bg-emerald-600 text-white' : 'bg-slate-900 text-white')
                  }
                >
                  {f ? `✓ ${f.name}` : 'Choose file'}
                </span>
              </label>
            );
          })}
        </div>

        {error && (
          <div className="mt-4">
            <Banner tone="bad">{error}</Banner>
          </div>
        )}
        <Button type="submit" disabled={busy} className="mt-6 w-full sm:w-auto">
          {busy ? 'Submitting…' : 'Submit application'}
        </Button>
      </form>
    </Card>
  );
}

/* --------------------------------- entry gate -------------------------------- */

function EntryChoice({ onNew, onTrack }: { onNew: () => void; onTrack: (ref: string) => void }) {
  const [mode, setMode] = useState<'choose' | 'track'>('choose');
  const [ref, setRef] = useState('');

  return (
    <div className="flex justify-center pt-6">
      <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-8 shadow-card">
        <h2 className="text-xl font-semibold tracking-tight">Welcome to VendorGate</h2>
        <p className="mt-1 text-sm text-slate-500">
          Register as a supplier, or check where your submission has reached.
        </p>

        {mode === 'choose' ? (
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <button
              onClick={onNew}
              className="group rounded-xl border-2 border-slate-200 p-6 text-left transition-colors hover:border-brand-500 hover:bg-brand-50/50"
            >
              <span
                className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-100 text-brand-700 transition-colors group-hover:bg-brand-600 group-hover:text-white"
                aria-hidden
              >
                <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5">
                  <path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </span>
              <span className="mt-3 block text-base font-semibold">New vendor submission</span>
              <span className="mt-1 block text-sm leading-relaxed text-slate-500">
                Register your company and upload your compliance documents.
              </span>
            </button>
            <button
              onClick={() => setMode('track')}
              className="group rounded-xl border-2 border-slate-200 p-6 text-left transition-colors hover:border-brand-500 hover:bg-brand-50/50"
            >
              <span
                className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-100 text-brand-700 transition-colors group-hover:bg-brand-600 group-hover:text-white"
                aria-hidden
              >
                <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5">
                  <circle cx="9" cy="9" r="5.5" stroke="currentColor" strokeWidth="2" />
                  <path d="m13.5 13.5 3 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </span>
              <span className="mt-3 block text-base font-semibold">Track your submission</span>
              <span className="mt-1 block text-sm leading-relaxed text-slate-500">
                Enter your reference to see the current stage and any feedback.
              </span>
            </button>
          </div>
        ) : (
          <div className="mt-6">
            <FieldLabel label="Your reference">
              <div className="flex flex-wrap gap-3">
                <TextInput
                  autoFocus
                  value={ref}
                  onChange={(e) => setRef(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && ref.trim() && onTrack(ref.trim())}
                  placeholder="VND-1001"
                  className="min-w-0 flex-1"
                />
                <Button onClick={() => ref.trim() && onTrack(ref.trim())}>Track</Button>
              </div>
            </FieldLabel>
            <Button variant="ghost" onClick={() => setMode('choose')} className="mt-4 !px-2 !py-1 text-xs">
              ← Back
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}


function ResubmitPanel({ svc, vendor, onDone }: { svc: VendorService; vendor: VendorRecord; onDone: () => void }) {
  const [files, setFiles] = useState<Record<string, File | null>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const picked = Object.values(files).filter(Boolean).length;

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const stamp = Date.now().toString(36);
      const entries = [];
      for (let i = 0; i < DOC_TYPES.length; i++) {
        const dt = DOC_TYPES[i];
        const file = files[dt.key];
        if (!file) continue;
        const rawText = await extractFileText(file);
        entries.push({
          docType: i,
          docId: `${vendor.vendorId}-${dt.key}-r${stamp}`,
          issueNote: `${file.name} - corrected resubmission`,
          extractedFields: rawText ? JSON.stringify({ rawText }) : '',
          file,
        });
      }
      await svc.resubmit(vendor, entries);
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Resubmission failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card
      title="Update & resubmit"
      subtitle="Upload the corrected documents. Only the ones you replace are resubmitted."
    >
      <div className="grid gap-3 sm:grid-cols-2">
        {DOC_TYPES.map((dt) => {
          const f = files[dt.key];
          return (
            <label
              key={dt.key}
              className={
                'block cursor-pointer rounded-xl border-2 border-dashed p-4 transition-colors ' +
                (f ? 'border-emerald-300 bg-emerald-50/70' : 'border-slate-200 hover:border-brand-500 hover:bg-brand-50/40')
              }
            >
              <span className="block text-sm font-medium">{dt.label}</span>
              <input
                type="file"
                accept="application/pdf,image/*"
                className="sr-only"
                onChange={(e) => setFiles((s) => ({ ...s, [dt.key]: e.target.files?.[0] ?? null }))}
              />
              <span
                className={
                  'mt-3 inline-block break-all rounded-lg px-3 py-1.5 text-xs font-medium ' +
                  (f ? 'bg-emerald-600 text-white' : 'bg-slate-900 text-white')
                }
              >
                {f ? `✓ ${f.name}` : 'Replace file'}
              </span>
            </label>
          );
        })}
      </div>
      {error && (
        <div className="mt-4">
          <Banner tone="bad">{error}</Banner>
        </div>
      )}
      <Button onClick={submit} disabled={busy || picked === 0} className="mt-5">
        {busy
          ? 'Resubmitting…'
          : picked === 0
            ? 'Choose at least one corrected file'
            : `Resubmit ${picked} document${picked > 1 ? 's' : ''}`}
      </Button>
      <p className="mt-3 text-xs text-slate-500">
        Resubmission moves your application back to review; procurement completes the open task.
      </p>
    </Card>
  );
}

/* ----------------------------------- page ----------------------------------- */

export default function VendorPage({ svc }: { svc: VendorService }) {
  const [view, setView] = useState<'gate' | 'new' | 'track'>('gate');
  const [reference, setReference] = useState<string | null>(null);
  const [vendor, setVendor] = useState<VendorRecord | null>(null);
  const [docs, setDocs] = useState<VendorDocumentRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [justSubmitted, setJustSubmitted] = useState(false);

  const load = useCallback(
    async (ref: string) => {
      const v = await svc.findVendor(ref);
      setVendor(v);
      setDocs(v ? await svc.listDocuments(ref) : []);
      setLoading(false);
    },
    [svc],
  );

  useEffect(() => {
    if (view !== 'track' || !reference) return;
    setLoading(true);
    load(reference);
    const t = setInterval(() => load(reference), 10000);
    return () => clearInterval(t);
  }, [view, reference, load]);

  const goTrack = (ref: string, submitted = false) => {
    setReference(ref);
    setJustSubmitted(submitted);
    setView('track');
  };

  if (view === 'gate') {
    return <EntryChoice onNew={() => setView('new')} onTrack={(r) => goTrack(r)} />;
  }

  if (view === 'new') {
    return <NewSubmission svc={svc} onDone={(ref) => goTrack(ref, true)} onCancel={() => setView('gate')} />;
  }

  return (
    <div className="space-y-6">
      {justSubmitted && (
        <Banner tone="good" title="Submission received">
          Keep your reference <strong>{reference}</strong> — you can return any time to check progress.
        </Banner>
      )}

      <Card
        title={vendor?.legalName || reference || ''}
        subtitle={`Reference ${reference}`}
        action={
          <div className="flex items-center gap-3">
            {vendor && <StatusPill status={vendor.status} />}
            <Button
              variant="secondary"
              onClick={() => {
                setView('gate');
                setVendor(null);
                setJustSubmitted(false);
              }}
              className="!px-3 !py-1.5"
            >
              Exit
            </Button>
          </div>
        }
      >
        {loading && !vendor ? (
          <Spinner />
        ) : !vendor ? (
          <Empty>
            No submission found for <strong>{reference}</strong>. Check the reference and try again.
          </Empty>
        ) : (
          <>
            <Stepper status={vendor.status} />
            <dl className="mt-6 grid gap-4 border-t border-slate-100 pt-5 sm:grid-cols-3">
              <Field label="Country">{vendor.country || '—'}</Field>
              <Field label="Risk tier">{riskTierName(vendor.riskTier)}</Field>
              <Field label="Submitted">{vendor.submittedAt ? String(vendor.submittedAt).slice(0, 10) : '—'}</Field>
            </dl>
          </>
        )}
      </Card>

      {vendor?.status === 2 && (
        <Card
          title="What we need from you"
          subtitle={
            vendor.queryDeadline
              ? `Please respond by ${String(vendor.queryDeadline).slice(0, 16).replace('T', ' ')} (UTC)`
              : 'Correct the items below and resubmit the affected documents.'
          }
        >
          <Feedback issues={vendor.issues} />
        </Card>
      )}

      {vendor?.status === 2 && (
        <ResubmitPanel svc={svc} vendor={vendor} onDone={() => reference && load(reference)} />
      )}

      {vendor && (
        <Card title="Your documents" subtitle={`${docs.length} on file`}>
          <DocumentCards docs={docs} />
        </Card>
      )}

      <p className="text-center text-xs text-slate-400">This page refreshes every 10 seconds.</p>
    </div>
  );
}
