// Audit logging for sensitive mutations. Route handlers call this when mutating
// admin/user data. Reference: architecture rule "write audit logs when mutating sensitive data".

export type AuditEntry = {
  actorId: string;
  action: string; // e.g. "component.create", "setup.delete"
  targetId?: string;
  metadata?: Record<string, unknown>;
};

// TODO: persist to a dedicated store (DB table or external sink).
export async function writeAuditLog(entry: AuditEntry): Promise<void> {
  console.info("[audit]", entry.action, entry.actorId, entry.targetId ?? "");
}
