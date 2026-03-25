/*
  Warnings:

  - Added the required column `createdByRole` to the `announcements` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "AnnouncementAudience" AS ENUM ('HOME', 'VENUE');

-- AlterTable
ALTER TABLE "announcements" ADD COLUMN     "audience" "AnnouncementAudience" NOT NULL DEFAULT 'HOME',
ADD COLUMN     "courtId" UUID,
ADD COLUMN     "createdByRole" "UserRole" NOT NULL,
ADD COLUMN     "organizerId" UUID,
ALTER COLUMN "publishedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "courts" ALTER COLUMN "status" SET DEFAULT 'PENDING_APPROVAL';

-- CreateIndex
CREATE INDEX "announcements_audience_isPublished_idx" ON "announcements"("audience", "isPublished");

-- CreateIndex
CREATE INDEX "announcements_courtId_isPublished_idx" ON "announcements"("courtId", "isPublished");

-- CreateIndex
CREATE INDEX "announcements_organizerId_isPublished_idx" ON "announcements"("organizerId", "isPublished");

-- AddForeignKey
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_organizerId_fkey" FOREIGN KEY ("organizerId") REFERENCES "organizers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_courtId_fkey" FOREIGN KEY ("courtId") REFERENCES "courts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
