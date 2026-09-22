-- AlterTable
ALTER TABLE `notifications` ADD COLUMN `broadcastId` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `notification_broadcasts` (
    `id` VARCHAR(191) NOT NULL,
    `createdById` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `message` TEXT NOT NULL,
    `type` ENUM('SYSTEM', 'CAMPAIGN', 'REWARD', 'WITHDRAWAL', 'REFERRAL', 'SUPPORT', 'SECURITY', 'PROMOTIONAL', 'GAMIFICATION', 'MARKETPLACE') NOT NULL DEFAULT 'PROMOTIONAL',
    `channels` JSON NOT NULL,
    `audience` JSON NOT NULL,
    `status` ENUM('SCHEDULED', 'SENDING', 'SENT', 'CANCELLED', 'FAILED') NOT NULL DEFAULT 'SCHEDULED',
    `scheduledAt` DATETIME(3) NOT NULL,
    `startedAt` DATETIME(3) NULL,
    `completedAt` DATETIME(3) NULL,
    `recipientCount` INTEGER NOT NULL DEFAULT 0,
    `cursorUserId` VARCHAR(191) NULL,
    `failureReason` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    INDEX `notification_broadcasts_status_scheduledAt_idx`(`status`, `scheduledAt`),
    INDEX `notification_broadcasts_createdById_idx`(`createdById`),
    INDEX `notification_broadcasts_deletedAt_idx`(`deletedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `notifications_broadcastId_idx` ON `notifications`(`broadcastId`);

-- AddForeignKey
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_broadcastId_fkey` FOREIGN KEY (`broadcastId`) REFERENCES `notification_broadcasts`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notification_broadcasts` ADD CONSTRAINT `notification_broadcasts_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

