-- CreateTable
CREATE TABLE `user_kyc_documents` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `documentType` ENUM('PAN', 'AADHAAR', 'PASSPORT', 'DRIVING_LICENCE', 'SELFIE') NOT NULL,
    `fileUploadId` VARCHAR(191) NULL,
    `documentNumber` VARCHAR(191) NULL,
    `verificationStatus` ENUM('PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'EXPIRED') NOT NULL DEFAULT 'PENDING',
    `verifiedBy` VARCHAR(191) NULL,
    `verifiedAt` DATETIME(3) NULL,
    `rejectionReason` TEXT NULL,
    `expiresAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    INDEX `user_kyc_documents_userId_idx`(`userId`),
    INDEX `user_kyc_documents_documentType_idx`(`documentType`),
    INDEX `user_kyc_documents_verificationStatus_idx`(`verificationStatus`),
    INDEX `user_kyc_documents_deletedAt_idx`(`deletedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `user_kyc_documents` ADD CONSTRAINT `user_kyc_documents_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
