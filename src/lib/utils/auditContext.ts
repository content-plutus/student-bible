import type { SupabaseClient } from "@supabase/supabase-js";

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

export async function applyAuditContext(
  supabase: SupabaseClient,
  context: AuditContext,
): Promise<void> {
  const actor = context.actor?.trim() ?? null;
  const requestId = context.requestId?.trim() ?? null;

  if (!actor && !requestId) {
    return;
  }

  const { error } = await supabase.rpc("set_audit_context", {
    p_actor: actor,
    p_request_id: requestId,
  });

  if (error) {
    console.warn("Failed to set audit context", error.message ?? error);
  }
}
