import { prisma } from "@/lib/prisma";

export interface LogAuditParams {
  userId?: string | null;
  action: string;
  module: "ORDERS" | "INVOICES" | "BUYERS" | "ACCOUNTS" | "EMPLOYEES" | "USERS" | "SETTINGS";
  recordId?: string | null;
  details?: Record<string, unknown> | null;
  ipAddress?: string | null;
}

export async function logAuditEvent(params: LogAuditParams) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: params.userId,
        action: params.action,
        module: params.module,
        recordId: params.recordId,
        details: (params.details ?? undefined) as any,
        ipAddress: params.ipAddress,
      },
    });
  } catch (error) {
    // Non-blocking logger to ensure main business transactions never fail because of audit logging
    console.error("[AuditLog Error]:", error);
  }
}
