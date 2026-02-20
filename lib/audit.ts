import { prisma } from '@/lib/prisma';
import type { AuditAction } from '@prisma/client';

export async function createAuditLog(params: {
  actorId?: string;
  targetId?: string;
  action: AuditAction;
  metadata?: Record<string, unknown>;
}) {
  await prisma.auditLog.create({
    data: {
      actorId: params.actorId,
      targetId: params.targetId,
      action: params.action,
      metadata: params.metadata as object,
    },
  });
}
