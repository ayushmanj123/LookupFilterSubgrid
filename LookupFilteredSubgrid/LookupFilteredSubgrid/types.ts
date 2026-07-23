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
  /** Row Edit action label (defaults to Edit). */
  editActionLabel: string;
  /** Row Delete action label (defaults to Remove Other Name). */
  deleteActionLabel: string;
  /** Runtime default for create bind (e.g. contacts). */
  filterLookupEntitySetName: string;
  /** Grid columns from maker displayColumns text (parsed). */
  displayColumns: string[];
  /** Optional header labels aligned with displayColumns order. */
  displayColumnLabels: string[];
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

export const FORMATTED_VALUE_ANNOTATION =
  "@OData.Community.Display.V1.FormattedValue";

export interface ParsedDisplayColumns {
  displayColumns: string[];
  primaryNameAttribute: string;
}

/**
 * Parse maker Multiple/SingleLine text like `{fc_contact, name, firstname}` into
 * grid display keys (lookups expanded to FormattedValue annotation keys).
 * Newlines are treated as separators so long multi-line lists work.
 */
export function parseDisplayColumns(
  raw: string | null | undefined,
  filterAttributeLogicalName?: string
): ParsedDisplayColumns {
  let text = (raw || "").trim();
  if (text.startsWith("{")) {
    text = text.slice(1);
  }
  if (text.endsWith("}")) {
    text = text.slice(0, -1);
  }
  text = text.replace(/[\r\n]+/g, ",").trim();

  const filterAttr = (filterAttributeLogicalName || "").trim().toLowerCase();
  const tokens = text
    .split(",")
    .map((t) => t.trim().toLowerCase())
    .filter((t) => t.length > 0);

  const displayColumns: string[] = [];
  for (const token of tokens) {
    if (token.includes("@")) {
      displayColumns.push(token);
      continue;
    }
    if (/^_[a-z0-9_]+_value$/.test(token)) {
      displayColumns.push(`${token}${FORMATTED_VALUE_ANNOTATION}`);
      continue;
    }
    if (filterAttr && token === filterAttr) {
      displayColumns.push(`_${token}_value${FORMATTED_VALUE_ANNOTATION}`);
      continue;
    }
    displayColumns.push(token);
  }

  let primaryNameAttribute = "";
  for (const col of displayColumns) {
    const base = col.includes("@") ? col.split("@")[0] : col;
    if (col.includes(FORMATTED_VALUE_ANNOTATION) || /^_[a-z0-9_]+_value$/.test(base)) {
      continue;
    }
    primaryNameAttribute = base;
    break;
  }
  if (!primaryNameAttribute && displayColumns.length) {
    const first = displayColumns[0];
    primaryNameAttribute = first.includes("@") ? first.split("@")[0] : first;
  }

  return { displayColumns, primaryNameAttribute };
}

/**
 * Parse optional maker labels like `{Contact, Name, First Name}` (case preserved).
 * Same comma / brace / newline rules as display columns; empty tokens dropped.
 */
export function parseDisplayColumnLabels(raw: string | null | undefined): string[] {
  let text = (raw || "").trim();
  if (text.startsWith("{")) {
    text = text.slice(1);
  }
  if (text.endsWith("}")) {
    text = text.slice(0, -1);
  }
  text = text.replace(/[\r\n]+/g, ",").trim();
  return text
    .split(",")
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
}

export function getMissingConfigFields(config: ControlConfig): string[] {
  const missing: string[] = [];
  if (!config.lookupFieldLogicalName) missing.push("lookupFieldLogicalName");
  if (!config.targetEntityLogicalName) missing.push("targetEntityLogicalName");
  if (!config.targetEntitySetName) missing.push("targetEntitySetName");
  if (!config.filterAttributeLogicalName) missing.push("filterAttributeLogicalName");
  if (!config.displayColumns?.length) missing.push("displayColumns");
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

/** Parse maker pageSize; default 10; clamp to 1–100. */
export function resolvePageSize(raw: number | string | null | undefined): number {
  const n =
    typeof raw === "number"
      ? raw
      : parseInt(String(raw ?? "").trim(), 10);
  if (!Number.isFinite(n) || n < 1) {
    return 10;
  }
  return Math.min(100, Math.floor(n));
}

/**
 * Format date/time values for grid display as `7/23/2026 11:11 PM`.
 * Returns null when the value is not a recognizable date.
 */
export function formatDateTimeDisplay(value: unknown): string | null {
  const date = coerceToDate(value);
  if (!date) {
    return null;
  }

  const month = date.getMonth() + 1;
  const day = date.getDate();
  const year = date.getFullYear();
  let hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  if (hours === 0) {
    hours = 12;
  }
  const mm = minutes < 10 ? `0${minutes}` : String(minutes);
  return `${month}/${day}/${year} ${hours}:${mm} ${ampm}`;
}

function coerceToDate(value: unknown): Date | null {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  if (typeof value !== "string") {
    return null;
  }
  const s = value.trim();
  if (!s) {
    return null;
  }
  // OData / ISO: 2026-07-23T23:11:00Z or with offset / date-only
  if (/^\d{4}-\d{2}-\d{2}(T|\s|$)/.test(s)) {
    const d = new Date(s);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  // Legacy OData: /Date(1721776260000)/
  const msMatch = /^\/Date\((-?\d+)([+-]\d{4})?\)\/$/.exec(s);
  if (msMatch) {
    const d = new Date(Number(msMatch[1]));
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}
