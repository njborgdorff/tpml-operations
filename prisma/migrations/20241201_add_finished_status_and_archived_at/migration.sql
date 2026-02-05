-- AlterEnum
ALTER TYPE "ProjectStatus" ADD VALUE 'FINISHED';

-- AlterTable
ALTER TABLE "Project" ADD COLUMN "archivedAt" TIMESTAMP(3);

-- CreateIndex (if not already exists)
CREATE INDEX IF NOT EXISTS "Project_status_idx" ON "Project"("status");
CREATE INDEX IF NOT EXISTS "Project_userId_idx" ON "Project"("userId");
CREATE INDEX IF NOT EXISTS "ProjectStatusHistory_projectId_idx" ON "ProjectStatusHistory"("projectId");