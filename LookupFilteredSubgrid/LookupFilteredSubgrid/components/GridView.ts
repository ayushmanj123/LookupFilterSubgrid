import { ControlConfig, EntityRecord } from "../types";

export interface GridViewCallbacks {
  onEdit: (record: EntityRecord) => void;
  onDelete: (record: EntityRecord) => void;
  onCreate: () => void;
  onPrevPage: () => void;
  onNextPage: () => void;
  onRefresh: () => void;
}

/**
 * Grid chrome styled like a Power Pages List (entity-grid + Bootstrap).
 */
export class GridView {
  private root: HTMLDivElement;
  private tableBody: HTMLTableSectionElement;
  private statusEl: HTMLDivElement;
  private pagerInfo: HTMLSpanElement;
  private prevBtn: HTMLButtonElement;
  private nextBtn: HTMLButtonElement;
  private createBtn: HTMLButtonElement;
  private errorEl: HTMLDivElement;

  constructor(
    private readonly container: HTMLDivElement,
    private readonly callbacks: GridViewCallbacks
  ) {
    this.root = document.createElement("div");
    this.root.className = "lfs-host-inner entitylist";

    const grid = document.createElement("div");
    grid.className = "entity-grid";

    const toolbar = document.createElement("div");
    toolbar.className = "view-toolbar grid-actions clearfix";

    const title = document.createElement("div");
    title.className = "view-title pull-left";
    title.textContent = "Related records";
    toolbar.appendChild(title);

    const actions = document.createElement("div");
    actions.className = "toolbar-actions pull-right";

    const refreshBtn = document.createElement("button");
    refreshBtn.type = "button";
    refreshBtn.className = "btn btn-default";
    refreshBtn.textContent = "Refresh";
    refreshBtn.addEventListener("click", () => this.callbacks.onRefresh());
    actions.appendChild(refreshBtn);

    this.createBtn = document.createElement("button");
    this.createBtn.type = "button";
    this.createBtn.className = "btn btn-primary create-action";
    this.createBtn.textContent = "Create";
    this.createBtn.addEventListener("click", () => this.callbacks.onCreate());
    actions.appendChild(this.createBtn);

    toolbar.appendChild(actions);
    grid.appendChild(toolbar);

    this.errorEl = document.createElement("div");
    this.errorEl.className = "alert alert-danger";
    this.errorEl.setAttribute("role", "alert");
    this.errorEl.hidden = true;
    grid.appendChild(this.errorEl);

    this.statusEl = document.createElement("div");
    this.statusEl.className = "text-muted lfs-status";
    this.statusEl.hidden = true;
    grid.appendChild(this.statusEl);

    const tableWrap = document.createElement("div");
    tableWrap.className = "view-grid table-responsive";

    const table = document.createElement("table");
    table.className = "table table-striped table-hover";
    table.setAttribute("role", "grid");

    const thead = document.createElement("thead");
    thead.className = "lfs-thead";
    table.appendChild(thead);

    this.tableBody = document.createElement("tbody");
    table.appendChild(this.tableBody);

    tableWrap.appendChild(table);
    grid.appendChild(tableWrap);

    const pager = document.createElement("div");
    pager.className = "view-pagination clearfix";

    this.prevBtn = document.createElement("button");
    this.prevBtn.type = "button";
    this.prevBtn.className = "btn btn-default";
    this.prevBtn.textContent = "Previous";
    this.prevBtn.addEventListener("click", () => this.callbacks.onPrevPage());
    pager.appendChild(this.prevBtn);

    this.pagerInfo = document.createElement("span");
    this.pagerInfo.className = "page-info text-muted";
    pager.appendChild(this.pagerInfo);

    this.nextBtn = document.createElement("button");
    this.nextBtn.type = "button";
    this.nextBtn.className = "btn btn-default";
    this.nextBtn.textContent = "Next";
    this.nextBtn.addEventListener("click", () => this.callbacks.onNextPage());
    pager.appendChild(this.nextBtn);

    grid.appendChild(pager);
    this.root.appendChild(grid);
    this.container.appendChild(this.root);
  }

  public setLoading(isLoading: boolean, message = "Loading..."): void {
    this.statusEl.hidden = !isLoading;
    this.statusEl.textContent = message;
  }

  public setError(message: string | null): void {
    if (!message) {
      this.errorEl.hidden = true;
      this.errorEl.textContent = "";
      return;
    }
    this.errorEl.hidden = false;
    this.errorEl.textContent = message;
  }

  public render(
    config: ControlConfig,
    records: EntityRecord[],
    pageNumber: number,
    hasNextPage: boolean,
    emptyMessage?: string
  ): void {
    this.createBtn.hidden = !config.enableCreate;
    this.createBtn.disabled = !config.enableCreate;

    const thead = this.root.querySelector(".lfs-thead") as HTMLTableSectionElement;
    thead.innerHTML = "";
    const headerRow = document.createElement("tr");

    for (const col of config.displayColumns) {
      const th = document.createElement("th");
      th.scope = "col";
      th.textContent = this.formatHeader(col);
      headerRow.appendChild(th);
    }

    if (config.enableEdit || config.enableDelete) {
      const th = document.createElement("th");
      th.scope = "col";
      th.className = "actions";
      th.textContent = "Actions";
      headerRow.appendChild(th);
    }

    thead.appendChild(headerRow);
    this.tableBody.innerHTML = "";

    if (!records.length) {
      const tr = document.createElement("tr");
      const td = document.createElement("td");
      td.colSpan =
        config.displayColumns.length + (config.enableEdit || config.enableDelete ? 1 : 0);
      td.className = "text-muted text-center";
      td.textContent = emptyMessage || "No related records found.";
      tr.appendChild(td);
      this.tableBody.appendChild(tr);
    } else {
      for (const record of records) {
        const tr = document.createElement("tr");

        for (const col of config.displayColumns) {
          const td = document.createElement("td");
          td.textContent = this.formatCell(record[col]);
          tr.appendChild(td);
        }

        if (config.enableEdit || config.enableDelete) {
          const td = document.createElement("td");
          td.className = "actions";

          if (config.enableEdit) {
            const editBtn = document.createElement("button");
            editBtn.type = "button";
            editBtn.className = "btn btn-link edit-link";
            editBtn.textContent = "Edit";
            editBtn.addEventListener("click", () => this.callbacks.onEdit(record));
            td.appendChild(editBtn);
          }

          if (config.enableDelete) {
            const deleteBtn = document.createElement("button");
            deleteBtn.type = "button";
            deleteBtn.className = "btn btn-link delete-link text-danger";
            deleteBtn.textContent = "Delete";
            deleteBtn.addEventListener("click", () => this.callbacks.onDelete(record));
            td.appendChild(deleteBtn);
          }

          tr.appendChild(td);
        }

        this.tableBody.appendChild(tr);
      }
    }

    this.pagerInfo.textContent = `Page ${pageNumber}`;
    this.prevBtn.disabled = pageNumber <= 1;
    this.nextBtn.disabled = !hasNextPage;
  }

  public setVisible(visible: boolean): void {
    this.root.hidden = !visible;
  }

  public destroy(): void {
    this.root.remove();
  }

  private formatHeader(logicalName: string): string {
    if (logicalName.includes("@OData.Community.Display.V1.FormattedValue")) {
      const base = logicalName.split("@")[0] || logicalName;
      const parts = base.replace(/^_/, "").replace(/_value$/, "").split("_");
      const last = parts[parts.length - 1] || base;
      return last.charAt(0).toUpperCase() + last.slice(1);
    }
    const parts = logicalName.split("_");
    const last = parts[parts.length - 1] || logicalName;
    return last.charAt(0).toUpperCase() + last.slice(1);
  }

  private formatCell(value: unknown): string {
    if (value === null || value === undefined) {
      return "";
    }
    if (typeof value === "boolean") {
      return value ? "Yes" : "No";
    }
    if (typeof value === "object") {
      try {
        return JSON.stringify(value);
      } catch {
        return String(value);
      }
    }
    return String(value);
  }
}
