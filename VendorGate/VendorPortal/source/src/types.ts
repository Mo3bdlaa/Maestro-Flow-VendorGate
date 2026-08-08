export type VendorRecord = {
  id?: string;
  vendorId?: string;
  legalName?: string;
  country?: string;
  status?: number;
  riskTier?: number;
  riskScore?: number;
  issues?: string;
  screeningResult?: string;
  queryDeadline?: string;
  submittedAt?: string;
  updatedAt?: string;
};

export type VendorDocumentRecord = {
  id?: string;
  docId?: string;
  vendorId?: string;
  docType?: number;
  extractedFields?: string;
  expiryDate?: string;
  valid?: boolean;
  issueNote?: string;
};

export type ValidationIssue = {
  docType?: string;
  field?: string;
  severity?: string;
  note?: string;
};

export type ScreeningResult = {
  sanctionsHit?: boolean;
  debarmentHit?: boolean;
  adverseMedia?: { source?: string; summary?: string; severity?: string }[];
  recommendedTier?: string;
  rationale?: string;
  confidence?: number;
};

// Data Fabric hands back field names in whatever casing the read path used —
// the CLI shows PascalCase, the SDK shows the schema's camelCase. Normalise once
// on ingest so the UI only ever deals with camelCase.
function lowerFirst(s: string) {
  return s.charAt(0).toLowerCase() + s.slice(1);
}

export function normalize<T extends object>(raw: unknown): T {
  if (!raw || typeof raw !== 'object') return {} as T;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    out[lowerFirst(k)] = v;
  }
  // `Id` and `id` both land on `id`; keep whichever is a non-empty string.
  const r = raw as Record<string, unknown>;
  out.id = (r.Id ?? r.id ?? out.id) as string | undefined;
  return out as T;
}

export function parseJson<T>(raw: string | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}
