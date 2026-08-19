-- CreateTable
CREATE TABLE `users` (
    `id` VARCHAR(191) NOT NULL,
    `firstName` VARCHAR(191) NOT NULL,
    `lastName` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NULL,
    `passwordHash` VARCHAR(191) NULL,
    `avatarUrl` VARCHAR(191) NULL,
    `status` ENUM('ACTIVE', 'SUSPENDED', 'BANNED', 'PENDING_VERIFICATION', 'DEACTIVATED') NOT NULL DEFAULT 'PENDING_VERIFICATION',
    `emailVerifiedAt` DATETIME(3) NULL,
    `phoneVerifiedAt` DATETIME(3) NULL,
    `lastLoginAt` DATETIME(3) NULL,
    `lastLoginIp` VARCHAR(191) NULL,
    `timezone` VARCHAR(191) NULL DEFAULT 'UTC',
    `language` VARCHAR(191) NULL DEFAULT 'en',
    `referralCode` VARCHAR(191) NOT NULL,
    `referredById` VARCHAR(191) NULL,
    `isTwoFactorEnabled` BOOLEAN NOT NULL DEFAULT false,
    `failedLoginAttempts` INTEGER NOT NULL DEFAULT 0,
    `lockedUntil` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    UNIQUE INDEX `users_email_key`(`email`),
    UNIQUE INDEX `users_phone_key`(`phone`),
    UNIQUE INDEX `users_referralCode_key`(`referralCode`),
    INDEX `users_email_idx`(`email`),
    INDEX `users_phone_idx`(`phone`),
    INDEX `users_status_idx`(`status`),
    INDEX `users_referralCode_idx`(`referralCode`),
    INDEX `users_deletedAt_idx`(`deletedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `roles` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `isSystem` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    UNIQUE INDEX `roles_name_key`(`name`),
    UNIQUE INDEX `roles_slug_key`(`slug`),
    INDEX `roles_slug_idx`(`slug`),
    INDEX `roles_deletedAt_idx`(`deletedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `permissions` (
    `id` VARCHAR(191) NOT NULL,
    `module` VARCHAR(191) NOT NULL,
    `action` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `permissions_name_key`(`name`),
    UNIQUE INDEX `permissions_slug_key`(`slug`),
    INDEX `permissions_module_idx`(`module`),
    INDEX `permissions_slug_idx`(`slug`),
    UNIQUE INDEX `permissions_module_action_key`(`module`, `action`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_roles` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `roleId` VARCHAR(191) NOT NULL,
    `assignedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `assignedBy` VARCHAR(191) NULL,

    INDEX `user_roles_userId_idx`(`userId`),
    INDEX `user_roles_roleId_idx`(`roleId`),
    UNIQUE INDEX `user_roles_userId_roleId_key`(`userId`, `roleId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `role_permissions` (
    `id` VARCHAR(191) NOT NULL,
    `roleId` VARCHAR(191) NOT NULL,
    `permissionId` VARCHAR(191) NOT NULL,
    `assignedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `role_permissions_roleId_idx`(`roleId`),
    INDEX `role_permissions_permissionId_idx`(`permissionId`),
    UNIQUE INDEX `role_permissions_roleId_permissionId_key`(`roleId`, `permissionId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_sessions` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `refreshTokenHash` VARCHAR(191) NOT NULL,
    `ipAddress` VARCHAR(191) NULL,
    `deviceId` VARCHAR(191) NULL,
    `userAgent` TEXT NULL,
    `status` ENUM('ACTIVE', 'EXPIRED', 'REVOKED') NOT NULL DEFAULT 'ACTIVE',
    `expiresAt` DATETIME(3) NOT NULL,
    `revokedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `user_sessions_userId_idx`(`userId`),
    INDEX `user_sessions_refreshTokenHash_idx`(`refreshTokenHash`),
    INDEX `user_sessions_status_idx`(`status`),
    INDEX `user_sessions_expiresAt_idx`(`expiresAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `otps` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `type` ENUM('REGISTRATION', 'PASSWORD_RESET', 'TWO_FACTOR', 'EMAIL_VERIFICATION', 'PHONE_VERIFICATION') NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `status` ENUM('PENDING', 'VERIFIED', 'EXPIRED', 'EXHAUSTED') NOT NULL DEFAULT 'PENDING',
    `attempts` INTEGER NOT NULL DEFAULT 0,
    `maxAttempts` INTEGER NOT NULL DEFAULT 5,
    `expiresAt` DATETIME(3) NOT NULL,
    `verifiedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `otps_userId_type_status_idx`(`userId`, `type`, `status`),
    INDEX `otps_expiresAt_idx`(`expiresAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `devices` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NULL,
    `platform` ENUM('ANDROID', 'IOS', 'WEB') NOT NULL,
    `os` VARCHAR(191) NULL,
    `appVersion` VARCHAR(191) NULL,
    `pushToken` VARCHAR(191) NULL,
    `fingerprint` VARCHAR(191) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `lastSeenAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `devices_pushToken_key`(`pushToken`),
    INDEX `devices_userId_idx`(`userId`),
    INDEX `devices_fingerprint_idx`(`fingerprint`),
    UNIQUE INDEX `devices_userId_fingerprint_key`(`userId`, `fingerprint`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `login_history` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `deviceId` VARCHAR(191) NULL,
    `ipAddress` VARCHAR(191) NULL,
    `browser` VARCHAR(191) NULL,
    `location` VARCHAR(191) NULL,
    `isSuccess` BOOLEAN NOT NULL DEFAULT true,
    `failureReason` VARCHAR(191) NULL,
    `loginAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `logoutAt` DATETIME(3) NULL,

    INDEX `login_history_userId_idx`(`userId`),
    INDEX `login_history_loginAt_idx`(`loginAt`),
    INDEX `login_history_isSuccess_idx`(`isSuccess`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `countries` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `dialCode` VARCHAR(191) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,

    UNIQUE INDEX `countries_name_key`(`name`),
    UNIQUE INDEX `countries_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `states` (
    `id` VARCHAR(191) NOT NULL,
    `countryId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,

    INDEX `states_countryId_idx`(`countryId`),
    UNIQUE INDEX `states_countryId_name_key`(`countryId`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `cities` (
    `id` VARCHAR(191) NOT NULL,
    `stateId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,

    INDEX `cities_stateId_idx`(`stateId`),
    UNIQUE INDEX `cities_stateId_name_key`(`stateId`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `merchants` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `businessName` VARCHAR(191) NOT NULL,
    `legalBusinessName` VARCHAR(191) NULL,
    `businessType` VARCHAR(191) NULL,
    `businessCategory` VARCHAR(191) NULL,
    `gstNumber` VARCHAR(191) NULL,
    `panNumber` VARCHAR(191) NULL,
    `registrationNumber` VARCHAR(191) NULL,
    `website` VARCHAR(191) NULL,
    `email` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NOT NULL,
    `addressLine1` VARCHAR(191) NULL,
    `addressLine2` VARCHAR(191) NULL,
    `countryId` VARCHAR(191) NULL,
    `stateId` VARCHAR(191) NULL,
    `cityId` VARCHAR(191) NULL,
    `postalCode` VARCHAR(191) NULL,
    `logoUrl` VARCHAR(191) NULL,
    `description` TEXT NULL,
    `verificationStatus` ENUM('NOT_SUBMITTED', 'PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'REQUIRES_RESUBMISSION') NOT NULL DEFAULT 'NOT_SUBMITTED',
    `status` ENUM('PENDING_VERIFICATION', 'ACTIVE', 'SUSPENDED', 'REJECTED', 'DEACTIVATED') NOT NULL DEFAULT 'PENDING_VERIFICATION',
    `creditBalance` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `commissionRate` DECIMAL(5, 4) NOT NULL DEFAULT 0,
    `kycCompletedAt` DATETIME(3) NULL,
    `verifiedAt` DATETIME(3) NULL,
    `verifiedBy` VARCHAR(191) NULL,
    `rejectedReason` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    UNIQUE INDEX `merchants_userId_key`(`userId`),
    UNIQUE INDEX `merchants_gstNumber_key`(`gstNumber`),
    UNIQUE INDEX `merchants_panNumber_key`(`panNumber`),
    UNIQUE INDEX `merchants_email_key`(`email`),
    UNIQUE INDEX `merchants_phone_key`(`phone`),
    INDEX `merchants_businessName_idx`(`businessName`),
    INDEX `merchants_email_idx`(`email`),
    INDEX `merchants_phone_idx`(`phone`),
    INDEX `merchants_gstNumber_idx`(`gstNumber`),
    INDEX `merchants_panNumber_idx`(`panNumber`),
    INDEX `merchants_verificationStatus_idx`(`verificationStatus`),
    INDEX `merchants_status_idx`(`status`),
    INDEX `merchants_countryId_idx`(`countryId`),
    INDEX `merchants_stateId_idx`(`stateId`),
    INDEX `merchants_cityId_idx`(`cityId`),
    INDEX `merchants_deletedAt_idx`(`deletedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `merchant_documents` (
    `id` VARCHAR(191) NOT NULL,
    `merchantId` VARCHAR(191) NOT NULL,
    `documentType` ENUM('PAN', 'GST', 'BUSINESS_REGISTRATION', 'ADDRESS_PROOF', 'CANCELLED_CHEQUE', 'BANK_PROOF', 'IDENTITY_PROOF') NOT NULL,
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

    INDEX `merchant_documents_merchantId_idx`(`merchantId`),
    INDEX `merchant_documents_documentType_idx`(`documentType`),
    INDEX `merchant_documents_verificationStatus_idx`(`verificationStatus`),
    INDEX `merchant_documents_deletedAt_idx`(`deletedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `merchant_bank_accounts` (
    `id` VARCHAR(191) NOT NULL,
    `merchantId` VARCHAR(191) NOT NULL,
    `bankName` VARCHAR(191) NOT NULL,
    `accountHolderName` VARCHAR(191) NOT NULL,
    `accountNumber` VARCHAR(191) NOT NULL,
    `ifscCode` VARCHAR(191) NOT NULL,
    `branch` VARCHAR(191) NULL,
    `upiId` VARCHAR(191) NULL,
    `isPrimary` BOOLEAN NOT NULL DEFAULT false,
    `verificationStatus` ENUM('PENDING', 'VERIFIED', 'FAILED') NOT NULL DEFAULT 'PENDING',
    `verifiedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    INDEX `merchant_bank_accounts_merchantId_idx`(`merchantId`),
    INDEX `merchant_bank_accounts_verificationStatus_idx`(`verificationStatus`),
    INDEX `merchant_bank_accounts_deletedAt_idx`(`deletedAt`),
    UNIQUE INDEX `merchant_bank_accounts_merchantId_accountNumber_ifscCode_key`(`merchantId`, `accountNumber`, `ifscCode`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `merchant_team` (
    `id` VARCHAR(191) NOT NULL,
    `merchantId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `role` ENUM('OWNER', 'ADMIN', 'MANAGER', 'ANALYST', 'VIEWER') NOT NULL DEFAULT 'VIEWER',
    `permissions` JSON NULL,
    `status` ENUM('ACTIVE', 'SUSPENDED', 'REMOVED') NOT NULL DEFAULT 'ACTIVE',
    `invitedBy` VARCHAR(191) NULL,
    `joinedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    INDEX `merchant_team_merchantId_idx`(`merchantId`),
    INDEX `merchant_team_userId_idx`(`userId`),
    INDEX `merchant_team_status_idx`(`status`),
    INDEX `merchant_team_deletedAt_idx`(`deletedAt`),
    UNIQUE INDEX `merchant_team_merchantId_userId_key`(`merchantId`, `userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `merchant_invitations` (
    `id` VARCHAR(191) NOT NULL,
    `merchantId` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `role` ENUM('OWNER', 'ADMIN', 'MANAGER', 'ANALYST', 'VIEWER') NOT NULL DEFAULT 'VIEWER',
    `inviteToken` VARCHAR(191) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `acceptedAt` DATETIME(3) NULL,
    `status` ENUM('PENDING', 'ACCEPTED', 'EXPIRED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    `invitedBy` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    UNIQUE INDEX `merchant_invitations_inviteToken_key`(`inviteToken`),
    INDEX `merchant_invitations_merchantId_idx`(`merchantId`),
    INDEX `merchant_invitations_email_idx`(`email`),
    INDEX `merchant_invitations_inviteToken_idx`(`inviteToken`),
    INDEX `merchant_invitations_status_idx`(`status`),
    INDEX `merchant_invitations_expiresAt_idx`(`expiresAt`),
    INDEX `merchant_invitations_deletedAt_idx`(`deletedAt`),
    UNIQUE INDEX `merchant_invitations_merchantId_email_key`(`merchantId`, `email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `campaigns` (
    `id` VARCHAR(191) NOT NULL,
    `merchantId` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `shortDescription` VARCHAR(191) NULL,
    `description` TEXT NOT NULL,
    `thumbnailUrl` VARCHAR(191) NULL,
    `bannerUrl` VARCHAR(191) NULL,
    `campaignType` ENUM('SOCIAL_SHARE', 'SOCIAL_FOLLOW', 'REVIEW', 'REFERRAL', 'APP_INSTALL', 'VIDEO_WATCH', 'WEBSITE_VISIT', 'SURVEY', 'CUSTOM') NOT NULL,
    `status` ENUM('DRAFT', 'PENDING_REVIEW', 'CHANGES_REQUESTED', 'APPROVED', 'SCHEDULED', 'ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED', 'REJECTED', 'EXPIRED') NOT NULL DEFAULT 'DRAFT',
    `visibility` ENUM('PUBLIC', 'PRIVATE', 'INVITE_ONLY') NOT NULL DEFAULT 'PUBLIC',
    `priority` ENUM('LOW', 'NORMAL', 'HIGH', 'FEATURED') NOT NULL DEFAULT 'NORMAL',
    `rewardType` ENUM('CASH', 'POINTS', 'COUPON', 'GIFT_CARD', 'PRODUCT', 'DISCOUNT') NOT NULL DEFAULT 'CASH',
    `rewardAmount` DECIMAL(12, 2) NOT NULL,
    `totalBudget` DECIMAL(12, 2) NOT NULL,
    `reservedBudget` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `spentBudget` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `remainingBudget` DECIMAL(12, 2) NOT NULL,
    `maxParticipants` INTEGER NULL,
    `currentParticipants` INTEGER NOT NULL DEFAULT 0,
    `minimumUserLevel` INTEGER NOT NULL DEFAULT 0,
    `minimumFollowers` INTEGER NOT NULL DEFAULT 0,
    `minimumAge` INTEGER NULL,
    `maximumAge` INTEGER NULL,
    `targetGender` ENUM('ALL', 'MALE', 'FEMALE', 'OTHER') NOT NULL DEFAULT 'ALL',
    `targetCountries` JSON NULL,
    `targetStates` JSON NULL,
    `targetCities` JSON NULL,
    `startAt` DATETIME(3) NULL,
    `endAt` DATETIME(3) NULL,
    `publishedAt` DATETIME(3) NULL,
    `approvedAt` DATETIME(3) NULL,
    `approvedBy` VARCHAR(191) NULL,
    `rejectedReason` TEXT NULL,
    `autoApprove` BOOLEAN NOT NULL DEFAULT false,
    `aiThreshold` DOUBLE NOT NULL DEFAULT 0.8,
    `featured` BOOLEAN NOT NULL DEFAULT false,
    `featuredUntil` DATETIME(3) NULL,
    `metadata` JSON NULL,
    `createdBy` VARCHAR(191) NOT NULL,
    `updatedBy` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    UNIQUE INDEX `campaigns_slug_key`(`slug`),
    INDEX `campaigns_merchantId_idx`(`merchantId`),
    INDEX `campaigns_status_idx`(`status`),
    INDEX `campaigns_campaignType_idx`(`campaignType`),
    INDEX `campaigns_visibility_idx`(`visibility`),
    INDEX `campaigns_featured_idx`(`featured`),
    INDEX `campaigns_startAt_idx`(`startAt`),
    INDEX `campaigns_endAt_idx`(`endAt`),
    INDEX `campaigns_approvedAt_idx`(`approvedAt`),
    INDEX `campaigns_createdAt_idx`(`createdAt`),
    INDEX `campaigns_deletedAt_idx`(`deletedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `campaign_tasks` (
    `id` VARCHAR(191) NOT NULL,
    `campaignId` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `instructions` TEXT NULL,
    `taskType` ENUM('SCREENSHOT', 'URL', 'VIDEO', 'TEXT', 'FILE_UPLOAD', 'CUSTOM', 'INSTAGRAM_FOLLOW', 'INSTAGRAM_LIKE', 'INSTAGRAM_COMMENT', 'INSTAGRAM_STORY_SHARE', 'FACEBOOK_SHARE', 'FACEBOOK_LIKE', 'GOOGLE_REVIEW', 'PLAY_STORE_REVIEW', 'APP_INSTALL', 'REFERRAL', 'SURVEY', 'WEBSITE_VISIT', 'WATCH_VIDEO', 'YOUTUBE_SUBSCRIBE', 'TWITTER_FOLLOW') NOT NULL,
    `verificationType` ENUM('AI', 'MANUAL', 'HYBRID') NOT NULL DEFAULT 'AI',
    `taskOrder` INTEGER NOT NULL DEFAULT 0,
    `rewardAmount` DECIMAL(12, 2) NULL,
    `required` BOOLEAN NOT NULL DEFAULT true,
    `minimumTimeSeconds` INTEGER NOT NULL DEFAULT 0,
    `proofRequired` BOOLEAN NOT NULL DEFAULT true,
    `proofType` ENUM('SCREENSHOT', 'VIDEO', 'URL', 'TEXT', 'METADATA') NULL,
    `configuration` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    INDEX `campaign_tasks_campaignId_idx`(`campaignId`),
    INDEX `campaign_tasks_taskOrder_idx`(`taskOrder`),
    INDEX `campaign_tasks_verificationType_idx`(`verificationType`),
    INDEX `campaign_tasks_deletedAt_idx`(`deletedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `campaign_media` (
    `id` VARCHAR(191) NOT NULL,
    `campaignId` VARCHAR(191) NOT NULL,
    `type` ENUM('IMAGE', 'VIDEO', 'BANNER', 'THUMBNAIL') NOT NULL,
    `url` VARCHAR(191) NOT NULL,
    `thumbnail` VARCHAR(191) NULL,
    `displayOrder` INTEGER NOT NULL DEFAULT 0,
    `metadata` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    INDEX `campaign_media_campaignId_idx`(`campaignId`),
    INDEX `campaign_media_displayOrder_idx`(`displayOrder`),
    INDEX `campaign_media_deletedAt_idx`(`deletedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `campaign_targets` (
    `id` VARCHAR(191) NOT NULL,
    `campaignId` VARCHAR(191) NOT NULL,
    `countryId` VARCHAR(191) NULL,
    `stateId` VARCHAR(191) NULL,
    `cityId` VARCHAR(191) NULL,
    `minimumAge` INTEGER NULL,
    `maximumAge` INTEGER NULL,
    `minimumFollowers` INTEGER NOT NULL DEFAULT 0,
    `minimumLevel` INTEGER NOT NULL DEFAULT 0,
    `gender` ENUM('ALL', 'MALE', 'FEMALE', 'OTHER') NOT NULL DEFAULT 'ALL',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    INDEX `campaign_targets_campaignId_idx`(`campaignId`),
    INDEX `campaign_targets_countryId_idx`(`countryId`),
    INDEX `campaign_targets_stateId_idx`(`stateId`),
    INDEX `campaign_targets_cityId_idx`(`cityId`),
    INDEX `campaign_targets_deletedAt_idx`(`deletedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `campaign_categories` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `icon` VARCHAR(191) NULL,
    `color` VARCHAR(191) NULL,
    `description` VARCHAR(191) NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    UNIQUE INDEX `campaign_categories_name_key`(`name`),
    UNIQUE INDEX `campaign_categories_slug_key`(`slug`),
    INDEX `campaign_categories_slug_idx`(`slug`),
    INDEX `campaign_categories_isActive_idx`(`isActive`),
    INDEX `campaign_categories_deletedAt_idx`(`deletedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `campaign_category_mappings` (
    `campaignId` VARCHAR(191) NOT NULL,
    `categoryId` VARCHAR(191) NOT NULL,
    `assignedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `campaign_category_mappings_campaignId_idx`(`campaignId`),
    INDEX `campaign_category_mappings_categoryId_idx`(`categoryId`),
    PRIMARY KEY (`campaignId`, `categoryId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `campaign_audits` (
    `id` VARCHAR(191) NOT NULL,
    `campaignId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `action` ENUM('CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'APPROVE', 'REJECT', 'VERIFY', 'EXPORT', 'STATUS_CHANGE', 'SUSPEND', 'BAN', 'RESTORE', 'CONFIG_CHANGE') NOT NULL,
    `oldData` JSON NULL,
    `newData` JSON NULL,
    `ipAddress` VARCHAR(191) NULL,
    `userAgent` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    INDEX `campaign_audits_campaignId_idx`(`campaignId`),
    INDEX `campaign_audits_userId_idx`(`userId`),
    INDEX `campaign_audits_createdAt_idx`(`createdAt`),
    INDEX `campaign_audits_deletedAt_idx`(`deletedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `campaign_tags` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `campaign_tags_name_key`(`name`),
    UNIQUE INDEX `campaign_tags_slug_key`(`slug`),
    INDEX `campaign_tags_slug_idx`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `campaign_tag_map` (
    `campaignId` VARCHAR(191) NOT NULL,
    `tagId` VARCHAR(191) NOT NULL,
    `assignedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `campaign_tag_map_campaignId_idx`(`campaignId`),
    INDEX `campaign_tag_map_tagId_idx`(`tagId`),
    PRIMARY KEY (`campaignId`, `tagId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `campaign_participants` (
    `id` VARCHAR(191) NOT NULL,
    `campaignId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `status` ENUM('JOINED', 'IN_PROGRESS', 'COMPLETED', 'REWARDED', 'DISQUALIFIED', 'ABANDONED') NOT NULL DEFAULT 'JOINED',
    `joinedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `completedAt` DATETIME(3) NULL,
    `rewardedAt` DATETIME(3) NULL,
    `rewardEarned` DECIMAL(12, 2) NULL,
    `progress` INTEGER NOT NULL DEFAULT 0,
    `tasksTotal` INTEGER NOT NULL DEFAULT 0,
    `tasksCompleted` INTEGER NOT NULL DEFAULT 0,
    `disqualifiedReason` TEXT NULL,
    `metadata` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    INDEX `campaign_participants_campaignId_idx`(`campaignId`),
    INDEX `campaign_participants_userId_idx`(`userId`),
    INDEX `campaign_participants_status_idx`(`status`),
    INDEX `campaign_participants_joinedAt_idx`(`joinedAt`),
    INDEX `campaign_participants_deletedAt_idx`(`deletedAt`),
    UNIQUE INDEX `campaign_participants_campaignId_userId_key`(`campaignId`, `userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `campaign_analytics` (
    `id` VARCHAR(191) NOT NULL,
    `campaignId` VARCHAR(191) NOT NULL,
    `views` INTEGER NOT NULL DEFAULT 0,
    `uniqueViews` INTEGER NOT NULL DEFAULT 0,
    `joins` INTEGER NOT NULL DEFAULT 0,
    `completions` INTEGER NOT NULL DEFAULT 0,
    `rejections` INTEGER NOT NULL DEFAULT 0,
    `completionRate` DECIMAL(5, 4) NOT NULL DEFAULT 0,
    `conversionRate` DECIMAL(5, 4) NOT NULL DEFAULT 0,
    `budgetUsed` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `rewardPaid` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `avgCompletionSec` INTEGER NOT NULL DEFAULT 0,
    `lastActivityAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    UNIQUE INDEX `campaign_analytics_campaignId_key`(`campaignId`),
    INDEX `campaign_analytics_campaignId_idx`(`campaignId`),
    INDEX `campaign_analytics_deletedAt_idx`(`deletedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `campaign_approvals` (
    `id` VARCHAR(191) NOT NULL,
    `campaignId` VARCHAR(191) NOT NULL,
    `reviewerId` VARCHAR(191) NOT NULL,
    `status` ENUM('PENDING', 'APPROVED', 'REJECTED', 'CHANGES_REQUESTED') NOT NULL,
    `comments` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    INDEX `campaign_approvals_campaignId_idx`(`campaignId`),
    INDEX `campaign_approvals_reviewerId_idx`(`reviewerId`),
    INDEX `campaign_approvals_status_idx`(`status`),
    INDEX `campaign_approvals_deletedAt_idx`(`deletedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `task_submissions` (
    `id` VARCHAR(191) NOT NULL,
    `participantId` VARCHAR(191) NOT NULL,
    `taskId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `status` ENUM('PENDING', 'AI_PROCESSING', 'PENDING_MANUAL', 'APPROVED', 'REJECTED', 'RESUBMITTED', 'EXPIRED') NOT NULL DEFAULT 'PENDING',
    `verificationSource` ENUM('AI', 'MANUAL', 'HYBRID') NOT NULL DEFAULT 'AI',
    `attemptNumber` INTEGER NOT NULL DEFAULT 1,
    `fileUrl` VARCHAR(191) NULL,
    `externalUrl` VARCHAR(191) NULL,
    `textAnswer` TEXT NULL,
    `aiConfidence` DOUBLE NULL,
    `rejectionReason` TEXT NULL,
    `reviewerId` VARCHAR(191) NULL,
    `reviewedAt` DATETIME(3) NULL,
    `rewardAmount` DECIMAL(12, 2) NULL,
    `rewardCreditedAt` DATETIME(3) NULL,
    `metadata` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    INDEX `task_submissions_userId_idx`(`userId`),
    INDEX `task_submissions_taskId_idx`(`taskId`),
    INDEX `task_submissions_participantId_idx`(`participantId`),
    INDEX `task_submissions_status_idx`(`status`),
    INDEX `task_submissions_reviewerId_idx`(`reviewerId`),
    INDEX `task_submissions_createdAt_idx`(`createdAt`),
    INDEX `task_submissions_deletedAt_idx`(`deletedAt`),
    UNIQUE INDEX `task_submissions_participantId_taskId_attemptNumber_key`(`participantId`, `taskId`, `attemptNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `submission_attachments` (
    `id` VARCHAR(191) NOT NULL,
    `submissionId` VARCHAR(191) NOT NULL,
    `fileName` VARCHAR(191) NOT NULL,
    `mimeType` VARCHAR(191) NOT NULL,
    `fileSize` INTEGER NOT NULL,
    `storagePath` VARCHAR(191) NOT NULL,
    `checksum` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `submission_attachments_submissionId_idx`(`submissionId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ai_verification_jobs` (
    `id` VARCHAR(191) NOT NULL,
    `submissionId` VARCHAR(191) NOT NULL,
    `status` ENUM('QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED', 'RETRYING') NOT NULL DEFAULT 'QUEUED',
    `engine` VARCHAR(191) NULL,
    `model` VARCHAR(191) NULL,
    `startedAt` DATETIME(3) NULL,
    `completedAt` DATETIME(3) NULL,
    `retries` INTEGER NOT NULL DEFAULT 0,
    `processingTimeMs` INTEGER NULL,
    `rawResponse` JSON NULL,
    `errorMessage` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ai_verification_jobs_submissionId_key`(`submissionId`),
    INDEX `ai_verification_jobs_status_idx`(`status`),
    INDEX `ai_verification_jobs_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ai_audit_logs` (
    `id` VARCHAR(191) NOT NULL,
    `jobId` VARCHAR(191) NOT NULL,
    `confidence` DOUBLE NOT NULL,
    `fraudScore` DOUBLE NOT NULL DEFAULT 0,
    `decision` VARCHAR(191) NOT NULL,
    `explanation` TEXT NULL,
    `metadata` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `ai_audit_logs_jobId_key`(`jobId`),
    INDEX `ai_audit_logs_decision_idx`(`decision`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `submission_fraud_flags` (
    `id` VARCHAR(191) NOT NULL,
    `submissionId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `riskLevel` ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL') NOT NULL,
    `reason` TEXT NOT NULL,
    `resolved` BOOLEAN NOT NULL DEFAULT false,
    `resolvedBy` VARCHAR(191) NULL,
    `resolvedAt` DATETIME(3) NULL,
    `metadata` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `submission_fraud_flags_submissionId_idx`(`submissionId`),
    INDEX `submission_fraud_flags_userId_idx`(`userId`),
    INDEX `submission_fraud_flags_riskLevel_idx`(`riskLevel`),
    INDEX `submission_fraud_flags_resolved_idx`(`resolved`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_wallets` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `availableBalance` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `pendingBalance` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `lockedBalance` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `lifetimeEarnings` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `totalWithdrawn` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `user_wallets_userId_key`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `merchant_wallets` (
    `id` VARCHAR(191) NOT NULL,
    `merchantId` VARCHAR(191) NOT NULL,
    `availableBalance` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `reservedBalance` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `totalTopUp` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `totalSpent` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `merchant_wallets_merchantId_key`(`merchantId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `wallet_transactions` (
    `id` VARCHAR(191) NOT NULL,
    `walletId` VARCHAR(191) NULL,
    `merchantWalletId` VARCHAR(191) NULL,
    `type` ENUM('CREDIT', 'DEBIT', 'HOLD', 'RELEASE', 'REFUND', 'WITHDRAWAL', 'BONUS', 'REFERRAL') NOT NULL,
    `status` ENUM('PENDING', 'SUCCESS', 'FAILED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    `amount` DECIMAL(12, 2) NOT NULL,
    `balanceBefore` DECIMAL(12, 2) NOT NULL,
    `balanceAfter` DECIMAL(12, 2) NOT NULL,
    `referenceType` VARCHAR(191) NULL,
    `referenceId` VARCHAR(191) NULL,
    `remarks` TEXT NULL,
    `metadata` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `wallet_transactions_walletId_idx`(`walletId`),
    INDEX `wallet_transactions_merchantWalletId_idx`(`merchantWalletId`),
    INDEX `wallet_transactions_type_idx`(`type`),
    INDEX `wallet_transactions_status_idx`(`status`),
    INDEX `wallet_transactions_referenceType_referenceId_idx`(`referenceType`, `referenceId`),
    INDEX `wallet_transactions_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `rewards` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `campaignId` VARCHAR(191) NOT NULL,
    `submissionId` VARCHAR(191) NOT NULL,
    `rewardType` ENUM('CASH', 'POINTS', 'COUPON', 'GIFT_CARD', 'PRODUCT', 'DISCOUNT') NOT NULL,
    `amount` DECIMAL(12, 2) NOT NULL,
    `status` ENUM('PENDING', 'APPROVED', 'CREDITED', 'FAILED', 'CANCELLED', 'EXPIRED') NOT NULL DEFAULT 'PENDING',
    `approvedAt` DATETIME(3) NULL,
    `creditedAt` DATETIME(3) NULL,
    `failedReason` TEXT NULL,
    `expiresAt` DATETIME(3) NULL,
    `metadata` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    UNIQUE INDEX `rewards_submissionId_key`(`submissionId`),
    INDEX `rewards_userId_idx`(`userId`),
    INDEX `rewards_campaignId_idx`(`campaignId`),
    INDEX `rewards_status_idx`(`status`),
    INDEX `rewards_creditedAt_idx`(`creditedAt`),
    INDEX `rewards_deletedAt_idx`(`deletedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `withdrawal_requests` (
    `id` VARCHAR(191) NOT NULL,
    `walletId` VARCHAR(191) NOT NULL,
    `bankAccountId` VARCHAR(191) NULL,
    `amount` DECIMAL(12, 2) NOT NULL,
    `processingFee` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `finalAmount` DECIMAL(12, 2) NOT NULL,
    `status` ENUM('PENDING', 'UNDER_REVIEW', 'APPROVED', 'PROCESSING', 'PAID', 'FAILED', 'REJECTED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    `rejectionReason` TEXT NULL,
    `processedBy` VARCHAR(191) NULL,
    `processedAt` DATETIME(3) NULL,
    `metadata` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    INDEX `withdrawal_requests_walletId_idx`(`walletId`),
    INDEX `withdrawal_requests_status_idx`(`status`),
    INDEX `withdrawal_requests_processedBy_idx`(`processedBy`),
    INDEX `withdrawal_requests_createdAt_idx`(`createdAt`),
    INDEX `withdrawal_requests_deletedAt_idx`(`deletedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `withdrawal_logs` (
    `id` VARCHAR(191) NOT NULL,
    `withdrawalId` VARCHAR(191) NOT NULL,
    `oldStatus` ENUM('PENDING', 'UNDER_REVIEW', 'APPROVED', 'PROCESSING', 'PAID', 'FAILED', 'REJECTED', 'CANCELLED') NOT NULL,
    `newStatus` ENUM('PENDING', 'UNDER_REVIEW', 'APPROVED', 'PROCESSING', 'PAID', 'FAILED', 'REJECTED', 'CANCELLED') NOT NULL,
    `remarks` TEXT NULL,
    `changedBy` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `withdrawal_logs_withdrawalId_idx`(`withdrawalId`),
    INDEX `withdrawal_logs_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_bank_accounts` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `bankName` VARCHAR(191) NOT NULL,
    `accountHolderName` VARCHAR(191) NOT NULL,
    `accountNumber` VARCHAR(191) NOT NULL,
    `ifscCode` VARCHAR(191) NOT NULL,
    `branch` VARCHAR(191) NULL,
    `upiId` VARCHAR(191) NULL,
    `isPrimary` BOOLEAN NOT NULL DEFAULT false,
    `verificationStatus` ENUM('PENDING', 'VERIFIED', 'FAILED') NOT NULL DEFAULT 'PENDING',
    `verifiedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    INDEX `user_bank_accounts_userId_idx`(`userId`),
    INDEX `user_bank_accounts_verificationStatus_idx`(`verificationStatus`),
    INDEX `user_bank_accounts_deletedAt_idx`(`deletedAt`),
    UNIQUE INDEX `user_bank_accounts_userId_accountNumber_ifscCode_key`(`userId`, `accountNumber`, `ifscCode`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `notifications` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `templateId` VARCHAR(191) NULL,
    `title` VARCHAR(191) NOT NULL,
    `message` TEXT NOT NULL,
    `type` ENUM('SYSTEM', 'CAMPAIGN', 'REWARD', 'WITHDRAWAL', 'REFERRAL', 'SUPPORT', 'SECURITY', 'PROMOTIONAL') NOT NULL,
    `channel` ENUM('PUSH', 'EMAIL', 'SMS', 'IN_APP') NOT NULL,
    `status` ENUM('QUEUED', 'SENT', 'DELIVERED', 'READ', 'FAILED') NOT NULL DEFAULT 'QUEUED',
    `data` JSON NULL,
    `scheduledAt` DATETIME(3) NULL,
    `sentAt` DATETIME(3) NULL,
    `deliveredAt` DATETIME(3) NULL,
    `readAt` DATETIME(3) NULL,
    `failedReason` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    INDEX `notifications_userId_idx`(`userId`),
    INDEX `notifications_status_idx`(`status`),
    INDEX `notifications_type_idx`(`type`),
    INDEX `notifications_channel_idx`(`channel`),
    INDEX `notifications_scheduledAt_idx`(`scheduledAt`),
    INDEX `notifications_createdAt_idx`(`createdAt`),
    INDEX `notifications_deletedAt_idx`(`deletedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `notification_templates` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `subject` VARCHAR(191) NULL,
    `title` VARCHAR(191) NOT NULL,
    `body` TEXT NOT NULL,
    `channel` ENUM('PUSH', 'EMAIL', 'SMS', 'IN_APP') NOT NULL,
    `variables` JSON NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    UNIQUE INDEX `notification_templates_slug_key`(`slug`),
    INDEX `notification_templates_slug_idx`(`slug`),
    INDEX `notification_templates_channel_idx`(`channel`),
    INDEX `notification_templates_isActive_idx`(`isActive`),
    INDEX `notification_templates_deletedAt_idx`(`deletedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `notification_preferences` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `emailEnabled` BOOLEAN NOT NULL DEFAULT true,
    `smsEnabled` BOOLEAN NOT NULL DEFAULT true,
    `pushEnabled` BOOLEAN NOT NULL DEFAULT true,
    `inAppEnabled` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    UNIQUE INDEX `notification_preferences_userId_key`(`userId`),
    INDEX `notification_preferences_userId_idx`(`userId`),
    INDEX `notification_preferences_deletedAt_idx`(`deletedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `referrals` (
    `id` VARCHAR(191) NOT NULL,
    `referrerId` VARCHAR(191) NOT NULL,
    `referredUserId` VARCHAR(191) NOT NULL,
    `referralCode` VARCHAR(191) NOT NULL,
    `rewardIssued` BOOLEAN NOT NULL DEFAULT false,
    `rewardAmount` DECIMAL(12, 2) NULL,
    `completedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    UNIQUE INDEX `referrals_referredUserId_key`(`referredUserId`),
    INDEX `referrals_referrerId_idx`(`referrerId`),
    INDEX `referrals_referralCode_idx`(`referralCode`),
    INDEX `referrals_rewardIssued_idx`(`rewardIssued`),
    INDEX `referrals_deletedAt_idx`(`deletedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `referral_rewards` (
    `id` VARCHAR(191) NOT NULL,
    `referralId` VARCHAR(191) NOT NULL,
    `walletTransactionId` VARCHAR(191) NULL,
    `amount` DECIMAL(12, 2) NOT NULL,
    `status` ENUM('PENDING', 'APPROVED', 'CREDITED', 'FAILED', 'CANCELLED', 'EXPIRED') NOT NULL DEFAULT 'PENDING',
    `creditedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `referral_rewards_walletTransactionId_key`(`walletTransactionId`),
    INDEX `referral_rewards_referralId_idx`(`referralId`),
    INDEX `referral_rewards_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `support_tickets` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NULL,
    `merchantId` VARCHAR(191) NULL,
    `assignedToId` VARCHAR(191) NULL,
    `subject` VARCHAR(191) NOT NULL,
    `description` TEXT NOT NULL,
    `category` ENUM('ACCOUNT', 'CAMPAIGN', 'PAYMENT', 'WITHDRAWAL', 'REWARD', 'BUG', 'GENERAL') NOT NULL DEFAULT 'GENERAL',
    `priority` ENUM('LOW', 'MEDIUM', 'HIGH', 'URGENT') NOT NULL DEFAULT 'MEDIUM',
    `status` ENUM('OPEN', 'ASSIGNED', 'IN_PROGRESS', 'WAITING_USER', 'RESOLVED', 'CLOSED') NOT NULL DEFAULT 'OPEN',
    `resolvedAt` DATETIME(3) NULL,
    `closedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    INDEX `support_tickets_status_idx`(`status`),
    INDEX `support_tickets_priority_idx`(`priority`),
    INDEX `support_tickets_assignedToId_idx`(`assignedToId`),
    INDEX `support_tickets_userId_idx`(`userId`),
    INDEX `support_tickets_merchantId_idx`(`merchantId`),
    INDEX `support_tickets_category_idx`(`category`),
    INDEX `support_tickets_createdAt_idx`(`createdAt`),
    INDEX `support_tickets_deletedAt_idx`(`deletedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `support_messages` (
    `id` VARCHAR(191) NOT NULL,
    `ticketId` VARCHAR(191) NOT NULL,
    `senderId` VARCHAR(191) NOT NULL,
    `senderType` VARCHAR(191) NOT NULL,
    `message` TEXT NOT NULL,
    `attachments` JSON NULL,
    `internalNote` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `support_messages_ticketId_idx`(`ticketId`),
    INDEX `support_messages_senderId_idx`(`senderId`),
    INDEX `support_messages_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `fraud_flags` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `submissionId` VARCHAR(191) NULL,
    `type` ENUM('DUPLICATE_SUBMISSION', 'MANIPULATED_IMAGE', 'VPN_DETECTED', 'MULTIPLE_ACCOUNTS', 'REFERRAL_ABUSE', 'RAPID_SUBMISSIONS', 'SUSPICIOUS_DEVICE', 'BLACKLISTED_IP', 'AI_GENERATED') NOT NULL,
    `riskLevel` ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL') NOT NULL,
    `description` TEXT NULL,
    `metadata` JSON NULL,
    `resolved` BOOLEAN NOT NULL DEFAULT false,
    `resolvedById` VARCHAR(191) NULL,
    `resolvedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `fraud_flags_userId_idx`(`userId`),
    INDEX `fraud_flags_type_idx`(`type`),
    INDEX `fraud_flags_riskLevel_idx`(`riskLevel`),
    INDEX `fraud_flags_resolved_idx`(`resolved`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `admin_users` (
    `id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `passwordHash` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `role` ENUM('SUPER_ADMIN', 'PLATFORM_ADMIN', 'FINANCE_TEAM', 'SUPPORT_TEAM', 'FRAUD_TEAM', 'CONTENT_MODERATOR', 'CAMPAIGN_REVIEWER') NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `lastLoginAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    UNIQUE INDEX `admin_users_email_key`(`email`),
    INDEX `admin_users_email_idx`(`email`),
    INDEX `admin_users_role_idx`(`role`),
    INDEX `admin_users_isActive_idx`(`isActive`),
    INDEX `admin_users_deletedAt_idx`(`deletedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `cms_pages` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `content` LONGTEXT NOT NULL,
    `metaTitle` VARCHAR(191) NULL,
    `metaDescription` TEXT NULL,
    `status` ENUM('DRAFT', 'PUBLISHED', 'ARCHIVED') NOT NULL DEFAULT 'DRAFT',
    `publishedAt` DATETIME(3) NULL,
    `createdBy` VARCHAR(191) NULL,
    `updatedBy` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    UNIQUE INDEX `cms_pages_slug_key`(`slug`),
    INDEX `cms_pages_slug_idx`(`slug`),
    INDEX `cms_pages_status_idx`(`status`),
    INDEX `cms_pages_deletedAt_idx`(`deletedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `faqs` (
    `id` VARCHAR(191) NOT NULL,
    `category` VARCHAR(191) NOT NULL,
    `question` TEXT NOT NULL,
    `answer` LONGTEXT NOT NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    INDEX `faqs_category_idx`(`category`),
    INDEX `faqs_isActive_idx`(`isActive`),
    INDEX `faqs_sortOrder_idx`(`sortOrder`),
    INDEX `faqs_deletedAt_idx`(`deletedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `uploaded_files` (
    `id` VARCHAR(191) NOT NULL,
    `uploadedBy` VARCHAR(191) NOT NULL,
    `fileName` VARCHAR(191) NOT NULL,
    `originalName` VARCHAR(191) NOT NULL,
    `mimeType` VARCHAR(191) NOT NULL,
    `fileType` ENUM('IMAGE', 'VIDEO', 'DOCUMENT', 'AUDIO', 'OTHER') NOT NULL DEFAULT 'OTHER',
    `extension` VARCHAR(191) NOT NULL,
    `size` INTEGER NOT NULL,
    `storageProvider` VARCHAR(191) NOT NULL DEFAULT 'local',
    `storagePath` VARCHAR(191) NOT NULL,
    `publicUrl` VARCHAR(191) NULL,
    `checksum` VARCHAR(191) NULL,
    `metadata` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    INDEX `uploaded_files_uploadedBy_idx`(`uploadedBy`),
    INDEX `uploaded_files_mimeType_idx`(`mimeType`),
    INDEX `uploaded_files_fileType_idx`(`fileType`),
    INDEX `uploaded_files_createdAt_idx`(`createdAt`),
    INDEX `uploaded_files_deletedAt_idx`(`deletedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `activity_logs` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `action` VARCHAR(191) NOT NULL,
    `module` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `ipAddress` VARCHAR(191) NULL,
    `device` VARCHAR(191) NULL,
    `metadata` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `activity_logs_userId_idx`(`userId`),
    INDEX `activity_logs_action_idx`(`action`),
    INDEX `activity_logs_module_idx`(`module`),
    INDEX `activity_logs_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `audit_logs` (
    `id` VARCHAR(191) NOT NULL,
    `actorId` VARCHAR(191) NOT NULL,
    `actorType` VARCHAR(191) NOT NULL,
    `entity` VARCHAR(191) NOT NULL,
    `entityId` VARCHAR(191) NULL,
    `action` ENUM('CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'APPROVE', 'REJECT', 'VERIFY', 'EXPORT', 'STATUS_CHANGE', 'SUSPEND', 'BAN', 'RESTORE', 'CONFIG_CHANGE') NOT NULL,
    `before` JSON NULL,
    `after` JSON NULL,
    `ipAddress` VARCHAR(191) NULL,
    `userAgent` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `audit_logs_actorId_idx`(`actorId`),
    INDEX `audit_logs_entity_entityId_idx`(`entity`, `entityId`),
    INDEX `audit_logs_action_idx`(`action`),
    INDEX `audit_logs_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `analytics_events` (
    `id` VARCHAR(191) NOT NULL,
    `eventName` VARCHAR(191) NOT NULL,
    `eventCategory` VARCHAR(191) NOT NULL,
    `entityType` VARCHAR(191) NULL,
    `entityId` VARCHAR(191) NULL,
    `userId` VARCHAR(191) NULL,
    `merchantId` VARCHAR(191) NULL,
    `campaignId` VARCHAR(191) NULL,
    `metadata` JSON NULL,
    `ipAddress` VARCHAR(191) NULL,
    `userAgent` TEXT NULL,
    `platform` VARCHAR(191) NULL,
    `device` VARCHAR(191) NULL,
    `country` VARCHAR(191) NULL,
    `state` VARCHAR(191) NULL,
    `city` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    INDEX `analytics_events_eventName_idx`(`eventName`),
    INDEX `analytics_events_createdAt_idx`(`createdAt`),
    INDEX `analytics_events_campaignId_idx`(`campaignId`),
    INDEX `analytics_events_merchantId_idx`(`merchantId`),
    INDEX `analytics_events_userId_idx`(`userId`),
    INDEX `analytics_events_deletedAt_idx`(`deletedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `daily_analytics` (
    `id` VARCHAR(191) NOT NULL,
    `date` DATE NOT NULL,
    `newUsers` INTEGER NOT NULL DEFAULT 0,
    `activeUsers` INTEGER NOT NULL DEFAULT 0,
    `campaignsCreated` INTEGER NOT NULL DEFAULT 0,
    `campaignsCompleted` INTEGER NOT NULL DEFAULT 0,
    `submissions` INTEGER NOT NULL DEFAULT 0,
    `rewardsPaid` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `withdrawals` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `revenue` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `platformCommission` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    UNIQUE INDEX `daily_analytics_date_key`(`date`),
    INDEX `daily_analytics_date_idx`(`date`),
    INDEX `daily_analytics_deletedAt_idx`(`deletedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `merchant_analytics` (
    `id` VARCHAR(191) NOT NULL,
    `merchantId` VARCHAR(191) NOT NULL,
    `totalCampaigns` INTEGER NOT NULL DEFAULT 0,
    `totalParticipants` INTEGER NOT NULL DEFAULT 0,
    `totalBudget` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `totalSpent` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `averageCompletionRate` DECIMAL(5, 4) NOT NULL DEFAULT 0,
    `totalRevenueGenerated` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    UNIQUE INDEX `merchant_analytics_merchantId_key`(`merchantId`),
    INDEX `merchant_analytics_merchantId_idx`(`merchantId`),
    INDEX `merchant_analytics_deletedAt_idx`(`deletedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_analytics` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `campaignsJoined` INTEGER NOT NULL DEFAULT 0,
    `campaignsCompleted` INTEGER NOT NULL DEFAULT 0,
    `rewardsEarned` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `referrals` INTEGER NOT NULL DEFAULT 0,
    `withdrawals` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `fraudFlags` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    UNIQUE INDEX `user_analytics_userId_key`(`userId`),
    INDEX `user_analytics_userId_idx`(`userId`),
    INDEX `user_analytics_deletedAt_idx`(`deletedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `reports` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `reportType` ENUM('USER_REPORT', 'CAMPAIGN_REPORT', 'FINANCIAL_REPORT', 'FRAUD_REPORT', 'MERCHANT_REPORT', 'PLATFORM_SUMMARY') NOT NULL,
    `generatedBy` VARCHAR(191) NOT NULL,
    `fileId` VARCHAR(191) NULL,
    `filters` JSON NULL,
    `status` ENUM('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED') NOT NULL DEFAULT 'PENDING',
    `startedAt` DATETIME(3) NULL,
    `completedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    INDEX `reports_reportType_idx`(`reportType`),
    INDEX `reports_generatedBy_idx`(`generatedBy`),
    INDEX `reports_status_idx`(`status`),
    INDEX `reports_createdAt_idx`(`createdAt`),
    INDEX `reports_deletedAt_idx`(`deletedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `report_schedules` (
    `id` VARCHAR(191) NOT NULL,
    `reportId` VARCHAR(191) NOT NULL,
    `frequency` ENUM('DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY') NOT NULL,
    `nextRun` DATETIME(3) NOT NULL,
    `recipients` JSON NOT NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    UNIQUE INDEX `report_schedules_reportId_key`(`reportId`),
    INDEX `report_schedules_reportId_idx`(`reportId`),
    INDEX `report_schedules_nextRun_idx`(`nextRun`),
    INDEX `report_schedules_active_idx`(`active`),
    INDEX `report_schedules_deletedAt_idx`(`deletedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `scheduled_jobs` (
    `id` VARCHAR(191) NOT NULL,
    `jobName` VARCHAR(191) NOT NULL,
    `jobType` ENUM('CAMPAIGN_EXPIRY', 'REWARD_PROCESSING', 'ANALYTICS_AGGREGATION', 'REPORT_GENERATION', 'NOTIFICATION_DISPATCH', 'FRAUD_SCAN', 'WALLET_RECONCILIATION', 'CLEANUP', 'CUSTOM') NOT NULL,
    `cronExpression` VARCHAR(191) NOT NULL,
    `enabled` BOOLEAN NOT NULL DEFAULT true,
    `lastRun` DATETIME(3) NULL,
    `nextRun` DATETIME(3) NULL,
    `retries` INTEGER NOT NULL DEFAULT 0,
    `configuration` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    UNIQUE INDEX `scheduled_jobs_jobName_key`(`jobName`),
    INDEX `scheduled_jobs_jobType_idx`(`jobType`),
    INDEX `scheduled_jobs_enabled_idx`(`enabled`),
    INDEX `scheduled_jobs_nextRun_idx`(`nextRun`),
    INDEX `scheduled_jobs_deletedAt_idx`(`deletedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `job_execution_logs` (
    `id` VARCHAR(191) NOT NULL,
    `jobId` VARCHAR(191) NOT NULL,
    `startedAt` DATETIME(3) NOT NULL,
    `completedAt` DATETIME(3) NULL,
    `duration` INTEGER NULL,
    `success` BOOLEAN NOT NULL DEFAULT false,
    `errorMessage` TEXT NULL,
    `logs` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    INDEX `job_execution_logs_jobId_idx`(`jobId`),
    INDEX `job_execution_logs_success_idx`(`success`),
    INDEX `job_execution_logs_startedAt_idx`(`startedAt`),
    INDEX `job_execution_logs_deletedAt_idx`(`deletedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ai_providers` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `provider` VARCHAR(191) NOT NULL,
    `apiEndpoint` VARCHAR(191) NULL,
    `model` VARCHAR(191) NULL,
    `enabled` BOOLEAN NOT NULL DEFAULT true,
    `priority` INTEGER NOT NULL DEFAULT 0,
    `timeout` INTEGER NOT NULL DEFAULT 30000,
    `configuration` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    UNIQUE INDEX `ai_providers_name_key`(`name`),
    INDEX `ai_providers_enabled_idx`(`enabled`),
    INDEX `ai_providers_priority_idx`(`priority`),
    INDEX `ai_providers_deletedAt_idx`(`deletedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ai_models` (
    `id` VARCHAR(191) NOT NULL,
    `providerId` VARCHAR(191) NOT NULL,
    `modelName` VARCHAR(191) NOT NULL,
    `version` VARCHAR(191) NULL,
    `maxTokens` INTEGER NOT NULL DEFAULT 4096,
    `temperature` DOUBLE NOT NULL DEFAULT 0.7,
    `enabled` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    INDEX `ai_models_providerId_idx`(`providerId`),
    INDEX `ai_models_enabled_idx`(`enabled`),
    INDEX `ai_models_deletedAt_idx`(`deletedAt`),
    UNIQUE INDEX `ai_models_providerId_modelName_version_key`(`providerId`, `modelName`, `version`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ai_prompt_templates` (
    `id` VARCHAR(191) NOT NULL,
    `providerId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `prompt` LONGTEXT NOT NULL,
    `version` VARCHAR(191) NOT NULL DEFAULT '1.0',
    `active` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    INDEX `ai_prompt_templates_providerId_idx`(`providerId`),
    INDEX `ai_prompt_templates_active_idx`(`active`),
    INDEX `ai_prompt_templates_deletedAt_idx`(`deletedAt`),
    UNIQUE INDEX `ai_prompt_templates_providerId_name_version_key`(`providerId`, `name`, `version`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ai_usage_logs` (
    `id` VARCHAR(191) NOT NULL,
    `providerId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NULL,
    `submissionId` VARCHAR(191) NULL,
    `tokens` INTEGER NOT NULL DEFAULT 0,
    `latency` INTEGER NOT NULL DEFAULT 0,
    `cost` DECIMAL(10, 6) NOT NULL DEFAULT 0,
    `responseStatus` ENUM('SUCCESS', 'FAILED', 'TIMEOUT', 'RATE_LIMITED') NOT NULL DEFAULT 'SUCCESS',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    INDEX `ai_usage_logs_providerId_idx`(`providerId`),
    INDEX `ai_usage_logs_createdAt_idx`(`createdAt`),
    INDEX `ai_usage_logs_userId_idx`(`userId`),
    INDEX `ai_usage_logs_submissionId_idx`(`submissionId`),
    INDEX `ai_usage_logs_deletedAt_idx`(`deletedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `system_settings` (
    `id` VARCHAR(191) NOT NULL,
    `key` VARCHAR(191) NOT NULL,
    `value` JSON NOT NULL,
    `dataType` ENUM('STRING', 'NUMBER', 'BOOLEAN', 'JSON', 'ARRAY') NOT NULL DEFAULT 'STRING',
    `category` VARCHAR(191) NULL,
    `description` TEXT NULL,
    `editable` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    UNIQUE INDEX `system_settings_key_key`(`key`),
    INDEX `system_settings_category_idx`(`category`),
    INDEX `system_settings_editable_idx`(`editable`),
    INDEX `system_settings_deletedAt_idx`(`deletedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `feature_flags` (
    `id` VARCHAR(191) NOT NULL,
    `key` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `enabled` BOOLEAN NOT NULL DEFAULT false,
    `rolloutPercentage` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    UNIQUE INDEX `feature_flags_key_key`(`key`),
    INDEX `feature_flags_enabled_idx`(`enabled`),
    INDEX `feature_flags_deletedAt_idx`(`deletedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `platform_configuration` (
    `id` VARCHAR(191) NOT NULL,
    `platformName` VARCHAR(191) NOT NULL DEFAULT 'ReviewHub',
    `supportEmail` VARCHAR(191) NULL,
    `supportPhone` VARCHAR(191) NULL,
    `commissionPercentage` DECIMAL(5, 4) NOT NULL DEFAULT 0,
    `minimumWithdrawal` DECIMAL(12, 2) NOT NULL DEFAULT 100,
    `maximumWithdrawal` DECIMAL(12, 2) NOT NULL DEFAULT 50000,
    `maintenanceMode` BOOLEAN NOT NULL DEFAULT false,
    `appVersion` VARCHAR(191) NOT NULL DEFAULT '1.0.0',
    `apiVersion` VARCHAR(191) NOT NULL DEFAULT 'v1',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    INDEX `platform_configuration_deletedAt_idx`(`deletedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `api_keys` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `key` VARCHAR(191) NOT NULL,
    `secret` VARCHAR(191) NOT NULL,
    `permissions` JSON NULL,
    `expiresAt` DATETIME(3) NULL,
    `lastUsedAt` DATETIME(3) NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    UNIQUE INDEX `api_keys_key_key`(`key`),
    INDEX `api_keys_key_idx`(`key`),
    INDEX `api_keys_active_idx`(`active`),
    INDEX `api_keys_expiresAt_idx`(`expiresAt`),
    INDEX `api_keys_deletedAt_idx`(`deletedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `webhooks` (
    `id` VARCHAR(191) NOT NULL,
    `merchantId` VARCHAR(191) NOT NULL,
    `url` VARCHAR(191) NOT NULL,
    `secret` VARCHAR(191) NOT NULL,
    `events` JSON NOT NULL,
    `enabled` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    INDEX `webhooks_merchantId_idx`(`merchantId`),
    INDEX `webhooks_enabled_idx`(`enabled`),
    INDEX `webhooks_deletedAt_idx`(`deletedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `webhook_deliveries` (
    `id` VARCHAR(191) NOT NULL,
    `webhookId` VARCHAR(191) NOT NULL,
    `payload` JSON NOT NULL,
    `responseCode` INTEGER NULL,
    `success` BOOLEAN NOT NULL DEFAULT false,
    `attempts` INTEGER NOT NULL DEFAULT 1,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    INDEX `webhook_deliveries_webhookId_idx`(`webhookId`),
    INDEX `webhook_deliveries_success_idx`(`success`),
    INDEX `webhook_deliveries_createdAt_idx`(`createdAt`),
    INDEX `webhook_deliveries_deletedAt_idx`(`deletedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `health_checks` (
    `id` VARCHAR(191) NOT NULL,
    `service` VARCHAR(191) NOT NULL,
    `status` ENUM('HEALTHY', 'DEGRADED', 'DOWN') NOT NULL DEFAULT 'HEALTHY',
    `latency` INTEGER NOT NULL DEFAULT 0,
    `checkedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    INDEX `health_checks_service_idx`(`service`),
    INDEX `health_checks_status_idx`(`status`),
    INDEX `health_checks_checkedAt_idx`(`checkedAt`),
    INDEX `health_checks_deletedAt_idx`(`deletedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `system_metrics` (
    `id` VARCHAR(191) NOT NULL,
    `metric` VARCHAR(191) NOT NULL,
    `value` DECIMAL(20, 6) NOT NULL,
    `unit` VARCHAR(191) NULL,
    `timestamp` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    INDEX `system_metrics_metric_idx`(`metric`),
    INDEX `system_metrics_timestamp_idx`(`timestamp`),
    INDEX `system_metrics_deletedAt_idx`(`deletedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `users` ADD CONSTRAINT `users_referredById_fkey` FOREIGN KEY (`referredById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_roles` ADD CONSTRAINT `user_roles_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_roles` ADD CONSTRAINT `user_roles_roleId_fkey` FOREIGN KEY (`roleId`) REFERENCES `roles`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `role_permissions` ADD CONSTRAINT `role_permissions_roleId_fkey` FOREIGN KEY (`roleId`) REFERENCES `roles`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `role_permissions` ADD CONSTRAINT `role_permissions_permissionId_fkey` FOREIGN KEY (`permissionId`) REFERENCES `permissions`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_sessions` ADD CONSTRAINT `user_sessions_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_sessions` ADD CONSTRAINT `user_sessions_deviceId_fkey` FOREIGN KEY (`deviceId`) REFERENCES `devices`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `otps` ADD CONSTRAINT `otps_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `devices` ADD CONSTRAINT `devices_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `login_history` ADD CONSTRAINT `login_history_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `login_history` ADD CONSTRAINT `login_history_deviceId_fkey` FOREIGN KEY (`deviceId`) REFERENCES `devices`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `states` ADD CONSTRAINT `states_countryId_fkey` FOREIGN KEY (`countryId`) REFERENCES `countries`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cities` ADD CONSTRAINT `cities_stateId_fkey` FOREIGN KEY (`stateId`) REFERENCES `states`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `merchants` ADD CONSTRAINT `merchants_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `merchants` ADD CONSTRAINT `merchants_countryId_fkey` FOREIGN KEY (`countryId`) REFERENCES `countries`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `merchants` ADD CONSTRAINT `merchants_stateId_fkey` FOREIGN KEY (`stateId`) REFERENCES `states`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `merchants` ADD CONSTRAINT `merchants_cityId_fkey` FOREIGN KEY (`cityId`) REFERENCES `cities`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `merchant_documents` ADD CONSTRAINT `merchant_documents_merchantId_fkey` FOREIGN KEY (`merchantId`) REFERENCES `merchants`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `merchant_bank_accounts` ADD CONSTRAINT `merchant_bank_accounts_merchantId_fkey` FOREIGN KEY (`merchantId`) REFERENCES `merchants`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `merchant_team` ADD CONSTRAINT `merchant_team_merchantId_fkey` FOREIGN KEY (`merchantId`) REFERENCES `merchants`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `merchant_team` ADD CONSTRAINT `merchant_team_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `merchant_invitations` ADD CONSTRAINT `merchant_invitations_merchantId_fkey` FOREIGN KEY (`merchantId`) REFERENCES `merchants`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `campaigns` ADD CONSTRAINT `campaigns_merchantId_fkey` FOREIGN KEY (`merchantId`) REFERENCES `merchants`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `campaign_tasks` ADD CONSTRAINT `campaign_tasks_campaignId_fkey` FOREIGN KEY (`campaignId`) REFERENCES `campaigns`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `campaign_media` ADD CONSTRAINT `campaign_media_campaignId_fkey` FOREIGN KEY (`campaignId`) REFERENCES `campaigns`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `campaign_targets` ADD CONSTRAINT `campaign_targets_campaignId_fkey` FOREIGN KEY (`campaignId`) REFERENCES `campaigns`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `campaign_category_mappings` ADD CONSTRAINT `campaign_category_mappings_campaignId_fkey` FOREIGN KEY (`campaignId`) REFERENCES `campaigns`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `campaign_category_mappings` ADD CONSTRAINT `campaign_category_mappings_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `campaign_categories`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `campaign_audits` ADD CONSTRAINT `campaign_audits_campaignId_fkey` FOREIGN KEY (`campaignId`) REFERENCES `campaigns`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `campaign_audits` ADD CONSTRAINT `campaign_audits_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `campaign_tag_map` ADD CONSTRAINT `campaign_tag_map_campaignId_fkey` FOREIGN KEY (`campaignId`) REFERENCES `campaigns`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `campaign_tag_map` ADD CONSTRAINT `campaign_tag_map_tagId_fkey` FOREIGN KEY (`tagId`) REFERENCES `campaign_tags`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `campaign_participants` ADD CONSTRAINT `campaign_participants_campaignId_fkey` FOREIGN KEY (`campaignId`) REFERENCES `campaigns`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `campaign_participants` ADD CONSTRAINT `campaign_participants_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `campaign_analytics` ADD CONSTRAINT `campaign_analytics_campaignId_fkey` FOREIGN KEY (`campaignId`) REFERENCES `campaigns`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `campaign_approvals` ADD CONSTRAINT `campaign_approvals_campaignId_fkey` FOREIGN KEY (`campaignId`) REFERENCES `campaigns`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `campaign_approvals` ADD CONSTRAINT `campaign_approvals_reviewerId_fkey` FOREIGN KEY (`reviewerId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `task_submissions` ADD CONSTRAINT `task_submissions_participantId_fkey` FOREIGN KEY (`participantId`) REFERENCES `campaign_participants`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `task_submissions` ADD CONSTRAINT `task_submissions_taskId_fkey` FOREIGN KEY (`taskId`) REFERENCES `campaign_tasks`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `task_submissions` ADD CONSTRAINT `task_submissions_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `task_submissions` ADD CONSTRAINT `task_submissions_reviewerId_fkey` FOREIGN KEY (`reviewerId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `submission_attachments` ADD CONSTRAINT `submission_attachments_submissionId_fkey` FOREIGN KEY (`submissionId`) REFERENCES `task_submissions`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ai_verification_jobs` ADD CONSTRAINT `ai_verification_jobs_submissionId_fkey` FOREIGN KEY (`submissionId`) REFERENCES `task_submissions`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ai_audit_logs` ADD CONSTRAINT `ai_audit_logs_jobId_fkey` FOREIGN KEY (`jobId`) REFERENCES `ai_verification_jobs`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `submission_fraud_flags` ADD CONSTRAINT `submission_fraud_flags_submissionId_fkey` FOREIGN KEY (`submissionId`) REFERENCES `task_submissions`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `submission_fraud_flags` ADD CONSTRAINT `submission_fraud_flags_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_wallets` ADD CONSTRAINT `user_wallets_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `merchant_wallets` ADD CONSTRAINT `merchant_wallet_merchant_fk` FOREIGN KEY (`merchantId`) REFERENCES `merchants`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `wallet_transactions` ADD CONSTRAINT `wallet_transactions_walletId_fkey` FOREIGN KEY (`walletId`) REFERENCES `user_wallets`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `wallet_transactions` ADD CONSTRAINT `wallet_transactions_merchantWalletId_fkey` FOREIGN KEY (`merchantWalletId`) REFERENCES `merchant_wallets`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `rewards` ADD CONSTRAINT `rewards_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `rewards` ADD CONSTRAINT `rewards_campaignId_fkey` FOREIGN KEY (`campaignId`) REFERENCES `campaigns`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `rewards` ADD CONSTRAINT `rewards_submissionId_fkey` FOREIGN KEY (`submissionId`) REFERENCES `task_submissions`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `withdrawal_requests` ADD CONSTRAINT `withdrawal_requests_walletId_fkey` FOREIGN KEY (`walletId`) REFERENCES `user_wallets`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `withdrawal_requests` ADD CONSTRAINT `withdrawal_requests_bankAccountId_fkey` FOREIGN KEY (`bankAccountId`) REFERENCES `user_bank_accounts`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `withdrawal_logs` ADD CONSTRAINT `withdrawal_logs_withdrawalId_fkey` FOREIGN KEY (`withdrawalId`) REFERENCES `withdrawal_requests`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_bank_accounts` ADD CONSTRAINT `user_bank_accounts_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_templateId_fkey` FOREIGN KEY (`templateId`) REFERENCES `notification_templates`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notification_preferences` ADD CONSTRAINT `notification_preferences_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `referrals` ADD CONSTRAINT `referrals_referrerId_fkey` FOREIGN KEY (`referrerId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `referrals` ADD CONSTRAINT `referrals_referredUserId_fkey` FOREIGN KEY (`referredUserId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `referral_rewards` ADD CONSTRAINT `referral_rewards_referralId_fkey` FOREIGN KEY (`referralId`) REFERENCES `referrals`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `referral_rewards` ADD CONSTRAINT `referral_rewards_walletTransactionId_fkey` FOREIGN KEY (`walletTransactionId`) REFERENCES `wallet_transactions`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `support_tickets` ADD CONSTRAINT `support_tickets_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `support_tickets` ADD CONSTRAINT `support_tickets_merchantId_fkey` FOREIGN KEY (`merchantId`) REFERENCES `merchants`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `support_messages` ADD CONSTRAINT `support_messages_ticketId_fkey` FOREIGN KEY (`ticketId`) REFERENCES `support_tickets`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `fraud_flags` ADD CONSTRAINT `fraud_flags_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `uploaded_files` ADD CONSTRAINT `uploaded_files_uploadedBy_fkey` FOREIGN KEY (`uploadedBy`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `activity_logs` ADD CONSTRAINT `activity_logs_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `analytics_events` ADD CONSTRAINT `analytics_events_campaignId_fkey` FOREIGN KEY (`campaignId`) REFERENCES `campaigns`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `merchant_analytics` ADD CONSTRAINT `merchant_analytics_merchantId_fkey` FOREIGN KEY (`merchantId`) REFERENCES `merchants`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_analytics` ADD CONSTRAINT `user_analytics_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `report_schedules` ADD CONSTRAINT `report_schedules_reportId_fkey` FOREIGN KEY (`reportId`) REFERENCES `reports`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `job_execution_logs` ADD CONSTRAINT `job_execution_logs_jobId_fkey` FOREIGN KEY (`jobId`) REFERENCES `scheduled_jobs`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ai_models` ADD CONSTRAINT `ai_models_providerId_fkey` FOREIGN KEY (`providerId`) REFERENCES `ai_providers`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ai_prompt_templates` ADD CONSTRAINT `ai_prompt_templates_providerId_fkey` FOREIGN KEY (`providerId`) REFERENCES `ai_providers`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ai_usage_logs` ADD CONSTRAINT `ai_usage_logs_providerId_fkey` FOREIGN KEY (`providerId`) REFERENCES `ai_providers`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `webhooks` ADD CONSTRAINT `webhooks_merchantId_fkey` FOREIGN KEY (`merchantId`) REFERENCES `merchants`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `webhook_deliveries` ADD CONSTRAINT `webhook_deliveries_webhookId_fkey` FOREIGN KEY (`webhookId`) REFERENCES `webhooks`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
