-- AlterTable
ALTER TABLE "projects" ADD COLUMN "implementerId" TEXT;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_implementerId_fkey" FOREIGN KEY ("implementerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
