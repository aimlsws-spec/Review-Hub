class RoutePaths {
  RoutePaths._();

  static const String splash = '/splash';
  static const String onboarding = '/onboarding';
  static const String login = '/login';
  static const String register = '/register';
  static const String otpVerification = '/otp-verification';
  /// The email code screen every account with an unverified email is kept on until it enters the code.
  static const String verifyEmail = '/verify-email';
  static const String forgotPassword = '/forgot-password';
  static const String resetPassword = '/reset-password';
  static const String newDeviceVerification = '/login/verify-device';

  /// Legal texts are readable signed in or out (the sign-up screen links to them).
  static const String policyAcceptance = '/legal/accept';
  static const String policyDocument = '/legal/:slug';
  static String policyDocumentPath(String slug) => '/legal/$slug';

  /// Shown once after the first sign-in: why the app asks for each permission.
  static const String permissionsIntro = '/permissions';

  static const String home = '/home';
  static const String tasks = '/tasks';
  static const String wallet = '/wallet';
  static const String referral = '/referral';
  static const String profile = '/profile';
  static const String notifications = '/notifications';

  static const String campaignDetail = '/campaigns/:campaignId';
  static String campaignDetailPath(String campaignId) => '/campaigns/$campaignId';

  static const String taskDetail = '/campaigns/:campaignId/tasks/:taskId';
  static String taskDetailPath(String campaignId, String taskId) => '/campaigns/$campaignId/tasks/$taskId';

  static const String taskSubmission = '/tasks/:taskId/submit';
  static String taskSubmissionPath(String taskId) => '/tasks/$taskId/submit';

  static const String qrScanner = '/qr-scanner';

  static const String reviewAssistant = '/tasks/:taskId/review-assistant';
  static String reviewAssistantPath(String taskId) => '/tasks/$taskId/review-assistant';

  static const String aiStory = '/tasks/:taskId/story';
  static String aiStoryPath(String taskId) => '/tasks/$taskId/story';

  static const String mySubmissions = '/tasks/my-submissions';

  /// Campaigns the person joined, in progress and completed. `?tab=completed` opens on the completed ones.
  static const String myCampaigns = '/my-campaigns';

  static const String walletTransactions = '/wallet/transactions';
  static const String walletRewards = '/wallet/rewards';
  static const String bankAccounts = '/wallet/bank-accounts';
  static const String addBankAccount = '/wallet/bank-accounts/add';
  static const String withdraw = '/wallet/withdraw';
  static const String withdrawalHistory = '/wallet/withdrawals';

  static const String editProfile = '/profile/edit';
  static const String settings = '/profile/settings';
  static const String changePassword = '/profile/settings/change-password';
  static const String deleteAccount = '/profile/settings/delete-account';
  static const String kyc = '/profile/kyc';

  static const String gamification = '/gamification';
  static const String leaderboard = '/leaderboard';

  static const String marketplace = '/marketplace';
  static const String marketplaceRedemptions = '/marketplace/redemptions';

  static const String support = '/support/tickets';
  static const String supportChat = '/support/chat';
  static const String newSupportTicket = '/support/tickets/new';
  static const String supportTicketDetail = '/support/tickets/:ticketId';
  static String supportTicketDetailPath(String ticketId) => '/support/tickets/$ticketId';
}
