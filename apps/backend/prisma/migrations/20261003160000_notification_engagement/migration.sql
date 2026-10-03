-- When a notification was first opened and first clicked through, for per-broadcast open and click rates.

-- AlterTable
ALTER TABLE `notifications` ADD COLUMN `openedAt` DATETIME(3) NULL,
    ADD COLUMN `clickedAt` DATETIME(3) NULL;
