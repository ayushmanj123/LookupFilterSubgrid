import { IInputs, IOutputs } from "./generated/ManifestTypes";
import { EmptyState } from "./components/EmptyState";
import { confirmDelete, RecordForm } from "./components/RecordForm";
import { GridView } from "./components/GridView";
import { DataService } from "./services/DataService";
import { LookupResolver } from "./services/LookupResolver";
import {
  ControlConfig,
  EntityRecord,
  parseBooleanInput,
  parseDisplayColumns,
  RecordFormValues,
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

  private config: ControlConfig | null = null;
  private filterGuid: string | null = null;
  private pageNumber = 1;
  private hasNextPage = false;
  private records: EntityRecord[] = [];
  private editingRecordId: string | null = null;
  private isLoading = false;
  private lastLookupField = "";
  private hostHidden = false;

  public init(
    context: ComponentFramework.Context<IInputs>,
    notifyOutputChanged: () => void,
    _state: ComponentFramework.Dictionary,
    container: HTMLDivElement
  ): void {
    this.context = context;
    this.notifyOutputChanged = notifyOutputChanged;
    this.container = container;
    this.container.classList.add("lfs-host");

    this.hideNativeHostInput();

    this.dataService = new DataService(context.webAPI);

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

    this.applyConfig(context);
    this.setupLookupWatch();
    void this.reload();
  }

  public updateView(context: ComponentFramework.Context<IInputs>): void {
    this.context = context;
    this.applyConfig(context);

    const lookupField = this.config?.lookupFieldLogicalName || "";
    if (lookupField !== this.lastLookupField) {
      this.setupLookupWatch();
    }

    void this.reload();
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
    this.grid = null;
    this.emptyState = null;
    this.recordForm = null;
    this.dataService = null;
  }

  private applyConfig(context: ComponentFramework.Context<IInputs>): void {
    const p = context.parameters;
    this.config = {
      lookupFieldLogicalName: (p.lookupFieldLogicalName.raw || "").trim(),
      targetEntityLogicalName: (p.targetEntityLogicalName.raw || "").trim(),
      filterAttributeLogicalName: (p.filterAttributeLogicalName.raw || "").trim(),
      filterLookupEntitySetName: (p.filterLookupEntitySetName.raw || "").trim(),
      displayColumns: parseDisplayColumns(p.displayColumns.raw),
      primaryNameAttribute: (p.primaryNameAttribute.raw || "").trim(),
      pageSize: p.pageSize.raw && p.pageSize.raw > 0 ? p.pageSize.raw : 10,
      enableCreate: parseBooleanInput(p.enableCreate.raw, true),
      enableEdit: parseBooleanInput(p.enableEdit.raw, true),
      enableDelete: parseBooleanInput(p.enableDelete.raw, true),
      orderBy: (p.orderBy.raw || "").trim(),
    };
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

  private async reload(): Promise<void> {
    if (!this.config || !this.dataService || !this.grid || !this.emptyState) {
      return;
    }

    const config = this.config;
    this.grid.setError(null);

    if (!this.validateConfig(config)) {
      this.grid.setLoading(false);
      this.grid.setVisible(false);
      this.emptyState.show(
        "Configure the control properties: lookup field, target entity, filter attribute, entity set, and display columns."
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
        "Select a value in the lookup field to load related records."
      );
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
      this.hasNextPage = !!result.nextLink;
      this.grid.render(
        config,
        this.records,
        this.pageNumber,
        this.hasNextPage,
        "No related records found."
      );
    } catch (err) {
      const message = this.errorMessage(err, "Failed to load related records.");
      this.grid.setError(message);
      this.grid.render(config, [], this.pageNumber, false, "Unable to load records.");
    } finally {
      this.isLoading = false;
      this.grid.setLoading(false);
    }
  }

  private validateConfig(config: ControlConfig): boolean {
    return !!(
      config.lookupFieldLogicalName &&
      config.targetEntityLogicalName &&
      config.filterAttributeLogicalName &&
      config.filterLookupEntitySetName &&
      config.displayColumns.length > 0 &&
      config.primaryNameAttribute
    );
  }

  private async goToPage(page: number): Promise<void> {
    if (page < 1 || this.isLoading) {
      return;
    }
    this.pageNumber = page;
    await this.reload();
  }

  private openCreate(): void {
    if (!this.config || !this.recordForm) {
      return;
    }
    if (!this.filterGuid) {
      this.grid?.setError("Select a lookup value before creating a related record.");
      return;
    }
    this.editingRecordId = null;
    this.recordForm.open("create", this.config, {});
  }

  private async openEdit(record: EntityRecord): Promise<void> {
    if (!this.config || !this.recordForm || !this.dataService || !record.id) {
      return;
    }

    this.editingRecordId = record.id;
    this.recordForm.setBusy(true);

    try {
      const columns = Array.from(
        new Set([this.config.primaryNameAttribute, ...this.config.displayColumns])
      );
      const full = await this.dataService.retrieveRecord(
        this.config.targetEntityLogicalName,
        record.id,
        columns
      );
      const initial: RecordFormValues = {};
      for (const col of columns) {
        const val = full[col];
        initial[col] =
          val === null || val === undefined ? "" : (val as string | number | boolean);
      }
      this.recordForm.open("edit", this.config, initial);
    } catch (err) {
      this.grid?.setError(this.errorMessage(err, "Failed to load record for edit."));
      this.editingRecordId = null;
    } finally {
      this.recordForm.setBusy(false);
    }
  }

  private async handleFormSubmit(values: RecordFormValues): Promise<void> {
    if (!this.config || !this.dataService || !this.recordForm) {
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
      const payload = this.dataService.buildWritePayload(
        this.config,
        values,
        this.filterGuid,
        isCreate
      );

      if (isCreate) {
        await this.dataService.createRecord(this.config.targetEntityLogicalName, payload);
      } else if (this.editingRecordId) {
        await this.dataService.updateRecord(
          this.config.targetEntityLogicalName,
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
    if (!this.config || !this.dataService || !record.id) {
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
      await this.dataService.deleteRecord(this.config.targetEntityLogicalName, record.id);
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

  /**
   * Hide the native bound text input that Power Pages renders behind the PCF host.
   */
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
            el.style.display = "none";
          }
        });
      }
    } catch {
      // Non-fatal
    }
    this.hostHidden = true;
  }
}
