import { IInputs, IOutputs } from "./generated/ManifestTypes";
import { EmptyState } from "./components/EmptyState";
import { confirmDelete, RecordForm } from "./components/RecordForm";
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
  RecordFormValues,
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
  private recordForm: RecordForm | null = null;
  private portalFormModal: PortalFormModal | null = null;
  private fatalEl: HTMLDivElement | null = null;

  private config: ControlConfig | null = null;
  private filterGuid: string | null = null;
  private pageNumber = 1;
  private hasNextPage = false;
  private records: EntityRecord[] = [];
  private editingRecordId: string | null = null;
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
        onPrevPage: () => void this.goToPage(this.pageNumber - 1),
        onNextPage: () => void this.goToPage(this.pageNumber + 1),
        onRefresh: () => void this.reload(),
      });

      this.recordForm = new RecordForm(this.container, {
        onSubmit: (values) => void this.handleFormSubmit(values),
        onCancel: () => this.recordForm?.close(),
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
    this.recordForm?.destroy();
    this.portalFormModal?.destroy();
    this.fatalEl?.remove();
    this.grid = null;
    this.emptyState = null;
    this.recordForm = null;
    this.portalFormModal = null;
    this.dataService = null;
    this.fatalEl = null;
  }

  private applyConfig(context: ComponentFramework.Context<IInputs>): void {
    const p = context.parameters;
    const useDemo = this.isLocalHarness();
    this.config = {
      lookupFieldLogicalName: (p.lookupFieldLogicalName.raw || "").trim(),
      targetEntityLogicalName: (p.targetEntityLogicalName.raw || "").trim(),
      targetEntitySetName: (p.targetEntitySetName.raw || "").trim(),
      filterAttributeLogicalName: (p.filterAttributeLogicalName.raw || "").trim(),
      portalId: (p.portalId.raw || "").trim() || EMPTY_GUID,
      recordId: resolvePortalRecordId(p.recordId.raw),
      entityFormId: (p.entityFormId.raw || "").trim(),
      filterLookupEntitySetName: this.config?.filterLookupEntitySetName || "contacts",
      displayColumns: this.config?.displayColumns?.length
        ? this.config.displayColumns
        : [
            "mcshhs_akaname",
            "mcshhs_firstname",
            "createdon",
            "_fc_contact_value@OData.Community.Display.V1.FormattedValue",
          ],
      primaryNameAttribute: this.config?.primaryNameAttribute || "mcshhs_akaname",
      pageSize: 10,
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

    if (this.metadataReady && this.config.primaryNameAttribute) {
      return;
    }

    // Portal-safe defaults for mcshhs_akaname grid columns.
    this.config.primaryNameAttribute = "mcshhs_akaname";
    this.config.displayColumns = [
      "mcshhs_akaname",
      "mcshhs_firstname",
      "createdon",
      "_fc_contact_value@OData.Community.Display.V1.FormattedValue",
    ];
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
        )}. Set targetEntityLogicalName, targetEntitySetName, lookupFieldLogicalName, filterAttributeLogicalName, portalId, and entityFormId on the form component.`
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
      this.grid.render(config, this.records, 1, false, "No demo records.");
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
        this.pageNumber
      );
      this.records = result.entities;
      this.hasNextPage = !!(result.hasMore || result.nextLink);
      this.grid.render(
        config,
        this.records,
        this.pageNumber,
        this.hasNextPage,
        "No related records found."
      );
    } catch (err) {
      const message = this.errorMessage(err, "Failed to load related records.");
      this.grid.setError(
        `${message} Check Power Pages Web API site settings and table permissions for "${config.targetEntityLogicalName}".`
      );
      this.grid.render(config, [], this.pageNumber, false, "Unable to load records.");
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
    config.primaryNameAttribute = "mcshhs_akaname";
    config.displayColumns = [
      "mcshhs_akaname",
      "mcshhs_firstname",
      "createdon",
      "_fc_contact_value@OData.Community.Display.V1.FormattedValue",
    ];
    config.filterLookupEntitySetName = "contacts";
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

    this.editingRecordId = null;
    this.grid?.setError(null);
    this.portalFormModal.openCreate({
      portalId: this.config.portalId || EMPTY_GUID,
      recordId: resolvePortalRecordId(this.config.recordId),
      entityFormId: this.config.entityFormId,
      title: "Create",
    });
  }

  private async openEdit(record: EntityRecord): Promise<void> {
    if (!this.config || !this.recordForm || !record.id) {
      return;
    }

    const editColumns = ["mcshhs_akaname", "mcshhs_firstname"];

    if (this.config.useDemoData) {
      this.editingRecordId = record.id;
      const initial: RecordFormValues = {};
      for (const col of editColumns) {
        initial[col] = (record[col] as string) ?? "";
      }
      this.recordForm.open("edit", { ...this.config, displayColumns: editColumns }, initial);
      return;
    }

    if (!this.dataService) {
      return;
    }

    this.editingRecordId = record.id;
    this.recordForm.setBusy(true);

    try {
      const full = await this.dataService.retrieveRecord(
        this.config.targetEntityLogicalName,
        this.config.targetEntitySetName,
        record.id,
        editColumns
      );
      const initial: RecordFormValues = {};
      for (const col of editColumns) {
        const val = full[col];
        initial[col] =
          val === null || val === undefined ? "" : (val as string | number | boolean);
      }
      this.recordForm.open("edit", { ...this.config, displayColumns: editColumns }, initial);
    } catch (err) {
      this.grid?.setError(this.errorMessage(err, "Failed to load record for edit."));
      this.editingRecordId = null;
    } finally {
      this.recordForm.setBusy(false);
    }
  }

  private async handleFormSubmit(values: RecordFormValues): Promise<void> {
    if (!this.config || !this.recordForm) {
      return;
    }

    if (this.config.useDemoData) {
      this.recordForm.setError("Save is disabled in demo data mode.");
      return;
    }

    if (!this.dataService) {
      return;
    }

    const isCreate = !this.editingRecordId;
    if (isCreate && !this.filterGuid) {
      this.recordForm.setError("Lookup value is required to create a related record.");
      return;
    }

    this.recordForm.setBusy(true);
    this.recordForm.setError(null);

    try {
      const writeConfig = {
        ...this.config,
        displayColumns: ["mcshhs_akaname", "mcshhs_firstname"],
      };
      const payload = this.dataService.buildWritePayload(
        writeConfig,
        values,
        this.filterGuid,
        isCreate
      );

      if (isCreate) {
        await this.dataService.createRecord(
          this.config.targetEntityLogicalName,
          this.config.targetEntitySetName,
          payload
        );
      } else if (this.editingRecordId) {
        await this.dataService.updateRecord(
          this.config.targetEntityLogicalName,
          this.config.targetEntitySetName,
          this.editingRecordId,
          payload
        );
      }

      this.recordForm.close();
      this.editingRecordId = null;
      this.pageNumber = isCreate ? 1 : this.pageNumber;
      await this.reload();
      this.notifyOutputChanged();
    } catch (err) {
      this.recordForm.setError(this.errorMessage(err, "Save failed."));
    } finally {
      this.recordForm.setBusy(false);
    }
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

    if (!confirmDelete(String(label))) {
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
