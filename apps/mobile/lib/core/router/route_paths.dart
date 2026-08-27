class RoutePaths {
  RoutePaths._();

  static const String splash = '/splash';
  static const String onboarding = '/onboarding';
  static const String login = '/login';
  static const String register = '/register';
  static const String otpVerification = '/otp-verification';
  static const String forgotPassword = '/forgot-password';
  static const String resetPassword = '/reset-password';

  static const String home = '/home';
  static const String tasks = '/tasks';
  static const String wallet = '/wallet';
  static const String referral = '/referral';
  static const String profile = '/profile';

  static const String campaignDetail = '/campaigns/:campaignId';
  static String campaignDetailPath(String campaignId) => '/campaigns/$campaignId';

  static const String taskDetail = '/campaigns/:campaignId/tasks/:taskId';
  static String taskDetailPath(String campaignId, String taskId) => '/campaigns/$campaignId/tasks/$taskId';

  static const String taskSubmission = '/tasks/:taskId/submit';
  static String taskSubmissionPath(String taskId) => '/tasks/$taskId/submit';

  static const String mySubmissions = '/tasks/my-submissions';

  static const String walletTransactions = '/wallet/transactions';
  static const String walletRewards = '/wallet/rewards';
  static const String bankAccounts = '/wallet/bank-accounts';
  static const String addBankAccount = '/wallet/bank-accounts/add';
  static const String withdraw = '/wallet/withdraw';
  static const String withdrawalHistory = '/wallet/withdrawals';

  static const String editProfile = '/profile/edit';
  static const String settings = '/profile/settings';
  static const String changePassword = '/profile/settings/change-password';
}
