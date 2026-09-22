-- AlterTable
ALTER TABLE `withdrawal_requests` ADD COLUMN `tdsAmount` DECIMAL(12, 2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE `platform_configuration` ADD COLUMN `tdsAnnualThreshold` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    ADD COLUMN `tdsRate` DECIMAL(5, 4) NOT NULL DEFAULT 0,
    ADD COLUMN `tdsSection` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `invoice_notes` (
    `id` VARCHAR(191) NOT NULL,
    `noteNumber` VARCHAR(191) NOT NULL,
    `type` ENUM('CREDIT', 'DEBIT') NOT NULL,
    `invoiceId` VARCHAR(191) NOT NULL,
    `merchantId` VARCHAR(191) NOT NULL,
    `reason` VARCHAR(500) NOT NULL,
    `platformGstNumber` VARCHAR(191) NULL,
    `merchantGstNumber` VARCHAR(191) NULL,
    `taxableAmount` DECIMAL(12, 2) NOT NULL,
    `gstRate` DECIMAL(5, 2) NOT NULL,
    `gstAmount` DECIMAL(12, 2) NOT NULL,
    `totalAmount` DECIMAL(12, 2) NOT NULL,
    `pdfPath` VARCHAR(191) NULL,
    `issuedBy` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `invoice_notes_noteNumber_key`(`noteNumber`),
    INDEX `invoice_notes_invoiceId_idx`(`invoiceId`),
    INDEX `invoice_notes_merchantId_idx`(`merchantId`),
    INDEX `invoice_notes_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tds_deductions` (
    `id` VARCHAR(191) NOT NULL,
    `withdrawalId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `financialYear` VARCHAR(191) NOT NULL,
    `panNumber` VARCHAR(191) NULL,
    `section` VARCHAR(191) NOT NULL,
    `grossAmount` DECIMAL(12, 2) NOT NULL,
    `rate` DECIMAL(5, 4) NOT NULL,
    `tdsAmount` DECIMAL(12, 2) NOT NULL,
    `netAmount` DECIMAL(12, 2) NOT NULL,
    `status` ENUM('DEDUCTED', 'REVERSED') NOT NULL DEFAULT 'DEDUCTED',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `reversedAt` DATETIME(3) NULL,

    UNIQUE INDEX `tds_deductions_withdrawalId_key`(`withdrawalId`),
    INDEX `tds_deductions_userId_idx`(`userId`),
    INDEX `tds_deductions_financialYear_status_idx`(`financialYear`, `status`),
    INDEX `tds_deductions_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `invoice_notes` ADD CONSTRAINT `invoice_notes_invoiceId_fkey` FOREIGN KEY (`invoiceId`) REFERENCES `invoices`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tds_deductions` ADD CONSTRAINT `tds_deductions_withdrawalId_fkey` FOREIGN KEY (`withdrawalId`) REFERENCES `withdrawal_requests`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

