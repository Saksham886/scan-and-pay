import { prisma } from "@/backend/lib/db";
import type { Prisma } from "@/generated/prisma";

export interface AuditEntry {
  entityType: string;
  entityId: string;
  action: string;
  actorId?: string | null;
  oldData?: Prisma.InputJsonValue | null;
  newData?: Prisma.InputJsonValue | null;
}

/**
 * Best-effort audit log write. Never throws, never blocks a request even if
 * the DB is degraded. Critical security-relevant actions should call this.
 */
export async function audit(entry: AuditEntry): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        entityType: entry.entityType,
        entityId: entry.entityId,
        action: entry.action,
        actorId: entry.actorId ?? null,
        oldData: entry.oldData ?? undefined,
        newData: entry.newData ?? undefined,
      },
    });
  } catch (err) {
    // Audit failures should be visible but never break the user-facing flow
    console.error("[Audit] write failed:", err);
  }
}

/** Fire-and-forget variant (don't await). */
export function auditAsync(entry: AuditEntry): void {
  audit(entry).catch(() => {});
}
