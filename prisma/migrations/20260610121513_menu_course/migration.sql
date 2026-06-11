-- AlterTable
ALTER TABLE "MenuItem" ADD COLUMN     "course" TEXT,
ADD COLUMN     "sortOrder" INTEGER NOT NULL DEFAULT 0;
