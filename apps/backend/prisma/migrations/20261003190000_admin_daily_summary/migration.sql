-- The daily admin summary: yesterday's figures and a short text, one row per IST day.

-- CreateTable
CREATE TABLE `admin_daily_summaries` (
    `id` VARCHAR(191) NOT NULL,
    `day` VARCHAR(10) NOT NULL,
    `text` TEXT NOT NULL,
    `figures` JSON NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `admin_daily_summaries_day_key`(`day`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
