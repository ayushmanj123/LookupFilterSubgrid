export const EMPTY_GUID = "00000000-0000-0000-0000-000000000000";

export interface ControlConfig {
  lookupFieldLogicalName: string;
  targetEntityLogicalName: string;
  /** OData/Web API plural set name for /_api (e.g. akatables). */
  targetEntitySetName: string;
  filterAttributeLogicalName: string;
  /** Website/portal GUID for modal-form-template-path. */
  portalId: string;
  /** Form record GUID; empty GUID for Insert. */
  recordId: string;
  /** Insert Basic Form (entity form) GUID. */
  entityFormId: string;
  /** Edit Basic Form (entity form) GUID. */
  editEntityFormId: string;
  /** Create button label (defaults to Create). */
  createButtonLabel: string;
  /** Runtime default for create bind (e.g. contacts). */
  filterLookupEntitySetName: string;
  /** Resolved at runtime: primary name + createdon. */
  displayColumns: string[];
  primaryNameAttribute: string;
  pageSize: number;
  enableCreate: boolean;
  enableEdit: boolean;
  enableDelete: boolean;
  useDemoData: boolean;
}

export interface EntityMetadataInfo {
  primaryNameAttribute: string;
  entitySetName: string;
}

export function getMissingConfigFields(config: ControlConfig): string[] {
  const missing: string[] = [];
  if (!config.lookupFieldLogicalName) missing.push("lookupFieldLogicalName");
  if (!config.targetEntityLogicalName) missing.push("targetEntityLogicalName");
  if (!config.targetEntitySetName) missing.push("targetEntitySetName");
  if (!config.filterAttributeLogicalName) missing.push("filterAttributeLogicalName");
  if (!config.portalId) missing.push("portalId");
  if (!config.entityFormId) missing.push("entityFormId");
  if (!config.editEntityFormId) missing.push("editEntityFormId");
  return missing;
}

export function resolvePortalRecordId(recordId: string | null | undefined): string {
  const cleaned = (recordId || "").replace(/[{}]/g, "").trim();
  return cleaned || EMPTY_GUID;
}

export function buildModalFormUrl(
  portalId: string,
  recordId: string,
  entityFormId: string,
  associateLookup?: { paramName: string; recordId: string } | null
): string {
  const portal = (portalId || "").replace(/[{}]/g, "").trim() || EMPTY_GUID;
  const record = resolvePortalRecordId(recordId);
  const formId = (entityFormId || "").replace(/[{}]/g, "").trim();
  let url = `/_portal/modal-form-template-path/${portal}?id=${record}&entityformid=${formId}`;

  const paramName = (associateLookup?.paramName || "").trim();
  const associateId = (associateLookup?.recordId || "").replace(/[{}]/g, "").trim();
  if (paramName && associateId) {
    url += `&${encodeURIComponent(paramName)}=${encodeURIComponent(associateId)}`;
  }

  return url;
}

export function createDemoRecords(config: ControlConfig): EntityRecord[] {
  const nameCol = config.primaryNameAttribute || "name";
  const cols = config.displayColumns.length ? config.displayColumns : [nameCol, "createdon"];
  return [1, 2, 3].map((n) => {
    const row: EntityRecord = { id: `00000000-0000-0000-0000-00000000000${n}` };
    for (const col of cols) {
      if (col === nameCol) {
        row[col] = `Sample AKA ${n}`;
      } else if (col === "createdon") {
        row[col] = `2026-07-2${n}`;
      } else {
        row[col] = `Value ${n}`;
      }
    }
    return row;
  });
}

export interface EntityRecord {
  [key: string]: unknown;
  id?: string;
}

export interface LoadResult {
  entities: EntityRecord[];
  nextLink?: string;
  hasMore?: boolean;
}

export type FormMode = "create" | "edit";

export interface RecordFormValues {
  [column: string]: string | number | boolean | null;
}

export function normalizeGuid(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }
  const cleaned = value.replace(/[{}]/g, "").trim();
  if (!cleaned) {
    return null;
  }
  const guidPattern =
    /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
  return guidPattern.test(cleaned) ? cleaned.toLowerCase() : null;
}
