-- Add COMPLETE and FINISHED to ProjectStatus enum
ALTER TYPE "ProjectStatus" ADD VALUE IF NOT EXISTS 'COMPLETE';
ALTER TYPE "ProjectStatus" ADD VALUE IF NOT EXISTS 'FINISHED';

-- Add description and archivedAt to projects
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "archivedAt" TIMESTAMP(3);

-- Create project_status_history table
CREATE TABLE IF NOT EXISTS "project_status_history" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "oldStatus" "ProjectStatus",
    "newStatus" "ProjectStatus" NOT NULL,
    "changedBy" TEXT NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_status_history_pkey" PRIMARY KEY ("id")
);

-- Create indexes
CREATE INDEX IF NOT EXISTS "project_status_history_projectId_changedAt_idx" ON "project_status_history"("projectId", "changedAt");

-- Add foreign keys
ALTER TABLE "project_status_history" ADD CONSTRAINT "project_status_history_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "project_status_history" ADD CONSTRAINT "project_status_history_changedBy_fkey" FOREIGN KEY ("changedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
