-- The finance team role: withdrawals, refunds, top-ups, reward clawbacks, settlements and the TDS register now need it
-- (or super admin). Created here as well as in the seed, in case a database is never seeded. Does nothing if it exists.
INSERT INTO `roles` (`id`, `name`, `slug`, `description`, `isSystem`, `createdAt`, `updatedAt`)
SELECT UUID(), 'Finance Team', 'finance-team', 'Can approve and pay out money', true, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `roles` WHERE `slug` = 'finance-team');
