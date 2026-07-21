import {
  buildFilterFetchXml,
  ControlConfig,
  EntityMetadataInfo,
  EntityRecord,
  LoadResult,
} from "../types";

export class DataService {
  private entityMetaCache = new Map<string, EntityMetadataInfo>();
  private lookupTargetSetCache = new Map<string, string>();

  constructor(private readonly webAPI: ComponentFramework.WebApi) {}

  public async resolveEntityMetadata(entityLogicalName: string): Promise<EntityMetadataInfo> {
    const key = entityLogicalName.toLowerCase();
    const cached = this.entityMetaCache.get(key);
    if (cached) {
      return cached;
    }

    try {
      const result = await this.webAPI.retrieveMultipleRecords(
        "EntityDefinitions",
        `?$select=LogicalName,PrimaryNameAttribute,EntitySetName&$filter=LogicalName eq '${entityLogicalName}'`
      );
      const row = result.entities?.[0] as Record<string, unknown> | undefined;
      const info: EntityMetadataInfo = {
        primaryNameAttribute: String(row?.PrimaryNameAttribute || "name"),
        entitySetName: String(row?.EntitySetName || this.guessEntitySetName(entityLogicalName)),
      };
      this.entityMetaCache.set(key, info);
      return info;
    } catch {
      const fallback: EntityMetadataInfo = {
        primaryNameAttribute: "name",
        entitySetName: this.guessEntitySetName(entityLogicalName),
      };
      this.entityMetaCache.set(key, fallback);
      return fallback;
    }
  }

  /**
   * Resolves the entity set name for the lookup target (e.g. contact → contacts).
   */
  public async resolveFilterLookupEntitySetName(
    entityLogicalName: string,
    filterAttributeLogicalName: string
  ): Promise<string> {
    const cacheKey = `${entityLogicalName}:${filterAttributeLogicalName}`.toLowerCase();
    const cached = this.lookupTargetSetCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const result = await this.webAPI.retrieveMultipleRecords(
        "EntityDefinitions",
        `?$filter=LogicalName eq '${entityLogicalName}'&$expand=Attributes($filter=LogicalName eq '${filterAttributeLogicalName}';$select=LogicalName;$expand=Targets)`
      );
      // Portal / PCF may not support complex expand; fall through on failure.
      const entity = result.entities?.[0] as Record<string, unknown> | undefined;
      const attributes = entity?.Attributes as Array<Record<string, unknown>> | undefined;
      const attr = attributes?.[0];
      const targets = attr?.Targets as string[] | undefined;
      const targetLogical = targets?.[0];
      if (targetLogical) {
        const targetMeta = await this.resolveEntityMetadata(targetLogical);
        this.lookupTargetSetCache.set(cacheKey, targetMeta.entitySetName);
        return targetMeta.entitySetName;
      }
    } catch {
      // Fall through to contact default / guess
    }

    // Contact form scenario default
    const fallback = "contacts";
    this.lookupTargetSetCache.set(cacheKey, fallback);
    return fallback;
  }

  public async loadRecords(
    config: ControlConfig,
    filterGuid: string,
    pageNumber: number
  ): Promise<LoadResult> {
    const fetchXml = buildFilterFetchXml(
      config.targetEntityLogicalName,
      config.filterAttributeLogicalName,
      filterGuid,
      config.primaryNameAttribute,
      config.pageSize,
      pageNumber
    );

    const options = `?fetchXml=${encodeURIComponent(fetchXml)}`;
    const result = await this.webAPI.retrieveMultipleRecords(
      config.targetEntityLogicalName,
      options
    );

    const entities = (result.entities || []).map((e) => this.normalizeEntity(e, config));
    const pageSize = Math.max(1, config.pageSize);
    const hasMore = entities.length >= pageSize;

    return {
      entities,
      nextLink: result.nextLink,
      hasMore,
    };
  }

  public async retrieveRecord(
    entityLogicalName: string,
    recordId: string,
    columns: string[]
  ): Promise<EntityRecord> {
    const select = columns.filter(Boolean).join(",");
    const options = select ? `?$select=${encodeURIComponent(select)}` : undefined;
    const record = await this.webAPI.retrieveRecord(entityLogicalName, recordId, options);
    return this.normalizeEntity(record);
  }

  public async createRecord(
    entityLogicalName: string,
    data: Record<string, unknown>
  ): Promise<string> {
    const result = await this.webAPI.createRecord(entityLogicalName, data);
    return result.id;
  }

  public async updateRecord(
    entityLogicalName: string,
    recordId: string,
    data: Record<string, unknown>
  ): Promise<void> {
    await this.webAPI.updateRecord(entityLogicalName, recordId, data);
  }

  public async deleteRecord(entityLogicalName: string, recordId: string): Promise<void> {
    await this.webAPI.deleteRecord(entityLogicalName, recordId);
  }

  public buildWritePayload(
    config: ControlConfig,
    values: Record<string, unknown>,
    filterGuid: string | null,
    includeLookupBind: boolean
  ): Record<string, unknown> {
    const payload: Record<string, unknown> = {};

    for (const column of config.displayColumns) {
      if (column === "createdon") {
        continue;
      }
      if (Object.prototype.hasOwnProperty.call(values, column)) {
        const raw = values[column];
        if (raw === "" || raw === undefined) {
          payload[column] = null;
        } else {
          payload[column] = raw;
        }
      }
    }

    if (
      includeLookupBind &&
      filterGuid &&
      config.filterAttributeLogicalName &&
      config.filterLookupEntitySetName
    ) {
      const bindKey = `${config.filterAttributeLogicalName}@odata.bind`;
      const setName = config.filterLookupEntitySetName.replace(/^\//, "");
      payload[bindKey] = `/${setName}(${filterGuid})`;
    }

    return payload;
  }

  private guessEntitySetName(logicalName: string): string {
    if (logicalName === "contact") {
      return "contacts";
    }
    if (logicalName === "account") {
      return "accounts";
    }
    if (logicalName.endsWith("y")) {
      return `${logicalName.slice(0, -1)}ies`;
    }
    if (logicalName.endsWith("s")) {
      return logicalName;
    }
    return `${logicalName}s`;
  }

  private normalizeEntity(
    entity: Record<string, unknown>,
    config?: ControlConfig
  ): EntityRecord {
    let id = entity.id as string | undefined;

    if (!id && config?.targetEntityLogicalName) {
      const primaryId = `${config.targetEntityLogicalName}id`;
      if (typeof entity[primaryId] === "string") {
        id = entity[primaryId] as string;
      }
    }

    if (!id) {
      const key = Object.keys(entity).find(
        (k) =>
          k.toLowerCase().endsWith("id") &&
          typeof entity[k] === "string" &&
          !k.startsWith("_")
      );
      if (key) {
        id = entity[key] as string;
      }
    }

    return {
      ...entity,
      id: id ? String(id).replace(/[{}]/g, "") : undefined,
    };
  }
}
