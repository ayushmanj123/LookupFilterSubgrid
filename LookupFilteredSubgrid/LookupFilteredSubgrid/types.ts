export interface ControlConfig {
  lookupFieldLogicalName: string;
  targetEntityLogicalName: string;
  filterAttributeLogicalName: string;
  /** Entity set name of the lookup target (e.g. cr123_applicants) for @odata.bind on create. */
  filterLookupEntitySetName: string;
  displayColumns: string[];
  primaryNameAttribute: string;
  pageSize: number;
  enableCreate: boolean;
  enableEdit: boolean;
  enableDelete: boolean;
  orderBy: string;
  useDemoData: boolean;
}

export function getMissingConfigFields(config: ControlConfig): string[] {
  const missing: string[] = [];
  if (!config.lookupFieldLogicalName) missing.push("lookupFieldLogicalName");
  if (!config.targetEntityLogicalName) missing.push("targetEntityLogicalName");
  if (!config.filterAttributeLogicalName) missing.push("filterAttributeLogicalName");
  if (!config.filterLookupEntitySetName) missing.push("filterLookupEntitySetName");
  if (!config.displayColumns.length) missing.push("displayColumns");
  if (!config.primaryNameAttribute) missing.push("primaryNameAttribute");
  return missing;
}

export function createDemoRecords(config: ControlConfig): EntityRecord[] {
  const nameCol = config.primaryNameAttribute || "name";
  const cols = config.displayColumns.length ? config.displayColumns : [nameCol];
  return [1, 2, 3].map((n) => {
    const row: EntityRecord = { id: `00000000-0000-0000-0000-00000000000${n}` };
    for (const col of cols) {
      row[col] = col === nameCol ? `Sample ${n}` : `Value ${n}`;
    }
    row[nameCol] = `Sample AKA ${n}`;
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
}

export type FormMode = "create" | "edit";

export interface RecordFormValues {
  [column: string]: string | number | boolean | null;
}

export function parseDisplayColumns(raw: string | null | undefined): string[] {
  if (!raw) {
    return [];
  }
  return raw
    .split(",")
    .map((c) => c.trim())
    .filter((c) => c.length > 0);
}

export function parseBooleanInput(value: unknown, defaultValue: boolean): boolean {
  if (value === null || value === undefined) {
    return defaultValue;
  }
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "string") {
    return value.toLowerCase() === "true" || value === "1";
  }
  if (typeof value === "number") {
    return value === 1;
  }
  return defaultValue;
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
