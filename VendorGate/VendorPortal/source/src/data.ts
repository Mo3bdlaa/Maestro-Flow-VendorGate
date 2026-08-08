import { Entities } from '@uipath/uipath-typescript/entities';
import { LogicalOperator, QueryFilterOperator } from '@uipath/uipath-typescript/entities';
import { VENDOR_ENTITY_ID, VENDOR_DOCUMENT_ENTITY_ID } from './uipath-config';
import type { VendorRecord, VendorDocumentRecord } from './types';
import { normalize } from './types';

type Page<T> = { items?: T[]; hasNextPage?: boolean; nextCursor?: unknown };

// Every list call returns ONE page — loop the cursor for the full set.
export async function listVendors(entities: Entities): Promise<VendorRecord[]> {
  const all: unknown[] = [];
  let cursor: unknown;
  for (let guard = 0; guard < 25; guard++) {
    const opts = { pageSize: 100, ...(cursor ? { cursor } : {}) };
    const page = (await entities.getAllRecords(
      VENDOR_ENTITY_ID,
      opts as Parameters<typeof entities.getAllRecords>[1],
    )) as Page<unknown>;
    all.push(...(page.items ?? []));
    if (!page.hasNextPage || !page.nextCursor) break;
    cursor = page.nextCursor;
  }
  return all.map((r) => normalize<VendorRecord>(r));
}

export async function findVendor(
  entities: Entities,
  vendorId: string,
): Promise<VendorRecord | null> {
  const res = (await entities.queryRecordsById(VENDOR_ENTITY_ID, {
    filterGroup: {
      logicalOperator: LogicalOperator.And,
      queryFilters: [
        { fieldName: 'vendorId', operator: QueryFilterOperator.Equals, value: vendorId },
      ],
    },
  })) as Page<unknown>;
  const items = (res.items ?? []).map((r) => normalize<VendorRecord>(r));
  // Newest row wins if a reference was reused across runs.
  return items.length ? items[items.length - 1] : null;
}

export async function listDocuments(
  entities: Entities,
  vendorId: string,
): Promise<VendorDocumentRecord[]> {
  const res = (await entities.queryRecordsById(VENDOR_DOCUMENT_ENTITY_ID, {
    filterGroup: {
      logicalOperator: LogicalOperator.And,
      queryFilters: [
        { fieldName: 'vendorId', operator: QueryFilterOperator.Equals, value: vendorId },
      ],
    },
  })) as Page<unknown>;
  return (res.items ?? []).map((r) => normalize<VendorDocumentRecord>(r));
}

export async function updateVendorStatus(
  entities: Entities,
  recordId: string,
  status: number,
  extra: Record<string, unknown> = {},
) {
  return entities.updateRecordById(VENDOR_ENTITY_ID, recordId, {
    status,
    updatedAt: new Date().toISOString(),
    ...extra,
  });
}

export async function createVendor(
  entities: Entities,
  data: { vendorId: string; legalName: string; country: string; contactEmail?: string },
) {
  const now = new Date().toISOString();
  return entities.insertRecordById(VENDOR_ENTITY_ID, {
    ...data,
    status: 0,
    submittedAt: now,
    updatedAt: now,
  });
}

export async function createDocument(
  entities: Entities,
  data: {
    docId: string;
    vendorId: string;
    docType: number;
    issueNote: string;
    extractedFields?: string;
  },
  file?: File | null,
) {
  const inserted = normalize<{ id?: string }>(
    await entities.insertRecordById(VENDOR_DOCUMENT_ENTITY_ID, { ...data, valid: false }),
  );
  // File-type fields go through the attachment API, never the record payload.
  if (file && inserted.id) {
    await entities.uploadAttachment(
      VENDOR_DOCUMENT_ENTITY_ID,
      inserted.id,
      'documentFile',
      file,
    );
  }
  return inserted;
}

export async function downloadDocument(entities: Entities, recordId: string): Promise<Blob> {
  return entities.downloadAttachment(
    VENDOR_DOCUMENT_ENTITY_ID,
    recordId,
    'documentFile',
  ) as Promise<Blob>;
}
