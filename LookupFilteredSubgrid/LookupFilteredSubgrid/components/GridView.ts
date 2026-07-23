import { ControlConfig, EntityRecord, formatDateTimeDisplay } from "../types";

export interface GridViewCallbacks {
  onEdit: (record: EntityRecord) => void;
  onDelete: (record: EntityRecord) => void;
  onCreate: () => void;
  onSort: (column: string) => void;
  onFirstPage: () => void;
  onPrevPage: () => void;
  onNextPage: () => void;
}

export interface GridSortState {
  column: string;
  direction: "asc" | "desc";
}

/**
 * Grid chrome styled like a Power Pages List (entity-grid + Bootstrap).
 */
export class GridView {
  private root: HTMLDivElement;
  private tableBody: HTMLTableSectionElement;
  private statusEl: HTMLDivElement;
  private pagerList: HTMLUListElement;
  private createBtn: HTMLButtonElement;
  private errorEl: HTMLDivElement;
  private openMenuWrap: HTMLElement | null = null;
  private openMenuEl: HTMLElement | null = null;
  private docClickHandler: ((e: MouseEvent) => void) | null = null;
  private keyHandler: ((e: KeyboardEvent) => void) | null = null;
  private scrollResizeHandler: (() => void) | null = null;

  constructor(
    private readonly container: HTMLDivElement,
    private readonly callbacks: GridViewCallbacks
  ) {
    this.root = document.createElement("div");
    this.root.className = "lfs-host-inner entitylist";

    const grid = document.createElement("div");
    grid.className = "entity-grid";

    const toolbar = document.createElement("div");
    toolbar.className = "view-toolbar grid-actions lfs-toolbar-right";

    this.createBtn = document.createElement("button");
    this.createBtn.type = "button";
    this.createBtn.className = "btn btn-primary create-action";
    this.createBtn.textContent = "Create";
    this.createBtn.addEventListener("click", () => this.callbacks.onCreate());
    toolbar.appendChild(this.createBtn);

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
    this.pagerList = document.createElement("ul");
    this.pagerList.className = "pagination";
    pager.appendChild(this.pagerList);
    grid.appendChild(pager);

    this.root.appendChild(grid);
    this.container.appendChild(this.root);

    this.docClickHandler = (e: MouseEvent) => {
      if (!this.openMenuWrap || !this.openMenuEl) {
        return;
      }
      const target = e.target as Node | null;
      if (
        target &&
        (this.openMenuWrap.contains(target) || this.openMenuEl.contains(target))
      ) {
        return;
      }
      this.closeOpenMenu();
    };
    this.keyHandler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        this.closeOpenMenu();
      }
    };
    this.scrollResizeHandler = () => this.closeOpenMenu();
    document.addEventListener("click", this.docClickHandler);
    document.addEventListener("keydown", this.keyHandler);
    window.addEventListener("scroll", this.scrollResizeHandler, true);
    window.addEventListener("resize", this.scrollResizeHandler);
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
    sort: GridSortState,
    emptyMessage?: string
  ): void {
    this.closeOpenMenu();
    this.createBtn.hidden = !config.enableCreate;
    this.createBtn.disabled = !config.enableCreate;
    this.createBtn.textContent = (config.createButtonLabel || "").trim() || "Create";

    const thead = this.root.querySelector(".lfs-thead") as HTMLTableSectionElement;
    thead.innerHTML = "";
    const headerRow = document.createElement("tr");

    for (let i = 0; i < config.displayColumns.length; i++) {
      const col = config.displayColumns[i];
      const th = document.createElement("th");
      th.scope = "col";
      th.className = "lfs-sortable";
      if (sort.column === col) {
        th.classList.add(sort.direction === "asc" ? "sorted-asc" : "sorted-desc");
      }
      th.setAttribute("role", "columnheader");
      th.setAttribute("tabindex", "0");
      th.title = "Sort";

      const label = document.createElement("span");
      label.className = "lfs-sort-label";
      const customLabel = (config.displayColumnLabels || [])[i];
      label.textContent =
        customLabel && customLabel.trim()
          ? customLabel.trim()
          : this.formatHeader(col);
      th.appendChild(label);

      const caret = document.createElement("span");
      caret.className = "lfs-sort-caret";
      caret.setAttribute("aria-hidden", "true");
      th.appendChild(caret);

      const activate = (e: Event) => {
        e.preventDefault();
        this.callbacks.onSort(col);
      };
      th.addEventListener("click", activate);
      th.addEventListener("keydown", (e: KeyboardEvent) => {
        if (e.key === "Enter" || e.key === " ") {
          activate(e);
        }
      });
      headerRow.appendChild(th);
    }

    if (config.enableEdit || config.enableDelete) {
      const th = document.createElement("th");
      th.scope = "col";
      th.className = "actions";
      th.textContent = "";
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
          td.setAttribute("aria-label", "action menu");
          td.appendChild(this.buildActionsDropdown(config, record));
          tr.appendChild(td);
        }

        this.tableBody.appendChild(tr);
      }
    }

    this.renderPagination(pageNumber, hasNextPage);
  }

  public setVisible(visible: boolean): void {
    this.root.hidden = !visible;
  }

  public destroy(): void {
    this.closeOpenMenu();
    if (this.docClickHandler) {
      document.removeEventListener("click", this.docClickHandler);
    }
    if (this.keyHandler) {
      document.removeEventListener("keydown", this.keyHandler);
    }
    if (this.scrollResizeHandler) {
      window.removeEventListener("scroll", this.scrollResizeHandler, true);
      window.removeEventListener("resize", this.scrollResizeHandler);
    }
    this.root.remove();
  }

  private renderPagination(pageNumber: number, hasNextPage: boolean): void {
    this.pagerList.innerHTML = "";
    const canPrev = pageNumber > 1;

    this.pagerList.appendChild(
      this.createPagerItem("«", "First", !canPrev, () => this.callbacks.onFirstPage())
    );
    this.pagerList.appendChild(
      this.createPagerItem("‹", "Previous", !canPrev, () => this.callbacks.onPrevPage())
    );

    const pageItem = document.createElement("li");
    pageItem.className = "active";
    const pageLink = document.createElement("a");
    pageLink.href = "#";
    pageLink.textContent = String(pageNumber);
    pageLink.setAttribute("aria-current", "page");
    pageLink.addEventListener("click", (e) => e.preventDefault());
    pageItem.appendChild(pageLink);
    this.pagerList.appendChild(pageItem);

    this.pagerList.appendChild(
      this.createPagerItem("›", "Next", !hasNextPage, () => this.callbacks.onNextPage())
    );
    this.pagerList.appendChild(
      this.createPagerItem("»", "Last", true, () => undefined)
    );
  }

  private createPagerItem(
    label: string,
    title: string,
    disabled: boolean,
    onClick: () => void
  ): HTMLLIElement {
    const li = document.createElement("li");
    if (disabled) {
      li.className = "disabled";
    }
    const a = document.createElement("a");
    a.href = "#";
    a.textContent = label;
    a.title = title;
    a.setAttribute("aria-label", title);
    a.addEventListener("click", (e) => {
      e.preventDefault();
      if (disabled) {
        return;
      }
      onClick();
    });
    li.appendChild(a);
    return li;
  }

  private buildActionsDropdown(config: ControlConfig, record: EntityRecord): HTMLElement {
    const wrap = document.createElement("div");
    wrap.className = "dropdown action";

    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "btn btn-default btn-xs";
    toggle.setAttribute("data-toggle", "dropdown");
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-label", "action menu");
    toggle.setAttribute("title", "action menu");
    toggle.innerHTML =
      '<span class="fa fa-chevron-circle-down fa-fw" aria-hidden="true"></span>';
    wrap.appendChild(toggle);

    const menu = document.createElement("ul");
    menu.className = "dropdown-menu";
    menu.setAttribute("role", "menu");
    menu.hidden = true;

    const editLabel = (config.editActionLabel || "").trim() || "Edit";
    const deleteLabel = (config.deleteActionLabel || "").trim() || "Remove Other Name";
    const actionCount =
      (config.enableEdit ? 1 : 0) + (config.enableDelete ? 1 : 0);
    let actionPos = 0;

    if (config.enableEdit) {
      actionPos += 1;
      const editItem = document.createElement("li");
      editItem.setAttribute("role", "none");
      const editLink = document.createElement("a");
      editLink.href = "#";
      editLink.setAttribute("role", "menuitem");
      editLink.setAttribute("tabindex", "-1");
      editLink.className = "edit-link launch-modal";
      editLink.title = "Edit";
      editLink.setAttribute("aria-setsize", String(actionCount));
      editLink.setAttribute("aria-posinset", String(actionPos));
      editLink.textContent = editLabel;
      editLink.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.closeOpenMenu();
        this.callbacks.onEdit(record);
      });
      editItem.appendChild(editLink);
      menu.appendChild(editItem);
    }

    if (config.enableDelete) {
      actionPos += 1;
      const delItem = document.createElement("li");
      delItem.setAttribute("role", "none");
      const delLink = document.createElement("a");
      delLink.href = "#";
      delLink.setAttribute("role", "menuitem");
      delLink.setAttribute("tabindex", "-1");
      delLink.className = "delete-link";
      delLink.title = "Delete";
      delLink.setAttribute("aria-setsize", String(actionCount));
      delLink.setAttribute("aria-posinset", String(actionPos));
      delLink.textContent = deleteLabel;
      delLink.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.closeOpenMenu();
        this.callbacks.onDelete(record);
      });
      delItem.appendChild(delLink);
      menu.appendChild(delItem);
    }

    wrap.appendChild(menu);

    toggle.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const isOpen = this.openMenuWrap === wrap;
      this.closeOpenMenu();
      if (!isOpen) {
        this.openActionsMenu(wrap, toggle, menu);
      }
    });

    return wrap;
  }

  private openActionsMenu(
    wrap: HTMLElement,
    toggle: HTMLButtonElement,
    menu: HTMLElement
  ): void {
    wrap.classList.add("open");
    toggle.classList.add("aria-exp");
    toggle.setAttribute("aria-expanded", "true");
    menu.hidden = false;
    document.body.appendChild(menu);

    const rect = toggle.getBoundingClientRect();
    const menuWidth = Math.max(menu.offsetWidth || 180, 180);
    let left = rect.left;
    if (left + menuWidth > window.innerWidth - 8) {
      left = Math.max(8, rect.right - menuWidth);
    }
    let top = rect.bottom + 4;
    const menuHeight = menu.offsetHeight || 80;
    if (top + menuHeight > window.innerHeight - 8) {
      top = Math.max(8, rect.top - menuHeight - 4);
    }

    menu.style.position = "fixed";
    menu.style.left = `${left}px`;
    menu.style.top = `${top}px`;
    menu.style.right = "auto";
    menu.style.zIndex = "10050";
    menu.style.display = "block";

    this.openMenuWrap = wrap;
    this.openMenuEl = menu;
  }

  private closeOpenMenu(): void {
    if (!this.openMenuWrap && !this.openMenuEl) {
      return;
    }

    if (this.openMenuWrap) {
      this.openMenuWrap.classList.remove("open");
      const toggle = this.openMenuWrap.querySelector("button.btn");
      if (toggle) {
        toggle.classList.remove("aria-exp");
        toggle.setAttribute("aria-expanded", "false");
      }
    }

    if (this.openMenuEl) {
      this.openMenuEl.hidden = true;
      this.openMenuEl.style.position = "";
      this.openMenuEl.style.left = "";
      this.openMenuEl.style.top = "";
      this.openMenuEl.style.right = "";
      this.openMenuEl.style.zIndex = "";
      this.openMenuEl.style.display = "";
      if (this.openMenuWrap && this.openMenuEl.parentElement !== this.openMenuWrap) {
        this.openMenuWrap.appendChild(this.openMenuEl);
      }
    }

    this.openMenuWrap = null;
    this.openMenuEl = null;
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
    const formattedDate = formatDateTimeDisplay(value);
    if (formattedDate !== null) {
      return formattedDate;
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
