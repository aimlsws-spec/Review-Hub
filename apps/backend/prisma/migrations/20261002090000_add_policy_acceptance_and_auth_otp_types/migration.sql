-- AlterTable
ALTER TABLE `otps` MODIFY `type` ENUM('REGISTRATION', 'PASSWORD_RESET', 'TWO_FACTOR', 'EMAIL_VERIFICATION', 'PHONE_VERIFICATION', 'NEW_DEVICE_LOGIN', 'PHONE_CHANGE') NOT NULL;

-- CreateTable
CREATE TABLE `policy_acceptances` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `policy` ENUM('TERMS_OF_SERVICE', 'PRIVACY_POLICY', 'REWARD_POLICY') NOT NULL,
    `version` VARCHAR(32) NOT NULL,
    `acceptedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `ipAddress` VARCHAR(64) NULL,
    `userAgent` VARCHAR(512) NULL,

    INDEX `policy_acceptances_userId_idx`(`userId`),
    UNIQUE INDEX `policy_acceptances_userId_policy_version_key`(`userId`, `policy`, `version`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `policy_acceptances` ADD CONSTRAINT `policy_acceptances_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
