-- New badge criteria for the spec's achievements, and the badges themselves (also in the seed; created here in case a
-- database is never seeded). Each insert does nothing if a badge with that code already exists.

-- AlterTable
ALTER TABLE `badges` MODIFY `criteriaType` ENUM('XP_THRESHOLD', 'STREAK_THRESHOLD', 'LEVEL_THRESHOLD', 'REWARD_COUNT', 'REVIEW_TASK_COUNT', 'REFERRAL_COUNT', 'TOP_EARNER_MONTHLY') NOT NULL;

INSERT INTO `badges` (`id`, `code`, `name`, `description`, `criteriaType`, `criteriaValue`, `isActive`, `createdAt`, `updatedAt`)
SELECT UUID(), v.code, v.name, v.description, v.criteriaType, v.criteriaValue, true, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)
FROM (
  SELECT 'TASKS_100' AS code, '100 Tasks' AS name, 'Completed 100 tasks.' AS description, 'REWARD_COUNT' AS criteriaType, 100 AS criteriaValue
  UNION ALL SELECT 'TASKS_1000', '1,000 Tasks', 'Completed 1,000 tasks.', 'REWARD_COUNT', 1000
  UNION ALL SELECT 'REVIEWS_100', '100 Reviews', 'Completed 100 review tasks.', 'REVIEW_TASK_COUNT', 100
  UNION ALL SELECT 'REFERRALS_50', '50 Referrals', 'Referred 50 people who joined and earned.', 'REFERRAL_COUNT', 50
  UNION ALL SELECT 'STREAK_30', '30-Day Streak', 'Earned on 30 days in a row.', 'STREAK_THRESHOLD', 30
  UNION ALL SELECT 'TOP_EARNER', 'Top Earner', 'One of the top 10 earners of a month.', 'TOP_EARNER_MONTHLY', 10
) AS v
WHERE NOT EXISTS (SELECT 1 FROM `badges` b WHERE b.`code` = v.code);
