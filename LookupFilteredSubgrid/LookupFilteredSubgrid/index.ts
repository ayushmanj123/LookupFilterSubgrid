import { IInputs, IOutputs } from "./generated/ManifestTypes";
import { EmptyState } from "./components/EmptyState";
import { confirmDelete } from "./components/RecordForm";
import { GridView } from "./components/GridView";
import { PortalFormModal } from "./components/PortalFormModal";
import { DataService } from "./services/DataService";
import { LookupResolver } from "./services/LookupResolver";
import {
  ControlConfig,
  createDemoRecords,
  EMPTY_GUID,
  EntityRecord,
  getMissingConfigFields,
  parseDisplayColumns,
  resolvePageSize,
  resolvePortalRecordId,
} from "./types";

export class LookupFilteredSubgrid implements ComponentFramework.StandardControl<IInputs, IOutputs> {
  private container: HTMLDivElement;
  private context: ComponentFramework.Context<IInputs>;
  private notifyOutputChanged: () => void;

  private dataService: DataService | null = null;
  private lookupResolver = new LookupResolver();
  private grid: GridView | null = null;
  private emptyState: EmptyState | null = null;
  private portalFormModal: PortalFormModal | null = null;
  private fatalEl: HTMLDivElement | null = null;

  private config: ControlConfig | null = null;
  private filterGuid: string | null = null;
  private pageNumber = 1;
  private hasNextPage = false;
  private sortColumn = "createdon";
  private sortDirection: "asc" | "desc" = "desc";
  private records: EntityRecord[] = [];
  private isLoading = false;
  private lastLookupField = "";
  private hostHidden = false;
  private metadataReady = false;

  public init(
    context: ComponentFramework.Context<IInputs>,
    notifyOutputChanged: () => void,
    _state: ComponentFramework.Dictionary,
    container: HTMLDivElement
  ): void {
    try {
      this.context = context;
      this.notifyOutputChanged = notifyOutputChanged;
      this.container = container;
      this.container.classList.add("lfs-host");
      this.container.style.minHeight = "180px";
      this.container.style.width = "100%";
      this.container.style.display = "block";

      try {
        context.mode.trackContainerResize(true);
      } catch {
        // Optional
      }

      this.hideNativeHostInput();
      this.dataService = new DataService();

      this.emptyState = new EmptyState(this.container);
      this.grid = new GridView(this.container, {
        onCreate: () => this.openCreate(),
        onEdit: (record) => this.openEdit(record),
        onDelete: (record) => void this.handleDelete(record),
        onSort: (column) => void this.handleSort(column),
        onFirstPage: () => void this.goToPage(1),
        onPrevPage: () => void this.goToPage(this.pageNumber - 1),
        onNextPage: () => void this.goToPage(this.pageNumber + 1),
      });

      this.portalFormModal = new PortalFormModal(this.container, {
        onClosed: () => void this.reload(),
      });

      this.applyConfig(context);
      this.setupLookupWatch();
      void this.reload();
    } catch (err) {
      this.showFatal(this.errorMessage(err, "Control failed to initialize."));
    }
  }

  public updateView(context: ComponentFramework.Context<IInputs>): void {
    try {
      this.context = context;
      const prevTarget = this.config?.targetEntityLogicalName;
      this.applyConfig(context);

      if (prevTarget !== this.config?.targetEntityLogicalName) {
        this.metadataReady = false;
      }

      const height = context.mode.allocatedHeight;
      if (height && height > 0) {
        this.container.style.minHeight = `${height}px`;
      }

      const lookupField = this.config?.lookupFieldLogicalName || "";
      if (lookupField !== this.lastLookupField) {
        this.setupLookupWatch();
      }

      void this.reload();
    } catch (err) {
      this.showFatal(this.errorMessage(err, "Control update failed."));
    }
  }

  public getOutputs(): IOutputs {
    return {
      value: this.context.parameters.value.raw ?? undefined,
    };
  }

  public destroy(): void {
    this.lookupResolver.unwatch();
    this.grid?.destroy();
    this.emptyState?.destroy();
    this.portalFormModal?.destroy();
    this.fatalEl?.remove();
    this.grid = null;
    this.emptyState = null;
    this.portalFormModal = null;
    this.dataService = null;
    this.fatalEl = null;
  }

  private applyConfig(context: ComponentFramework.Context<IInputs>): void {
    const p = context.parameters;
    const useDemo = this.isLocalHarness();
    const filterAttributeLogicalName = (p.filterAttributeLogicalName.raw || "").trim();
    const parsedColumns = parseDisplayColumns(
      p.displayColumns.raw,
      filterAttributeLogicalName
    );
    this.config = {
      lookupFieldLogicalName: (p.lookupFieldLogicalName.raw || "").trim(),
      targetEntityLogicalName: (p.targetEntityLogicalName.raw || "").trim(),
      targetEntitySetName: (p.targetEntitySetName.raw || "").trim(),
      filterAttributeLogicalName,
      portalId: (p.portalId.raw || "").trim() || EMPTY_GUID,
      recordId: resolvePortalRecordId(p.recordId.raw),
      entityFormId: (p.entityFormId.raw || "").trim(),
      editEntityFormId: (p.editEntityFormId.raw || "").trim(),
      createButtonLabel: (p.createButtonLabel.raw || "").trim() || "Create",
      editActionLabel: (p.editActionLabel.raw || "").trim() || "Edit",
      deleteActionLabel: (p.deleteActionLabel.raw || "").trim() || "Remove Other Name",
      filterLookupEntitySetName: this.config?.filterLookupEntitySetName || "contacts",
      displayColumns: parsedColumns.displayColumns,
      primaryNameAttribute: parsedColumns.primaryNameAttribute,
      pageSize: resolvePageSize(p.pageSize.raw),
      enableCreate: true,
      enableEdit: true,
      enableDelete: true,
      useDemoData: useDemo,
    };
  }

  private isLocalHarness(): boolean {
    try {
      const host = window.location.hostname;
      return host === "localhost" || host === "127.0.0.1";
    } catch {
      return false;
    }
  }

  private setupLookupWatch(): void {
    this.lookupResolver.unwatch();
    const lookupField = this.config?.lookupFieldLogicalName || "";
    this.lastLookupField = lookupField;

    if (!lookupField) {
      return;
    }

    this.filterGuid = this.lookupResolver.getLookupGuid(lookupField);
    this.lookupResolver.watch(lookupField, (guid) => {
      if (guid === this.filterGuid) {
        return;
      }
      this.filterGuid = guid;
      this.pageNumber = 1;
      void this.reload();
    });
  }

  private async ensureMetadata(): Promise<void> {
    if (!this.config) {
      return;
    }

    if (this.metadataReady) {
      return;
    }

    this.config.filterLookupEntitySetName =
      this.config.filterLookupEntitySetName || "contacts";
    this.metadataReady = true;
  }

  private async reload(): Promise<void> {
    if (!this.config || !this.grid || !this.emptyState) {
      return;
    }

    const config = this.config;
    this.grid.setError(null);

    if (config.useDemoData) {
      const missing = getMissingConfigFields(config);
      if (missing.length) {
        this.applyDemoDefaults(config);
      }
    }

    const stillMissing = getMissingConfigFields(config);
    if (stillMissing.length) {
      this.grid.setLoading(false);
      this.grid.setVisible(false);
      this.emptyState.show(
        `PCF is loaded, but these properties are empty: ${stillMissing.join(
          ", "
        )}. Set targetEntityLogicalName, targetEntitySetName, lookupFieldLogicalName, filterAttributeLogicalName, displayColumns, portalId, entityFormId, and editEntityFormId on the form component.`
      );
      return;
    }

    try {
      await this.ensureMetadata();
    } catch (err) {
      this.grid.setVisible(true);
      this.grid.setError(this.errorMessage(err, "Failed to load table metadata."));
      return;
    }

    if (config.useDemoData) {
      this.filterGuid = this.filterGuid || "11111111-1111-1111-1111-111111111111";
      this.emptyState.hide();
      this.grid.setVisible(true);
      this.records = createDemoRecords(config);
      this.hasNextPage = false;
      this.grid.setLoading(false);
      this.grid.setError("Demo data mode (localhost) — sample rows only.");
      this.grid.render(
        config,
        this.records,
        1,
        false,
        this.getSortState(),
        "No demo records."
      );
      return;
    }

    this.filterGuid =
      this.lookupResolver.getLookupGuid(config.lookupFieldLogicalName) || this.filterGuid;

    if (!this.filterGuid) {
      this.records = [];
      this.hasNextPage = false;
      this.grid.setLoading(false);
      this.grid.setVisible(false);
      this.emptyState.show(
        `Select a value in lookup "${config.lookupFieldLogicalName}" to load related ${config.targetEntityLogicalName} records.`
      );
      return;
    }

    if (!this.dataService) {
      this.emptyState.show("Web API is not available in this host.");
      return;
    }

    this.emptyState.hide();
    this.grid.setVisible(true);
    this.isLoading = true;
    this.grid.setLoading(true);

    try {
      const result = await this.dataService.loadRecords(
        config,
        this.filterGuid,
        this.pageNumber,
        {
          field: this.sortColumn,
          direction: this.sortDirection,
        }
      );
      this.records = result.entities;
      this.hasNextPage = !!(result.hasMore || result.nextLink);
      this.grid.render(
        config,
        this.records,
        this.pageNumber,
        this.hasNextPage,
        this.getSortState(),
        "No related records found."
      );
    } catch (err) {
      const message = this.errorMessage(err, "Failed to load related records.");
      this.grid.setError(
        `${message} Check Power Pages Web API site settings and table permissions for "${config.targetEntityLogicalName}".`
      );
      this.grid.render(
        config,
        [],
        this.pageNumber,
        false,
        this.getSortState(),
        "Unable to load records."
      );
    } finally {
      this.isLoading = false;
      this.grid.setLoading(false);
    }
  }

  private applyDemoDefaults(config: ControlConfig): void {
    if (!config.lookupFieldLogicalName) config.lookupFieldLogicalName = "fc_applican";
    if (!config.targetEntityLogicalName) config.targetEntityLogicalName = "mcshhs_akaname";
    if (!config.targetEntitySetName) config.targetEntitySetName = "mcshhs_akanames";
    if (!config.filterAttributeLogicalName) config.filterAttributeLogicalName = "fc_contact";
    if (!config.portalId) config.portalId = EMPTY_GUID;
    if (!config.recordId) config.recordId = EMPTY_GUID;
    if (!config.entityFormId) config.entityFormId = EMPTY_GUID;
    if (!config.editEntityFormId) config.editEntityFormId = EMPTY_GUID;
    if (!config.createButtonLabel) config.createButtonLabel = "Create";
    if (!config.editActionLabel) config.editActionLabel = "Edit";
    if (!config.deleteActionLabel) config.deleteActionLabel = "Remove Other Name";
    config.pageSize = resolvePageSize(config.pageSize);
    if (!config.displayColumns?.length) {
      const parsed = parseDisplayColumns(
        "{fc_contact, mcshhs_akaname, mcshhs_firstname, createdon}",
        config.filterAttributeLogicalName
      );
      config.displayColumns = parsed.displayColumns;
      config.primaryNameAttribute = parsed.primaryNameAttribute;
    }
    config.filterLookupEntitySetName = "contacts";
  }

  private getSortState(): { column: string; direction: "asc" | "desc" } {
    return { column: this.sortColumn, direction: this.sortDirection };
  }

  private async handleSort(column: string): Promise<void> {
    if (!column || this.isLoading) {
      return;
    }
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === "asc" ? "desc" : "asc";
    } else {
      this.sortColumn = column;
      this.sortDirection = "asc";
    }
    this.pageNumber = 1;
    await this.reload();
  }

  private async goToPage(page: number): Promise<void> {
    if (page < 1 || this.isLoading) {
      return;
    }
    this.pageNumber = page;
    await this.reload();
  }

  private openCreate(): void {
    if (!this.config || !this.portalFormModal) {
      return;
    }
    if (!this.filterGuid) {
      this.grid?.setError("Select a lookup value before creating a related record.");
      return;
    }
    if (this.config.useDemoData) {
      this.grid?.setError("Create is disabled in demo data mode.");
      return;
    }
    if (!this.config.entityFormId) {
      this.grid?.setError(
        "Set entityFormId (Insert Basic Form GUID) and portalId on the control to open the create form."
      );
      return;
    }

    this.grid?.setError(null);
    this.portalFormModal.openCreate({
      portalId: this.config.portalId || EMPTY_GUID,
      recordId: resolvePortalRecordId(this.config.recordId),
      entityFormId: this.config.entityFormId,
      associateLookupParamName: this.config.filterAttributeLogicalName,
      associateLookupRecordId: this.filterGuid,
      title: this.config.createButtonLabel || "Create",
    });
  }

  private openEdit(record: EntityRecord): void {
    if (!this.config || !this.portalFormModal || !record.id) {
      return;
    }
    if (this.config.useDemoData) {
      this.grid?.setError("Edit is disabled in demo data mode.");
      return;
    }
    if (!this.config.editEntityFormId) {
      this.grid?.setError(
        "Set editEntityFormId (Edit Basic Form GUID) and portalId on the control to open the edit form."
      );
      return;
    }

    this.grid?.setError(null);
    this.portalFormModal.openEdit({
      portalId: this.config.portalId || EMPTY_GUID,
      recordId: record.id.replace(/[{}]/g, ""),
      entityFormId: this.config.editEntityFormId,
      title: "Edit",
    });
  }

  private async handleDelete(record: EntityRecord): Promise<void> {
    if (!this.config || !record.id) {
      return;
    }

    if (this.config.useDemoData) {
      this.grid?.setError("Delete is disabled in demo data mode.");
      return;
    }

    if (!this.dataService) {
      return;
    }

    const label =
      (record[this.config.primaryNameAttribute] as string) ||
      record.id ||
      "this record";

    if (!confirmDelete(String(label), this.config.deleteActionLabel)) {
      return;
    }

    this.grid?.setLoading(true, "Deleting...");
    try {
      await this.dataService.deleteRecord(
        this.config.targetEntityLogicalName,
        this.config.targetEntitySetName,
        record.id
      );
      if (this.records.length <= 1 && this.pageNumber > 1) {
        this.pageNumber -= 1;
      }
      await this.reload();
      this.notifyOutputChanged();
    } catch (err) {
      this.grid?.setError(this.errorMessage(err, "Delete failed."));
      this.grid?.setLoading(false);
    }
  }

  private showFatal(message: string): void {
    if (!this.container) {
      return;
    }
    if (!this.fatalEl) {
      this.fatalEl = document.createElement("div");
      this.fatalEl.className = "lfs-fatal";
      this.container.appendChild(this.fatalEl);
    }
    this.fatalEl.textContent = message;
  }

  private errorMessage(err: unknown, fallback: string): string {
    if (!err) {
      return fallback;
    }
    if (typeof err === "string") {
      return err;
    }
    const anyErr = err as {
      message?: string;
      raw?: string;
      error?: { message?: string };
    };
    return (
      anyErr.message ||
      anyErr.error?.message ||
      anyErr.raw ||
      fallback
    );
  }

  private hideNativeHostInput(): void {
    if (this.hostHidden) {
      return;
    }
    try {
      const host = this.container.closest(".control, .form-control, td, div");
      if (host) {
        const inputs = host.querySelectorAll(
          "input[type='text'], textarea, input:not([type])"
        );
        inputs.forEach((el) => {
          if (el instanceof HTMLElement && !el.classList.contains("lfs-input")) {
            if (!el.closest(".lfs-root") && !el.closest(".lfs-modal")) {
              el.style.display = "none";
            }
          }
        });
      }
    } catch {
      // Non-fatal
    }
    this.hostHidden = true;
  }
}
