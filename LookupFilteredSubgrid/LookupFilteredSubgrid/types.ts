export interface ControlConfig {
  lookupFieldLogicalName: string;
  targetEntityLogicalName: string;
  filterAttributeLogicalName: string;
  /** Resolved at runtime from metadata (not a manifest property). */
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
  if (!config.filterAttributeLogicalName) missing.push("filterAttributeLogicalName");
  return missing;
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

export function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function buildFilterFetchXml(
  entityLogicalName: string,
  filterAttributeLogicalName: string,
  filterGuid: string,
  primaryNameAttribute: string,
  pageSize: number,
  pageNumber: number
): string {
  const top = Math.max(1, pageSize);
  const page = Math.max(1, pageNumber);
  const entity = escapeXml(entityLogicalName);
  const filterAttr = escapeXml(filterAttributeLogicalName);
  const primary = escapeXml(primaryNameAttribute || "name");
  const guid = escapeXml(filterGuid.replace(/[{}]/g, ""));

  return (
    `<fetch mapping="logical" returntotalrecordcount="true" page="${page}" count="${top}">` +
    `<entity name="${entity}">` +
    `<attribute name="${primary}" />` +
    `<attribute name="createdon" />` +
    `<filter type="and">` +
    `<condition attribute="${filterAttr}" operator="eq" value="${guid}" />` +
    `</filter>` +
    `<order attribute="createdon" descending="true" />` +
    `</entity>` +
    `</fetch>`
  );
}
