export interface AuditContext {
  actor?: string | null;
  requestId?: string | null;
}

export function buildAuditContext(request: Request, fallbackActor: string): AuditContext {
  const headers = request.headers;
  const actor =
    headers.get("x-audit-actor") ??
    headers.get("x-internal-api-key") ??
    fallbackActor ??
    "internal-api";
  const requestId =
    headers.get("x-request-id") ??
    headers.get("x-correlation-id") ??
    headers.get("x-requestid") ??
    (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : undefined);

  return {
    actor,
    requestId,
  };
}
