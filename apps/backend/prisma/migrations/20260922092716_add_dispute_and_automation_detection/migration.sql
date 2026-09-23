-- AlterTable
ALTER TABLE `campaign_tasks` MODIFY `verificationType` ENUM('AI', 'MANUAL', 'HYBRID', 'SYSTEM') NOT NULL DEFAULT 'AI';

-- AlterTable
ALTER TABLE `devices` ADD COLUMN `isAutomationDetected` BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE `disputes` (
    `id` VARCHAR(191) NOT NULL,
    `submissionId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `reason` TEXT NOT NULL,
    `status` ENUM('OPEN', 'UNDER_REVIEW', 'UPHELD', 'REVERSED') NOT NULL DEFAULT 'OPEN',
    `adminNotes` TEXT NULL,
    `resolvedBy` VARCHAR(191) NULL,
    `resolvedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    UNIQUE INDEX `disputes_submissionId_key`(`submissionId`),
    INDEX `disputes_userId_idx`(`userId`),
    INDEX `disputes_status_idx`(`status`),
    INDEX `disputes_resolvedBy_idx`(`resolvedBy`),
    INDEX `disputes_deletedAt_idx`(`deletedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `disputes` ADD CONSTRAINT `disputes_submissionId_fkey` FOREIGN KEY (`submissionId`) REFERENCES `task_submissions`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `disputes` ADD CONSTRAINT `disputes_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `disputes` ADD CONSTRAINT `disputes_resolvedBy_fkey` FOREIGN KEY (`resolvedBy`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
