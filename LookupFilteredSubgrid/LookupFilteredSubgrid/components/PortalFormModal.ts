import { buildModalFormUrl } from "../types";

export interface PortalFormModalCallbacks {
  onClosed: () => void;
}

/**
 * Power Pages List-style Bootstrap modal that loads a Basic Form in an iframe.
 * URL: /_portal/modal-form-template-path/{portalId}?id={recordId}&entityformid={entityFormId}
 */
export class PortalFormModal {
  private section: HTMLElement;
  private iframe: HTMLIFrameElement;
  private loadingEl: HTMLElement;
  private titleEl: HTMLElement;
  private closedByHandler = false;

  constructor(
    private readonly host: HTMLElement,
    private readonly callbacks: PortalFormModalCallbacks
  ) {
    this.section = document.createElement("section");
    this.section.className = "modal fade modal-form modal-form-insert";
    this.section.setAttribute("role", "dialog");
    this.section.setAttribute("tabindex", "-1");
    this.section.setAttribute("aria-hidden", "true");
    this.section.setAttribute("data-backdrop", "static");
    this.section.style.display = "none";

    this.section.innerHTML = `
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <div class="modal-header">
            <button type="button" class="close" data-dismiss="modal" aria-label="Close" title="Close">
              <span aria-hidden="true">&times;</span>
              <span class="sr-only">Close</span>
            </button>
            <h1 class="modal-title h4">New record</h1>
          </div>
          <div class="modal-body">
            <div class="form-loading" style="display:none;text-align:center;padding:24px;">
              <span class="fa fa-spinner fa-spin fa-4x" aria-hidden="true"></span>
            </div>
            <iframe title="New record" src="" style="width:100%;min-height:420px;border:0;"></iframe>
          </div>
        </div>
      </div>
    `;

    this.titleEl = this.section.querySelector(".modal-title") as HTMLElement;
    this.loadingEl = this.section.querySelector(".form-loading") as HTMLElement;
    this.iframe = this.section.querySelector("iframe") as HTMLIFrameElement;

    const closeBtn = this.section.querySelector(".close") as HTMLButtonElement;
    closeBtn.addEventListener("click", () => this.close());

    this.iframe.addEventListener("load", () => {
      this.loadingEl.style.display = "none";
      try {
        const doc = this.iframe.contentDocument;
        const control = doc?.getElementById("EntityFormControl");
        if (control) {
          (control as HTMLElement).style.display = "";
        }
      } catch {
        // Cross-origin — ignore.
      }
    });

    this.host.appendChild(this.section);
  }

  public openCreate(options: {
    portalId: string;
    recordId: string;
    entityFormId: string;
    /** Query string for Basic Form Associated Table Reference (e.g. fc_contact=guid). */
    associateLookupParamName?: string;
    associateLookupRecordId?: string;
    title?: string;
  }): void {
    this.titleEl.textContent = options.title || "Create";
    const associateParam = (options.associateLookupParamName || "").trim();
    const associateId = (options.associateLookupRecordId || "").replace(/[{}]/g, "").trim();
    const url = buildModalFormUrl(
      options.portalId,
      options.recordId,
      options.entityFormId,
      associateParam && associateId
        ? { paramName: associateParam, recordId: associateId }
        : null
    );

    this.loadingEl.style.display = "block";
    this.iframe.src = url;
    this.show();
  }

  public close(): void {
    this.hide(true);
  }

  public destroy(): void {
    this.section.remove();
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private getJQ(): any {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    return w.jQuery || w.$ || null;
  }

  private notifyClosed(): void {
    this.iframe.src = "";
    this.callbacks.onClosed();
  }

  private show(): void {
    this.section.setAttribute("aria-hidden", "false");
    this.closedByHandler = false;
    const $ = this.getJQ();
    if ($ && typeof $.fn?.modal === "function") {
      const $modal = $(this.section);
      $modal.off("hidden.bs.modal.lfs");
      $modal.on("hidden.bs.modal.lfs", () => {
        this.section.setAttribute("aria-hidden", "true");
        if (!this.closedByHandler) {
          this.closedByHandler = true;
          this.notifyClosed();
        }
      });
      $modal.modal({ backdrop: "static", keyboard: true });
      return;
    }

    this.section.style.display = "block";
    this.section.classList.add("in");
    document.body.classList.add("modal-open");
  }

  private hide(notify: boolean): void {
    const $ = this.getJQ();
    if ($ && typeof $.fn?.modal === "function") {
      $(this.section).modal("hide");
      return;
    }
    this.section.classList.remove("in");
    this.section.style.display = "none";
    this.section.setAttribute("aria-hidden", "true");
    document.body.classList.remove("modal-open");
    if (notify) {
      this.notifyClosed();
    }
  }
}
