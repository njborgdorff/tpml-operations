-- CreateEnum
CREATE TYPE "ProjectType" AS ENUM ('NEW_PROJECT', 'NEW_FEATURE', 'BUG_FIX');

-- AlterTable
ALTER TABLE "projects" ADD COLUMN "projectType" "ProjectType" NOT NULL DEFAULT 'NEW_PROJECT';
ALTER TABLE "projects" ADD COLUMN "bugDescription" TEXT;
