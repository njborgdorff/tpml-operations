-- CreateEnum
CREATE TYPE "KnowledgeCategory" AS ENUM ('DECISION', 'LESSON_LEARNED', 'PROCEDURE', 'CLIENT_INFO', 'TECHNICAL', 'INCIDENT');

-- CreateTable
CREATE TABLE "knowledge_entries" (
    "id" TEXT NOT NULL,
    "category" "KnowledgeCategory" NOT NULL,
    "tags" TEXT[],
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "sourceRole" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "projectId" TEXT,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "verifiedAt" TIMESTAMP(3),
    "verifiedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "knowledge_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "knowledge_entries_category_tags_idx" ON "knowledge_entries"("category", "tags");

-- CreateIndex
CREATE INDEX "knowledge_entries_sourceRole_idx" ON "knowledge_entries"("sourceRole");

-- CreateIndex
CREATE INDEX "knowledge_entries_projectId_idx" ON "knowledge_entries"("projectId");
