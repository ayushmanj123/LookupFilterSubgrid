import { ControlConfig, FormMode, RecordFormValues } from "../types";

export interface RecordFormCallbacks {
  onSubmit: (values: RecordFormValues) => void;
  onCancel: () => void;
}

export class RecordForm {
  private overlay: HTMLDivElement;
  private form: HTMLFormElement;
  private titleEl: HTMLHeadingElement;
  private fieldsHost: HTMLDivElement;
  private errorEl: HTMLDivElement;
  private submitBtn: HTMLButtonElement;
  private mode: FormMode = "create";

  constructor(
    private readonly container: HTMLDivElement,
    private readonly callbacks: RecordFormCallbacks
  ) {
    this.overlay = document.createElement("div");
    this.overlay.className = "lfs-modal-overlay";
    this.overlay.hidden = true;

    const panel = document.createElement("div");
    panel.className = "lfs-modal";
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-modal", "true");

    this.titleEl = document.createElement("h2");
    this.titleEl.className = "lfs-modal-title";
    panel.appendChild(this.titleEl);

    this.errorEl = document.createElement("div");
    this.errorEl.className = "lfs-error";
    this.errorEl.hidden = true;
    panel.appendChild(this.errorEl);

    this.form = document.createElement("form");
    this.form.className = "lfs-form";
    this.form.addEventListener("submit", (e) => {
      e.preventDefault();
      this.callbacks.onSubmit(this.collectValues());
    });

    this.fieldsHost = document.createElement("div");
    this.fieldsHost.className = "lfs-form-fields";
    this.form.appendChild(this.fieldsHost);

    const footer = document.createElement("div");
    footer.className = "lfs-modal-footer";

    const cancelBtn = document.createElement("button");
    cancelBtn.type = "button";
    cancelBtn.className = "lfs-btn lfs-btn-secondary";
    cancelBtn.textContent = "Cancel";
    cancelBtn.addEventListener("click", () => this.callbacks.onCancel());
    footer.appendChild(cancelBtn);

    this.submitBtn = document.createElement("button");
    this.submitBtn.type = "submit";
    this.submitBtn.className = "lfs-btn lfs-btn-primary";
    this.submitBtn.textContent = "Save";
    footer.appendChild(this.submitBtn);

    this.form.appendChild(footer);
    panel.appendChild(this.form);
    this.overlay.appendChild(panel);
    this.container.appendChild(this.overlay);
  }

  public open(
    mode: FormMode,
    config: ControlConfig,
    initial?: RecordFormValues
  ): void {
    this.mode = mode;
    this.titleEl.textContent = mode === "create" ? "New record" : "Edit record";
    this.submitBtn.textContent = mode === "create" ? "Create" : "Save";
    this.setError(null);
    this.buildFields(config, initial || {});
    this.overlay.hidden = false;
  }

  public close(): void {
    this.overlay.hidden = true;
    this.fieldsHost.innerHTML = "";
    this.setError(null);
  }

  public setBusy(isBusy: boolean): void {
    this.submitBtn.disabled = isBusy;
    this.submitBtn.textContent = isBusy
      ? "Saving..."
      : this.mode === "create"
        ? "Create"
        : "Save";
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

  public destroy(): void {
    this.overlay.remove();
  }

  private buildFields(config: ControlConfig, initial: RecordFormValues): void {
    this.fieldsHost.innerHTML = "";

    const columns = Array.from(
      new Set([config.primaryNameAttribute, ...config.displayColumns].filter(Boolean))
    );

    for (const column of columns) {
      const field = document.createElement("div");
      field.className = "lfs-field";

      const label = document.createElement("label");
      label.className = "lfs-label";
      label.htmlFor = `lfs-field-${column}`;
      label.textContent = this.formatLabel(column);
      field.appendChild(label);

      const input = document.createElement("input");
      input.type = "text";
      input.id = `lfs-field-${column}`;
      input.name = column;
      input.className = "lfs-input";
      input.autocomplete = "off";

      const initialValue = initial[column];
      if (initialValue !== null && initialValue !== undefined) {
        input.value = String(initialValue);
      }

      field.appendChild(input);
      this.fieldsHost.appendChild(field);
    }
  }

  private collectValues(): RecordFormValues {
    const values: RecordFormValues = {};
    const inputs = this.fieldsHost.querySelectorAll("input");
    inputs.forEach((input) => {
      values[input.name] = input.value;
    });
    return values;
  }

  private formatLabel(logicalName: string): string {
    const parts = logicalName.split("_");
    const last = parts[parts.length - 1] || logicalName;
    return last.charAt(0).toUpperCase() + last.slice(1);
  }
}

export function confirmDelete(recordLabel: string, actionLabel = "Remove Other Name"): boolean {
  return window.confirm(`${actionLabel} "${recordLabel}"? This cannot be undone.`);
}
