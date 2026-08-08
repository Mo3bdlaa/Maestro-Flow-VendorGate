import type { Entities } from '@uipath/uipath-typescript/entities';
import type { VendorRecord, VendorDocumentRecord } from './types';
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
  createVendor(data: { vendorId: string; legalName: string; country: string }): Promise<void>;
  createDocument(
    data: { docId: string; vendorId: string; docType: number; issueNote: string },
    file?: File | null,
  ): Promise<void>;
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
  const vendors: VendorRecord[] = JSON.parse(JSON.stringify(demoData.vendors));
  const documents: VendorDocumentRecord[] = JSON.parse(JSON.stringify(demoData.documents));
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
