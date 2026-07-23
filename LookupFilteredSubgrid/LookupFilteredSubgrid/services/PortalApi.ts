export interface PortalAjaxResponse {
  data: unknown;
  getResponseHeader: (name: string) => string | null;
}

export interface SafeAjaxOptions {
  type: string;
  url: string;
  contentType?: string;
  data?: string;
  headers?: Record<string, string>;
  success?: (data: unknown, textStatus: string, xhr: PortalXhrLike) => void;
  error?: (xhr: PortalXhrLike, textStatus: string, errorThrown: string) => void;
}

interface PortalXhrLike {
  status?: number;
  responseText?: string;
  getResponseHeader?: (name: string) => string | null;
}

declare global {
  interface Window {
    webapi?: {
      safeAjax: (options: SafeAjaxOptions) => unknown;
    };
  }
}

/**
 * Promise wrapper around Power Pages webapi.safeAjax (/_api).
 */
export class PortalApi {
  /**
   * @param maxPageSize When set, sends Prefer odata.maxpagesize (Power Pages paging).
   *   Do not use $top for page-by-page navigation — it suppresses @odata.nextLink.
   */
  public get(url: string, maxPageSize?: number): Promise<PortalAjaxResponse> {
    const preferParts = [
      'odata.include-annotations="OData.Community.Display.V1.FormattedValue"',
    ];
    if (typeof maxPageSize === "number" && maxPageSize > 0) {
      preferParts.push(`odata.maxpagesize=${Math.floor(maxPageSize)}`);
    }
    return this.request("GET", url, undefined, {
      Prefer: preferParts.join(","),
    });
  }

  public post(url: string, body: Record<string, unknown>): Promise<PortalAjaxResponse> {
    return this.request("POST", url, body);
  }

  public patch(url: string, body: Record<string, unknown>): Promise<PortalAjaxResponse> {
    return this.request("PATCH", url, body);
  }

  public del(url: string): Promise<PortalAjaxResponse> {
    return this.request("DELETE", url);
  }

  private getSafeAjax(): (options: SafeAjaxOptions) => unknown {
    const fn = window.webapi?.safeAjax;
    if (typeof fn !== "function") {
      throw new Error(
        "Include the Power Pages Web API wrapper script on the page (webapi.safeAjax)."
      );
    }
    return fn.bind(window.webapi);
  }

  private request(
    type: string,
    url: string,
    body?: Record<string, unknown>,
    headers?: Record<string, string>
  ): Promise<PortalAjaxResponse> {
    return new Promise((resolve, reject) => {
      try {
        const options: SafeAjaxOptions = {
          type,
          url,
          contentType: "application/json",
          data: body === undefined ? undefined : JSON.stringify(body),
          success: (data, _textStatus, xhr) => {
            resolve({
              data,
              getResponseHeader: (name: string) =>
                xhr?.getResponseHeader ? xhr.getResponseHeader(name) : null,
            });
          },
          error: (xhr, _textStatus, errorThrown) => {
            const detail =
              (xhr?.responseText && String(xhr.responseText).slice(0, 400)) ||
              errorThrown ||
              `HTTP ${xhr?.status || "error"}`;
            reject(new Error(detail));
          },
        };
        if (headers && Object.keys(headers).length) {
          options.headers = headers;
        }
        this.getSafeAjax()(options);
      } catch (err) {
        reject(err instanceof Error ? err : new Error(String(err)));
      }
    });
  }
}
