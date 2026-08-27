/// REST paths relative to [AppConfig.apiBaseUrl] (which already includes `/api/v1`),
/// mirrored 1:1 from `apps/backend/src/modules/*/controllers/*.controller.ts`.
class ApiEndpoints {
  ApiEndpoints._();

  // Auth — apps/backend/src/modules/auth/controllers/auth.controller.ts
  static const String register = '/auth/register';
  static const String login = '/auth/login';
  static const String sendOtp = '/auth/send-otp';
  static const String verifyOtp = '/auth/verify-otp';
  static const String resendOtp = '/auth/resend-otp';
  static const String refresh = '/auth/refresh';
  static const String logout = '/auth/logout';
  static const String logoutAll = '/auth/logout/all';
  static const String forgotPassword = '/auth/forgot-password';
  static const String resetPassword = '/auth/reset-password';
  static const String profile = '/auth/profile';
  static const String changePassword = '/auth/change-password';
  static const String me = '/auth/me';

  // Wallet — apps/backend/src/modules/wallet/controllers/wallet.controller.ts
  static const String wallet = '/wallet';
  static const String walletTransactions = '/wallet/transactions';
  static const String walletRewards = '/wallet/rewards';

  // Bank accounts — wallet/controllers/bank-account.controller.ts
  static const String bankAccounts = '/wallet/bank-accounts';

  // Withdrawals — wallet/controllers/withdrawal.controller.ts
  static const String withdrawals = '/withdrawals';
  static String withdrawal(String withdrawalId) => '/withdrawals/$withdrawalId';

  // Campaigns & tasks — campaign/controllers/public-campaign.controller.ts,
  // task/controllers/campaign-task.controller.ts, task-participation.controller.ts
  static const String campaignsBrowse = '/campaigns';
  static String campaignTasks(String campaignId) => '/campaigns/$campaignId/tasks';
  static String taskStart(String taskId) => '/tasks/$taskId/start';
  static String taskSubmit(String taskId) => '/tasks/$taskId/submit';
  static String taskTextSuggestion(String taskId) => '/tasks/$taskId/text-suggestion';

  // Submissions — task/controllers/submission.controller.ts
  static const String submissions = '/submissions';
  static String submission(String submissionId) => '/submissions/$submissionId';

  // Referral — referral/controllers/referral.controller.ts
  static const String referralMe = '/referrals/me';
  static const String referralStats = '/referrals/me/stats';

  // Notifications — notification/controllers/notification.controller.ts
  static const String notifications = '/notifications';
  static const String notificationUnreadCount = '/notifications/unread-count';
  static const String notificationPreferences = '/notifications/preferences';
  static String notificationRead(String notificationId) => '/notifications/$notificationId/read';
  static const String notificationReadAll = '/notifications/read-all';

  // Health
  static const String health = '/health';
}
