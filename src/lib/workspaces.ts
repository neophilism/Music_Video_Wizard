import { Prisma, WorkspaceRole } from "@prisma/client";
import { db } from "@/lib/db";

const SERIALIZABLE_RETRIES = 3;

export function personalWorkspaceName(displayName: string): string {
  const normalized = displayName.trim().replace(/\s+/g, " ");
  return normalized ? `${normalized} Workspace` : "My Workspace";
}

export async function ensurePersonalWorkspace(
  userId: string,
  displayName: string
) {
  for (let attempt = 0; attempt < SERIALIZABLE_RETRIES; attempt += 1) {
    try {
      return await db.$transaction(
        async (tx) => {
          const existing = await tx.workspaceMembership.findFirst({
            where: { userId },
            orderBy: { createdAt: "asc" },
            include: { workspace: true }
          });

          if (existing) return existing.workspace;

          const workspace = await tx.workspace.create({
            data: {
              name: personalWorkspaceName(displayName)
            }
          });

          await tx.workspaceMembership.create({
            data: {
              workspaceId: workspace.id,
              userId,
              role: WorkspaceRole.OWNER
            }
          });

          return workspace;
        },
        {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable
        }
      );
    } catch (error) {
      const shouldRetry =
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2034" &&
        attempt < SERIALIZABLE_RETRIES - 1;

      if (!shouldRetry) throw error;
    }
  }

  throw new Error("Unable to provision workspace");
}
