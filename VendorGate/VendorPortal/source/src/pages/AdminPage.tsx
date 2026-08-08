import { useCallback, useEffect, useMemo, useState } from 'react';
import type { VendorService } from '../service';
import { Card, Empty, Field, Select, Spinner, StatTile, StatusPill, TextInput } from '../components/ui';
import { DOC_TYPES, STATUS_STAGES, riskTierName, statusName } from '../uipath-config';

import type {
  ScreeningResult,
  ValidationIssue,
  VendorDocumentRecord,
  VendorRecord,
} from '../types';
import { parseJson } from '../types';

const PAGE_SIZE = 25;

/* -------------------------------- vendor profile ------------------------------ */

function VendorProfile({
  svc,
  vendor,
  onBack,
  onChanged,
}: {
  svc: VendorService;
  vendor: VendorRecord;
  onBack: () => void;
  onChanged: () => void;
}) {
  const [docs, setDocs] = useState<VendorDocumentRecord[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [sendBackNote, setSendBackNote] = useState('');

  useEffect(() => {
    if (vendor.vendorId) {
      svc.listDocuments(vendor.vendorId).then(setDocs).catch(() => setDocs([]));
    }
  }, [svc, vendor.vendorId]);

  const issues = parseJson<ValidationIssue[]>(vendor.issues, []);
  const screening = parseJson<ScreeningResult>(vendor.screeningResult, {});
  const blocking = issues.filter((i) => i.severity === 'blocking').length;

  const act = async (status: number, label: string) => {
    if (!vendor.id) return;
    setBusy(true);
    setError(null);
    try {
      await svc.updateVendorStatus(vendor.id, status);
      setNote(`${label} — vendor record updated.`);
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <button
        onClick={onBack}
        className="text-sm text-slate-500 underline hover:text-slate-800"
      >
        ← All vendors
      </button>

      <Card
        title={vendor.legalName || vendor.vendorId || ''}
        subtitle={`Reference ${vendor.vendorId ?? '—'}`}
        action={<StatusPill status={vendor.status} />}
      >
        <dl className="grid gap-5 sm:grid-cols-4">
          <Field label="Country">{vendor.country || '—'}</Field>
          <Field label="Contact">{vendor.contactEmail || '—'}</Field>
          <Field label="Risk tier">{riskTierName(vendor.riskTier)}</Field>
          <Field label="Risk score">
            {vendor.riskScore ?? vendor.riskScore === 0 ? String(vendor.riskScore) : '—'}
          </Field>
          <Field label="Last updated">
            {vendor.updatedAt ? String(vendor.updatedAt).slice(0, 16).replace('T', ' ') : '—'}
          </Field>
        </dl>
      </Card>

      <Card title="Agent recommendations" subtitle="Screening and validation output from the flow">
        {!screening.rationale && issues.length === 0 ? (
          <Empty>The agents have not reported on this vendor yet.</Empty>
        ) : (
          <div className="space-y-6">
            {screening.rationale && (
              <div>
                <h4 className="text-sm font-semibold">Screening agent</h4>
                <div className="mt-2 flex flex-wrap gap-2">
                  <span
                    className={
                      'rounded-full px-2.5 py-0.5 text-xs font-medium ' +
                      (screening.sanctionsHit
                        ? 'bg-red-100 text-red-800'
                        : 'bg-emerald-100 text-emerald-800')
                    }
                  >
                    sanctions {screening.sanctionsHit ? 'HIT' : 'clear'}
                  </span>
                  <span
                    className={
                      'rounded-full px-2.5 py-0.5 text-xs font-medium ' +
                      (screening.debarmentHit
                        ? 'bg-red-100 text-red-800'
                        : 'bg-emerald-100 text-emerald-800')
                    }
                  >
                    debarment {screening.debarmentHit ? 'HIT' : 'clear'}
                  </span>
                  {screening.recommendedTier && (
                    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
                      recommends {screening.recommendedTier} risk
                    </span>
                  )}
                  {screening.confidence !== undefined && (
                    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-600">
                      confidence {Math.round(screening.confidence * 100)}%
                    </span>
                  )}
                </div>
                <p className="mt-3 break-words rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
                  {screening.rationale}
                </p>
                {(screening.adverseMedia ?? []).length > 0 && (
                  <ul className="mt-3 space-y-2">
                    {screening.adverseMedia!.map((m, i) => (
                      <li key={i} className="rounded-lg border border-slate-200 p-3 text-sm">
                        <span className="font-medium">{m.source}</span>
                        {m.severity && (
                          <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-900">
                            {m.severity}
                          </span>
                        )}
                        <p className="mt-1 break-words text-slate-600">{m.summary}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {issues.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold">
                  Validation agent{' '}
                  <span className="font-normal text-slate-500">
                    ({blocking} blocking of {issues.length})
                  </span>
                </h4>
                <ul className="mt-2 space-y-2">
                  {issues.map((it, i) => (
                    <li
                      key={i}
                      className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-amber-900">
                          {it.docType ?? 'packet'}
                          {it.field ? ` · ${it.field}` : ''}
                        </span>
                        {it.severity && (
                          <span
                            className={
                              'rounded px-1.5 py-0.5 text-xs ' +
                              (it.severity === 'blocking'
                                ? 'bg-red-200 text-red-900'
                                : 'bg-amber-200 text-amber-900')
                            }
                          >
                            {it.severity}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 break-words text-amber-900">{it.note}</p>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </Card>

      <Card title="Documents" subtitle={`${docs.length} on file`}>
        {docs.length === 0 ? (
          <Empty>No document rows for this vendor.</Empty>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {docs.map((d) => {
              const type = DOC_TYPES[d.docType ?? -1];
              const extracted = parseJson<Record<string, unknown>[]>(d.extractedFields, []);
              const flat = Array.isArray(extracted) ? (extracted[0] ?? {}) : {};
              return (
                <div key={d.id ?? d.docId} className="rounded-xl border border-slate-200 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <p className="min-w-0 truncate text-sm font-semibold">
                      {type?.label ?? d.docId}
                    </p>
                    <span
                      className={
                        'shrink-0 rounded-full border px-2 py-0.5 text-xs ' +
                        (d.valid
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                          : 'border-slate-200 bg-slate-50 text-slate-500')
                      }
                    >
                      {d.valid ? 'validated' : 'in review'}
                    </span>
                  </div>
                  {Object.keys(flat).length > 0 && (
                    <dl className="mt-3 space-y-1 border-t border-slate-100 pt-3">
                      {Object.entries(flat)
                        .filter(([k]) => k !== 'docType')
                        .slice(0, 5)
                        .map(([k, v]) => (
                          <div key={k} className="flex flex-wrap gap-x-2 text-xs">
                            <dt className="text-slate-400">{k}</dt>
                            <dd className="min-w-0 break-words font-medium text-slate-700">
                              {String(v)}
                            </dd>
                          </div>
                        ))}
                    </dl>
                  )}
                  {d.issueNote && (
                    <p className="mt-3 break-words rounded bg-slate-50 p-2 text-xs text-slate-600">
                      {d.issueNote}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Card title="Procurement actions" subtitle="Writes directly to the vendor record">
        {note && (
          <p className="mb-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
            {note}
          </p>
        )}
        {error && (
          <p className="mb-3 break-words rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          <button
            disabled={busy}
            onClick={() => act(5, 'Approved')}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
          >
            Approve
          </button>
          <button
            disabled={busy}
            onClick={() => act(6, 'Rejected')}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500 disabled:opacity-50"
          >
            Reject
          </button>
        </div>

        <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50/50 p-4">
          <label className="block text-sm font-semibold text-amber-900">
            Send back to vendor
          </label>
          <p className="mt-0.5 text-xs text-amber-800">
            Tell the vendor exactly what to fix — your note appears on their tracking page.
          </p>
          <textarea
            value={sendBackNote}
            onChange={(e) => setSendBackNote(e.target.value)}
            rows={3}
            placeholder="e.g. The insurance certificate is expired - please upload a policy valid beyond the next 30 days."
            className="mt-3 w-full rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:border-amber-500 focus:outline-none"
          />
          <button
            disabled={busy || !sendBackNote.trim()}
            onClick={async () => {
              setBusy(true);
              setError(null);
              try {
                await svc.sendBack(vendor, sendBackNote.trim());
                setNote('Sent back to vendor with your note.');
                setSendBackNote('');
                onChanged();
              } catch (err) {
                setError(err instanceof Error ? err.message : 'Update failed');
              } finally {
                setBusy(false);
              }
            }}
            className="mt-3 rounded-lg border border-amber-400 bg-amber-100 px-4 py-2 text-sm font-medium text-amber-900 hover:bg-amber-200 disabled:opacity-50"
          >
            Send back with note
          </button>
        </div>

        <p className="mt-3 text-xs text-slate-500">
          Approval tasks raised by the flow are completed in Action Center; these buttons
          override the record directly.
        </p>
      </Card>
    </div>
  );
}

/* ----------------------------------- list ------------------------------------ */

export default function AdminPage({ svc }: { svc: VendorService }) {
  const [vendors, setVendors] = useState<VendorRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<number | 'all'>('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const rows = await svc.listVendors();
      // Rows without a reference are unusable in the UI — surface only real ones.
      setVendors(rows.filter((v) => v.vendorId));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load vendors');
    } finally {
      setLoading(false);
    }
  }, [svc]);

  useEffect(() => {
    load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return vendors
      .filter((v) => (statusFilter === 'all' ? true : v.status === statusFilter))
      .filter((v) =>
        !q
          ? true
          : `${v.vendorId ?? ''} ${v.legalName ?? ''} ${v.country ?? ''}`.toLowerCase().includes(q),
      )
      .sort((a, b) => String(b.updatedAt ?? '').localeCompare(String(a.updatedAt ?? '')));
  }, [vendors, statusFilter, search]);

  const selected = vendors.find((v) => v.id === selectedId) ?? null;
  if (selected) {
    return (
      <VendorProfile
        svc={svc}
        vendor={selected}
        onBack={() => setSelectedId(null)}
        onChanged={load}
      />
    );
  }

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, pageCount - 1);
  const rows = filtered.slice(current * PAGE_SIZE, current * PAGE_SIZE + PAGE_SIZE);

  const counts = new Map<number, number>();
  for (const v of vendors) counts.set(v.status ?? -1, (counts.get(v.status ?? -1) ?? 0) + 1);

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-4">
        {[
          { label: 'Vendors', value: vendors.length },
          { label: 'Action required', value: counts.get(2) ?? 0 },
          { label: 'Pending approval', value: counts.get(4) ?? 0 },
          { label: 'Provisioned', value: counts.get(7) ?? 0 },
        ].map((s) => (
          <StatTile key={s.label} label={s.label} value={s.value} accent={s.label !== 'Vendors' && Number(s.value) > 0} />
        ))}
      </div>

      <Card
        title="Vendors"
        subtitle={`${filtered.length} of ${vendors.length} shown`}
        action={
          <button
            onClick={load}
            className="shrink-0 rounded-lg border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50"
          >
            Refresh
          </button>
        }
      >
        <div className="mb-4 flex flex-wrap gap-3">
          <TextInput value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} placeholder="Search reference, name or country" className="min-w-0 flex-1" />
          <Select value={String(statusFilter)} onChange={(e) => { setStatusFilter(e.target.value === 'all' ? 'all' : Number(e.target.value)); setPage(0); }}>
            <option value="all">All statuses</option>
            {STATUS_STAGES.map((st) => (<option key={st.id} value={st.id}>{st.name}</option>))}
          </Select>
        </div>

        {loading ? (
          <Spinner />
        ) : error ? (
          <p className="break-words rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </p>
        ) : rows.length === 0 ? (
          <Empty>No vendors match this filter.</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-400">
                  <th className="py-2 pr-4 font-medium">Reference</th>
                  <th className="py-2 pr-4 font-medium">Legal name</th>
                  <th className="py-2 pr-4 font-medium">Country</th>
                  <th className="py-2 pr-4 font-medium">Status</th>
                  <th className="py-2 pr-4 font-medium">Risk</th>
                  <th className="py-2 pr-4 font-medium">Updated</th>
                  <th className="py-2 font-medium" />
                </tr>
              </thead>
              <tbody>
                {rows.map((v) => (
                  <tr
                    key={v.id ?? v.vendorId}
                    onClick={() => v.id && setSelectedId(v.id)}
                    className="cursor-pointer border-b border-slate-100 hover:bg-slate-50"
                  >
                    <td className="py-2.5 pr-4 font-medium">{v.vendorId}</td>
                    <td className="max-w-[220px] truncate py-2.5 pr-4">{v.legalName}</td>
                    <td className="py-2.5 pr-4">{v.country}</td>
                    <td className="py-2.5 pr-4">
                      <StatusPill status={v.status} />
                    </td>
                    <td className="py-2.5 pr-4">
                      {riskTierName(v.riskTier)}
                      {v.riskScore !== undefined && v.riskScore !== null ? ` (${v.riskScore})` : ''}
                    </td>
                    <td className="whitespace-nowrap py-2.5 pr-4 text-slate-500">
                      {v.updatedAt ? String(v.updatedAt).slice(0, 10) : '—'}
                    </td>
                    <td className="py-2.5">
                      <span className="rounded border border-slate-300 px-2.5 py-1 text-xs">
                        Open
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {pageCount > 1 && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm">
            <span className="text-slate-500">
              Showing {current * PAGE_SIZE + 1}–{Math.min((current + 1) * PAGE_SIZE, filtered.length)}{' '}
              of {filtered.length}
            </span>
            <div className="flex gap-2">
              <button
                disabled={current === 0}
                onClick={() => setPage(current - 1)}
                className="rounded border border-slate-300 px-3 py-1 disabled:opacity-40"
              >
                Prev
              </button>
              <span className="px-2 py-1 text-slate-500">
                {current + 1} / {pageCount}
              </span>
              <button
                disabled={current >= pageCount - 1}
                onClick={() => setPage(current + 1)}
                className="rounded border border-slate-300 px-3 py-1 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

export { statusName };
