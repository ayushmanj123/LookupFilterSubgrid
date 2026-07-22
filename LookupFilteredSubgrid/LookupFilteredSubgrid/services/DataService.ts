import { ControlConfig, EntityRecord, LoadResult } from "../types";
import {
  and,
  buildApiUrl,
  buildRecordUrl,
  eq,
  lookupEq,
} from "./odata/ODataQuery";
import { PortalApi } from "./PortalApi";

export class DataService {
  private readonly api = new PortalApi();

  public async loadRecords(
    config: ControlConfig,
    filterGuid: string,
    pageNumber: number
  ): Promise<LoadResult> {
    const pageSize = Math.max(1, config.pageSize);
    const page = Math.max(1, pageNumber);
    const skip = (page - 1) * pageSize;
    const select = (config.displayColumns || []).filter(Boolean);

    const url = buildApiUrl(config.targetEntitySetName, {
      select: select.length ? select : undefined,
      filter: and(
        lookupEq(config.filterAttributeLogicalName, filterGuid),
        eq("statecode", 0)
      ),
      orderby: [{ field: "createdon", direction: "desc" }],
      top: pageSize,
      skip: skip > 0 ? skip : undefined,
    });

    const response = await this.api.get(url);
    const entities = this.extractEntities(response.data).map((e) =>
      this.normalizeEntity(e, config)
    );

    return {
      entities,
      hasMore: entities.length >= pageSize,
    };
  }

  public async retrieveRecord(
    entityLogicalName: string,
    entitySetName: string,
    recordId: string,
    columns: string[]
  ): Promise<EntityRecord> {
    const url = buildRecordUrl(entitySetName, recordId, {
      select: columns.filter(Boolean),
    });
    const response = await this.api.get(url);
    const record =
      response.data && typeof response.data === "object"
        ? (response.data as Record<string, unknown>)
        : {};
    return this.normalizeEntity(record, {
      targetEntityLogicalName: entityLogicalName,
    } as ControlConfig);
  }

  public async createRecord(
    entityLogicalName: string,
    entitySetName: string,
    data: Record<string, unknown>
  ): Promise<string> {
    const url = buildApiUrl(entitySetName);
    const response = await this.api.post(url, data);

    const fromHeader =
      response.getResponseHeader("entityid") ||
      response.getResponseHeader("EntityId") ||
      response.getResponseHeader("OData-EntityId");

    if (fromHeader) {
      const match = fromHeader.match(/\(([^)]+)\)/);
      return this.stripGuid(match ? match[1] : fromHeader);
    }

    const body = response.data as Record<string, unknown> | null;
    if (body && typeof body === "object") {
      const primaryId = `${entityLogicalName}id`;
      if (typeof body[primaryId] === "string") {
        return this.stripGuid(body[primaryId] as string);
      }
      if (typeof body.id === "string") {
        return this.stripGuid(body.id as string);
      }
    }

    throw new Error("Create succeeded but no entity id was returned.");
  }

  public async updateRecord(
    entityLogicalName: string,
    entitySetName: string,
    recordId: string,
    data: Record<string, unknown>
  ): Promise<void> {
    void entityLogicalName;
    const url = buildRecordUrl(entitySetName, recordId);
    await this.api.patch(url, data);
  }

  public async deleteRecord(
    entityLogicalName: string,
    entitySetName: string,
    recordId: string
  ): Promise<void> {
    void entityLogicalName;
    const url = buildRecordUrl(entitySetName, recordId);
    await this.api.del(url);
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
      payload[bindKey] = `/${setName}(${this.stripGuid(filterGuid)})`;
    }

    return payload;
  }

  private extractEntities(data: unknown): Array<Record<string, unknown>> {
    if (!data) {
      return [];
    }
    if (Array.isArray(data)) {
      return data as Array<Record<string, unknown>>;
    }
    if (typeof data === "object") {
      const obj = data as Record<string, unknown>;
      if (Array.isArray(obj.value)) {
        return obj.value as Array<Record<string, unknown>>;
      }
      if (Array.isArray(obj.entities)) {
        return obj.entities as Array<Record<string, unknown>>;
      }
    }
    return [];
  }

  private stripGuid(value: string): string {
    return String(value || "").replace(/[{}]/g, "");
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
          !k.startsWith("_") &&
          !k.includes("@")
      );
      if (key) {
        id = entity[key] as string;
      }
    }

    return {
      ...entity,
      id: id ? this.stripGuid(String(id)) : undefined,
    };
  }
}
