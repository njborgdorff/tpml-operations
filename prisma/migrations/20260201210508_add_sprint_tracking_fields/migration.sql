-- AlterEnum
ALTER TYPE "ArtifactType" ADD VALUE 'HANDOFF';

-- AlterEnum
ALTER TYPE "ProjectStatus" ADD VALUE 'IN_PROGRESS';

-- AlterEnum
ALTER TYPE "SprintStatus" ADD VALUE 'IN_PROGRESS';

-- AlterTable
ALTER TABLE "sprints" ADD COLUMN     "completedAt" TIMESTAMP(3),
ADD COLUMN     "startedAt" TIMESTAMP(3);
