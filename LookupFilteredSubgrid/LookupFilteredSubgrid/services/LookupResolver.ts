import { normalizeGuid } from "../types";

declare global {
  interface Window {
    $pages?: {
      currentPage?: {
        forms?: Array<{
          controls?: Array<{
            getName: () => string;
            getValue: () => string | undefined;
          }>;
        }>;
      };
    };
  }
}

/**
 * Resolves a sibling lookup field GUID on a Power Pages (or model-driven) form.
 * Prefers Power Pages Client API, then falls back to portal DOM patterns.
 */
export class LookupResolver {
  private observer: MutationObserver | null = null;
  private changeHandler: (() => void) | null = null;
  private listenedElements: Element[] = [];

  public getLookupGuid(lookupFieldLogicalName: string): string | null {
    if (!lookupFieldLogicalName) {
      return null;
    }

    const fromClientApi = this.fromPagesClientApi(lookupFieldLogicalName);
    if (fromClientApi) {
      return fromClientApi;
    }

    return this.fromDom(lookupFieldLogicalName);
  }

  public watch(
    lookupFieldLogicalName: string,
    onChange: (guid: string | null) => void
  ): void {
    this.unwatch();

    this.changeHandler = () => {
      onChange(this.getLookupGuid(lookupFieldLogicalName));
    };

    const candidates = this.findLookupElements(lookupFieldLogicalName);
    for (const el of candidates) {
      el.addEventListener("change", this.changeHandler);
      el.addEventListener("input", this.changeHandler);
      this.listenedElements.push(el);
    }

    // Portal lookups often update hidden inputs without firing change on the visible control.
    this.observer = new MutationObserver(() => {
      if (this.changeHandler) {
        this.changeHandler();
      }
    });

    const watchRoots = candidates.length
      ? candidates.map((el) => el.closest(".control") || el.parentElement || el)
      : [document.body];

    for (const root of watchRoots) {
      if (root) {
        this.observer.observe(root, {
          attributes: true,
          childList: true,
          subtree: true,
          characterData: true,
          attributeFilter: ["value", "data-id", "data-value", "title"],
        });
      }
    }
  }

  public unwatch(): void {
    if (this.changeHandler) {
      for (const el of this.listenedElements) {
        el.removeEventListener("change", this.changeHandler);
        el.removeEventListener("input", this.changeHandler);
      }
    }
    this.listenedElements = [];
    this.changeHandler = null;

    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
  }

  private fromPagesClientApi(lookupFieldLogicalName: string): string | null {
    try {
      const forms = window.$pages?.currentPage?.forms;
      if (!forms || !forms.length) {
        return null;
      }

      for (const form of forms) {
        const controls = form.controls || [];
        for (const control of controls) {
          const name = control.getName?.();
          if (
            name === lookupFieldLogicalName ||
            name === `${lookupFieldLogicalName}_name` ||
            name?.endsWith(lookupFieldLogicalName)
          ) {
            const raw = control.getValue?.();
            const guid = normalizeGuid(raw);
            if (guid) {
              return guid;
            }
            // Lookup values may be "name|guid" or JSON-like in some portal builds
            const extracted = this.extractGuidFromString(raw);
            if (extracted) {
              return extracted;
            }
          }
        }
      }
    } catch {
      // Client API may be unavailable; fall through to DOM.
    }
    return null;
  }

  private fromDom(lookupFieldLogicalName: string): string | null {
    const elements = this.findLookupElements(lookupFieldLogicalName);
    for (const el of elements) {
      const guid = this.readGuidFromElement(el);
      if (guid) {
        return guid;
      }
    }
    return null;
  }

  private findLookupElements(lookupFieldLogicalName: string): Element[] {
    const name = lookupFieldLogicalName;
    const selectors = [
      `#${name}`,
      `#${name}_name`,
      `#${name}_entityname`,
      `input[id='${name}']`,
      `input[id='${name}_name']`,
      `input[name='${name}']`,
      `input[name='${name}_name']`,
      `[data-id='${name}']`,
      `[data-attribute='${name}']`,
      `select[id='${name}']`,
    ];

    const found: Element[] = [];
    const seen = new Set<Element>();

    for (const selector of selectors) {
      try {
        document.querySelectorAll(selector).forEach((el) => {
          if (!seen.has(el)) {
            seen.add(el);
            found.push(el);
          }
        });
      } catch {
        // Invalid selector — skip.
      }
    }

    return found;
  }

  private readGuidFromElement(el: Element): string | null {
    if (el instanceof HTMLInputElement || el instanceof HTMLSelectElement) {
      const fromValue = normalizeGuid(el.value) || this.extractGuidFromString(el.value);
      if (fromValue) {
        return fromValue;
      }
    }

    const attrCandidates = [
      el.getAttribute("value"),
      el.getAttribute("data-id"),
      el.getAttribute("data-value"),
      el.getAttribute("data-lookupid"),
      el.getAttribute("title"),
    ];

    for (const attr of attrCandidates) {
      const guid = normalizeGuid(attr) || this.extractGuidFromString(attr);
      if (guid) {
        return guid;
      }
    }

    // Power Pages lookup entity id is often in a sibling hidden field: {field}_id or similar
    const id = el.id || "";
    if (id) {
      const base = id.replace(/_name$/, "");
      const idField =
        document.getElementById(`${base}_id`) ||
        document.getElementById(`${base}id`) ||
        document.querySelector(`input[id^='${base}'][id$='_id']`);
      if (idField instanceof HTMLInputElement) {
        const guid =
          normalizeGuid(idField.value) || this.extractGuidFromString(idField.value);
        if (guid) {
          return guid;
        }
      }
    }

    return null;
  }

  private extractGuidFromString(value: string | null | undefined): string | null {
    if (!value) {
      return null;
    }
    const match = value.match(
      /[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/
    );
    return match ? normalizeGuid(match[0]) : null;
  }
}
