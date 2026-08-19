-- CreateTable
CREATE TABLE `reviews` (
    `id` VARCHAR(191) NOT NULL,
    `merchantId` VARCHAR(191) NOT NULL,
    `customerName` VARCHAR(191) NOT NULL,
    `customerEmail` VARCHAR(191) NULL,
    `source` ENUM('GOOGLE', 'FACEBOOK', 'ZOMATO', 'SWIGGY', 'TRIPADVISOR', 'WEBSITE', 'OTHER') NOT NULL,
    `rating` INTEGER NOT NULL,
    `title` VARCHAR(191) NULL,
    `body` TEXT NOT NULL,
    `status` ENUM('PENDING', 'REPLIED', 'FLAGGED', 'RESOLVED') NOT NULL DEFAULT 'PENDING',
    `reply` TEXT NULL,
    `repliedAt` DATETIME(3) NULL,
    `repliedBy` VARCHAR(191) NULL,
    `reviewedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    INDEX `reviews_merchantId_idx`(`merchantId`),
    INDEX `reviews_status_idx`(`status`),
    INDEX `reviews_source_idx`(`source`),
    INDEX `reviews_rating_idx`(`rating`),
    INDEX `reviews_customerEmail_idx`(`customerEmail`),
    INDEX `reviews_deletedAt_idx`(`deletedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `reviews` ADD CONSTRAINT `reviews_merchantId_fkey` FOREIGN KEY (`merchantId`) REFERENCES `merchants`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
