import { ControlConfig, EntityRecord, LoadResult } from "../types";

export class DataService {
  constructor(private readonly webAPI: ComponentFramework.WebApi) {}

  public async loadRecords(
    config: ControlConfig,
    filterGuid: string,
    pageNumber: number
  ): Promise<LoadResult> {
    const selectColumns = this.buildSelectList(config);
    const filterAttr = config.filterAttributeLogicalName;
    const filter = `_${filterAttr}_value eq ${filterGuid}`;

    let options = `?$select=${encodeURIComponent(selectColumns)}&$filter=${encodeURIComponent(filter)}`;

    if (config.orderBy) {
      options += `&$orderby=${encodeURIComponent(config.orderBy)}`;
    }

    const maxPageSize = Math.max(1, config.pageSize || 10);

    let result = await this.webAPI.retrieveMultipleRecords(
      config.targetEntityLogicalName,
      options,
      maxPageSize
    );

    let currentPage = 1;
    while (currentPage < pageNumber && result.nextLink) {
      const nextOptions = this.optionsFromNextLink(result.nextLink);
      result = await this.webAPI.retrieveMultipleRecords(
        config.targetEntityLogicalName,
        nextOptions,
        maxPageSize
      );
      currentPage += 1;
    }

    const entities = (result.entities || []).map((e) => this.normalizeEntity(e, config));
    return {
      entities,
      nextLink: result.nextLink,
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

  /**
   * Builds create/update payload. On create, binds the filter lookup to filterGuid.
   */
  public buildWritePayload(
    config: ControlConfig,
    values: Record<string, unknown>,
    filterGuid: string | null,
    includeLookupBind: boolean
  ): Record<string, unknown> {
    const payload: Record<string, unknown> = {};

    for (const column of config.displayColumns) {
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

  private buildSelectList(config: ControlConfig): string {
    const cols = new Set<string>(config.displayColumns);
    if (config.primaryNameAttribute) {
      cols.add(config.primaryNameAttribute);
    }
    cols.add(`_${config.filterAttributeLogicalName}_value`);
    return Array.from(cols).filter(Boolean).join(",");
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
        (k) => k.toLowerCase().endsWith("id") && typeof entity[k] === "string" && !k.startsWith("_")
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

  private optionsFromNextLink(nextLink: string): string {
    const qIndex = nextLink.indexOf("?");
    if (qIndex >= 0) {
      return nextLink.substring(qIndex);
    }
    return nextLink.startsWith("?") ? nextLink : `?${nextLink}`;
  }
}
