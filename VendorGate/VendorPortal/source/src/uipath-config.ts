// Data Fabric entity ids for the VendorGate solution.
export const VENDOR_ENTITY_ID = '7d12060c-3d93-f111-9b33-6045bdd6d6ea';
export const VENDOR_DOCUMENT_ENTITY_ID = '9312060c-3d93-f111-9b33-6045bdd6d6ea';

// Vendor.status is a choice field; Data Fabric returns the numberId, not the name.
export type StageTone = 'progress' | 'attention' | 'good' | 'bad';

export const STATUS_STAGES: {
  id: number;
  name: string;
  blurb: string;
  tone: StageTone;
}[] = [
  { id: 0, name: 'Submitted', blurb: 'We have your packet.', tone: 'progress' },
  { id: 1, name: 'Extracting', blurb: 'Reading the four documents.', tone: 'progress' },
  { id: 2, name: 'Action required', blurb: 'We need corrections from you.', tone: 'attention' },
  { id: 3, name: 'Screening', blurb: 'Sanctions, debarment and adverse-media checks.', tone: 'progress' },
  { id: 4, name: 'Pending approval', blurb: 'With our approvers.', tone: 'progress' },
  { id: 5, name: 'Approved', blurb: 'Cleared by approvers.', tone: 'good' },
  { id: 6, name: 'Rejected', blurb: 'Not cleared.', tone: 'bad' },
  { id: 7, name: 'Provisioned', blurb: 'Live in our systems. You can start invoicing.', tone: 'good' },
  { id: 8, name: 'Failed', blurb: 'Provisioning failed and was rolled back.', tone: 'bad' },
];

// The happy-path spine shown in the tracker. Action required / Rejected / Failed
// are exits, surfaced separately rather than as steps.
export const TRACKER_STAGE_IDS = [0, 1, 3, 4, 5, 7];
export const TERMINAL_BAD_STATUSES = [6, 8];

export const RISK_TIERS = ['Low', 'Medium', 'High'];

export const DOC_TYPES = [
  { key: 'trade_licence', label: 'Trade licence', hint: 'Legal entity name, licence no., expiry, jurisdiction' },
  { key: 'insurance', label: 'Insurance certificate', hint: 'Insured entity, policy no., coverage, expiry' },
  { key: 'bank_letter', label: 'Bank details letter', hint: 'Account holder, IBAN, bank, SWIFT' },
  { key: 'iso_cert', label: 'ISO / compliance certificate', hint: 'Certified entity, standard, expiry' },
];

export function stage(id: number | undefined) {
  return STATUS_STAGES.find((s) => s.id === id);
}
export function statusName(id: number | undefined): string {
  return stage(id)?.name ?? 'Unknown';
}
export function statusBlurb(id: number | undefined): string {
  return stage(id)?.blurb ?? '';
}
export function riskTierName(id: number | undefined): string {
  return id === undefined || id === null ? '—' : (RISK_TIERS[id] ?? String(id));
}

export const TONE_CLASS: Record<StageTone, string> = {
  progress: 'bg-sky-100 text-sky-800 border-sky-200',
  attention: 'bg-amber-100 text-amber-900 border-amber-300',
  good: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  bad: 'bg-red-100 text-red-800 border-red-200',
};
