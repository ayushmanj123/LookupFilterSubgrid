export type FilterNode =
  | { kind: "raw"; expression: string }
  | { kind: "and"; parts: FilterNode[] }
  | { kind: "or"; parts: FilterNode[] }
  | { kind: "not"; part: FilterNode };

export interface OrderByClause {
  field: string;
  direction: "asc" | "desc";
}

export interface ExpandClause {
  navigation: string;
  select?: string[];
}

export interface ODataQueryOptions {
  select?: string[];
  filter?: FilterNode;
  orderby?: OrderByClause[];
  top?: number;
  skip?: number;
  expand?: ExpandClause[];
}

export const FORMATTED_VALUE_ANNOTATION = "@OData.Community.Display.V1.FormattedValue";

/**
 * Maps display/config columns to valid $select fields.
 * Annotation keys like `_fc_contact_value@OData...FormattedValue` become `_fc_contact_value`
 * (FormattedValue is requested via Prefer header, not $select).
 */
export function toODataSelectFields(columns: string[]): string[] {
  const out: string[] = [];
  for (const raw of columns || []) {
    const col = (raw || "").trim();
    if (!col) {
      continue;
    }
    const base = col.includes("@") ? col.split("@")[0] : col;
    if (base && !out.includes(base)) {
      out.push(base);
    }
  }
  return out;
}

/** Strip FormattedValue annotation so $orderby uses the underlying attribute. */
export function toODataOrderByField(column: string | null | undefined): string {
  const col = (column || "").trim();
  if (!col) {
    return "createdon";
  }
  return col.includes("@") ? col.split("@")[0] : col;
}

function formatLiteral(value: string | number | boolean): string {
  if (typeof value === "string") {
    return `'${value.replace(/'/g, "''")}'`;
  }
  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }
  return String(value);
}

export function eq(field: string, value: string | number | boolean): FilterNode {
  return { kind: "raw", expression: `${field} eq ${formatLiteral(value)}` };
}

/** Lookup GUID equality: `_attributename_value eq guid` (unquoted GUID for Dataverse). */
export function lookupEq(attributeLogicalName: string, guid: string): FilterNode {
  const clean = String(guid || "").replace(/[{}]/g, "");
  return {
    kind: "raw",
    expression: `_${attributeLogicalName}_value eq ${clean}`,
  };
}

export function and(...parts: FilterNode[]): FilterNode {
  const filtered = parts.filter(Boolean);
  if (filtered.length === 1) {
    return filtered[0];
  }
  return { kind: "and", parts: filtered };
}

export function or(...parts: FilterNode[]): FilterNode {
  const filtered = parts.filter(Boolean);
  if (filtered.length === 1) {
    return filtered[0];
  }
  return { kind: "or", parts: filtered };
}

export function not(part: FilterNode): FilterNode {
  return { kind: "not", part };
}

export function toFilterString(node: FilterNode): string {
  switch (node.kind) {
    case "raw":
      return node.expression;
    case "and":
      return node.parts.map((p) => `(${toFilterString(p)})`).join(" and ");
    case "or":
      return node.parts.map((p) => `(${toFilterString(p)})`).join(" or ");
    case "not":
      return `not (${toFilterString(node.part)})`;
    default:
      return "";
  }
}

function normalizeEntitySet(entitySetName: string): string {
  return (entitySetName || "").trim().replace(/^\//, "");
}

function stripGuid(value: string): string {
  return String(value || "").replace(/[{}]/g, "");
}

/**
 * Builds an OData query string only (no HTTP). Returns "" when there are no options.
 */
export function buildODataQueryString(options: ODataQueryOptions = {}): string {
  const params: string[] = [];

  const select = (options.select || []).map((c) => c.trim()).filter(Boolean);
  if (select.length) {
    params.push(`$select=${encodeURIComponent(select.join(","))}`);
  }

  if (options.filter) {
    const filter = toFilterString(options.filter);
    if (filter) {
      params.push(`$filter=${encodeURIComponent(filter)}`);
    }
  }

  if (options.orderby?.length) {
    const order = options.orderby
      .map((o) => `${o.field.trim()} ${o.direction}`)
      .filter((o) => o.trim().length > 0);
    if (order.length) {
      params.push(`$orderby=${encodeURIComponent(order.join(","))}`);
    }
  }

  if (typeof options.top === "number" && options.top > 0) {
    params.push(`$top=${Math.floor(options.top)}`);
  }

  if (typeof options.skip === "number" && options.skip > 0) {
    params.push(`$skip=${Math.floor(options.skip)}`);
  }

  if (options.expand?.length) {
    const expands = options.expand
      .map((e) => {
        const nav = e.navigation.trim();
        if (!nav) {
          return "";
        }
        const nestedSelect = (e.select || []).map((c) => c.trim()).filter(Boolean);
        if (nestedSelect.length) {
          return `${nav}($select=${nestedSelect.join(",")})`;
        }
        return nav;
      })
      .filter(Boolean);
    if (expands.length) {
      params.push(`$expand=${encodeURIComponent(expands.join(","))}`);
    }
  }

  return params.length ? `?${params.join("&")}` : "";
}

export function buildApiUrl(entitySet: string, options: ODataQueryOptions = {}): string {
  const set = normalizeEntitySet(entitySet);
  return `/_api/${set}${buildODataQueryString(options)}`;
}

export function buildRecordUrl(
  entitySet: string,
  recordId: string,
  options: ODataQueryOptions = {}
): string {
  const set = normalizeEntitySet(entitySet);
  const id = stripGuid(recordId);
  return `/_api/${set}(${id})${buildODataQueryString(options)}`;
}
