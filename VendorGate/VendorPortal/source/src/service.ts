import type { Entities } from '@uipath/uipath-typescript/entities';
import type { VendorRecord, VendorDocumentRecord, ValidationIssue } from './types';
import { parseJson } from './types';
import {
  createDocument as liveCreateDocument,
  createVendor as liveCreateVendor,
  findVendor as liveFindVendor,
  listDocuments as liveListDocuments,
  listVendors as liveListVendors,
  updateVendorStatus as liveUpdateVendorStatus,
} from './data';
import demoData from './demo-data.json';

/** One interface for both backends so the pages never care which is active. */
export interface VendorService {
  readonly mode: 'live' | 'demo';
  listVendors(): Promise<VendorRecord[]>;
  findVendor(vendorId: string): Promise<VendorRecord | null>;
  listDocuments(vendorId: string): Promise<VendorDocumentRecord[]>;
  updateVendorStatus(recordId: string, status: number): Promise<void>;
  /** Procurement: return to vendor with a written reason. */
  sendBack(vendor: VendorRecord, note: string): Promise<void>;
  /** Vendor: upload corrected documents and mark the case resubmitted. */
  resubmit(
    vendor: VendorRecord,
    files: {
      docType: number;
      docId: string;
      issueNote: string;
      extractedFields?: string;
      file?: File | null;
    }[],
  ): Promise<void>;
  createVendor(data: {
    vendorId: string;
    legalName: string;
    country: string;
    contactEmail?: string;
  }): Promise<void>;
  createDocument(
    data: {
      docId: string;
      vendorId: string;
      docType: number;
      issueNote: string;
      extractedFields?: string;
    },
    file?: File | null,
  ): Promise<void>;
}

function sendBackIssues(vendor: VendorRecord, note: string): string {
  const existing = parseJson<ValidationIssue[]>(vendor.issues, []);
  existing.push({
    docType: 'procurement',
    field: 'review',
    severity: 'blocking',
    note,
  });
  return JSON.stringify(existing);
}

export function liveService(entities: Entities): VendorService {
  return {
    mode: 'live',
    listVendors: () => liveListVendors(entities),
    findVendor: (id) => liveFindVendor(entities, id),
    listDocuments: (id) => liveListDocuments(entities, id),
    updateVendorStatus: async (recordId, status) => {
      await liveUpdateVendorStatus(entities, recordId, status);
    },
    sendBack: async (vendor, note) => {
      if (!vendor.id) return;
      await liveUpdateVendorStatus(entities, vendor.id, 2, {
        issues: sendBackIssues(vendor, note),
        queryDeadline: new Date(Date.now() + 48 * 3600 * 1000).toISOString(),
      });
    },
    resubmit: async (vendor, files) => {
      for (const f of files) {
        if (!f.file) continue;
        await liveCreateDocument(
          entities,
          {
            docId: f.docId,
            vendorId: vendor.vendorId!,
            docType: f.docType,
            issueNote: f.issueNote,
            extractedFields: f.extractedFields,
          },
          f.file,
        );
      }
      if (vendor.id) {
        await liveUpdateVendorStatus(entities, vendor.id, 0, { issues: '[]' });
      }
    },
    createVendor: async (d) => {
      await liveCreateVendor(entities, d);
    },
    createDocument: async (d, file) => {
      await liveCreateDocument(entities, d, file);
    },
  };
}

/**
 * Demo mode: a real Data Fabric snapshot bundled at build time, mutated only in
 * this browser tab. No credentials exist in the bundle — writes are sandboxed.
 */
export function demoService(): VendorService {
  // The snapshot exporter strips server audit columns (including Id) — without
  // an id, row clicks and status actions silently no-op. Assign stable ones.
  const vendors: VendorRecord[] = JSON.parse(JSON.stringify(demoData.vendors)).map(
    (v: VendorRecord, i: number) => ({ ...v, id: v.id ?? `snap-v-${i}` }),
  );
  const documents: VendorDocumentRecord[] = JSON.parse(JSON.stringify(demoData.documents)).map(
    (d: VendorDocumentRecord, i: number) => ({ ...d, id: d.id ?? `snap-d-${i}` }),
  );
  let seq = 1;
  const wait = <T,>(v: T) => new Promise<T>((r) => setTimeout(() => r(v), 150));

  return {
    mode: 'demo',
    listVendors: () => wait([...vendors]),
    findVendor: (vendorId) =>
      wait(vendors.filter((v) => v.vendorId === vendorId).slice(-1)[0] ?? null),
    listDocuments: (vendorId) => wait(documents.filter((d) => d.vendorId === vendorId)),
    updateVendorStatus: (recordId, status) =>
      wait(undefined).then(() => {
        const v = vendors.find((x) => x.id === recordId);
        if (v) {
          v.status = status;
          v.updatedAt = new Date().toISOString();
        }
      }),
    sendBack: (vendor, note) =>
      wait(undefined).then(() => {
        const v = vendors.find((x) => x.id === vendor.id);
        if (v) {
          v.status = 2;
          v.issues = sendBackIssues(v, note);
          v.queryDeadline = new Date(Date.now() + 48 * 3600 * 1000).toISOString();
          v.updatedAt = new Date().toISOString();
        }
      }),
    resubmit: (vendor, files) =>
      wait(undefined).then(() => {
        for (const f of files) {
          if (!f.file) continue;
          documents.push({
            id: 'demo-doc-' + seq++,
            docId: f.docId,
            vendorId: vendor.vendorId,
            docType: f.docType,
            issueNote: f.issueNote,
            extractedFields: f.extractedFields,
            valid: false,
          });
        }
        const v = vendors.find((x) => x.id === vendor.id);
        if (v) {
          v.status = 0;
          v.issues = '[]';
          v.updatedAt = new Date().toISOString();
        }
      }),
    createVendor: (d) =>
      wait(undefined).then(() => {
        const now = new Date().toISOString();
        vendors.push({ id: 'demo-' + seq++, ...d, status: 0, submittedAt: now, updatedAt: now });
      }),
    createDocument: (d) =>
      wait(undefined).then(() => {
        documents.push({ id: 'demo-doc-' + seq++, ...d, valid: false });
      }),
  };
}
