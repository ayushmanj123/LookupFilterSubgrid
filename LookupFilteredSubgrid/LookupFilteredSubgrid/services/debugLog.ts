/** Debug-mode instrumentation helper (session 5317e6). */
export function agentLog(
  hypothesisId: string,
  location: string,
  message: string,
  data: Record<string, unknown> = {}
): void {
  const payload = {
    sessionId: "5317e6",
    hypothesisId,
    location,
    message,
    data,
    timestamp: Date.now(),
    runId: "pre-fix",
  };

  // #region agent log
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    w.__LFS_DEBUG = w.__LFS_DEBUG || [];
    w.__LFS_DEBUG.push(payload);
    // Keep last 20
    if (w.__LFS_DEBUG.length > 20) {
      w.__LFS_DEBUG.shift();
    }
    // eslint-disable-next-line no-console
    console.warn("[LFS-DEBUG]", hypothesisId, message, data);
  } catch {
    // ignore
  }

  fetch("http://127.0.0.1:7480/ingest/e7f83a64-6925-4dbf-b731-b85dceaea77f", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Debug-Session-Id": "5317e6",
    },
    body: JSON.stringify(payload),
  }).catch(() => {});
  // #endregion
}

export function formatAgentDebugForUi(): string {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const logs = ((window as any).__LFS_DEBUG || []) as Array<Record<string, unknown>>;
    if (!logs.length) {
      return "";
    }
    const last = logs.slice(-5);
    return (
      " | DEBUG: " +
      last
        .map((l) => `${l.hypothesisId}:${l.message}:${JSON.stringify(l.data)}`)
        .join(" || ")
    );
  } catch {
    return "";
  }
}
