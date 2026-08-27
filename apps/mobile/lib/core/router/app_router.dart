import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../features/auth/data/otp_type.dart';
import '../../features/auth/presentation/screens/forgot_password_screen.dart';
import '../../features/auth/presentation/screens/login_screen.dart';
import '../../features/auth/presentation/screens/onboarding_screen.dart';
import '../../features/auth/presentation/screens/otp_verification_screen.dart';
import '../../features/auth/presentation/screens/register_screen.dart';
import '../../features/auth/presentation/screens/reset_password_screen.dart';
import '../../features/auth/presentation/screens/splash_screen.dart';
import '../../features/auth/providers/auth_providers.dart';
import '../../features/campaigns/data/models/campaign_task_model.dart';
import '../../features/campaigns/presentation/screens/campaign_detail_screen.dart';
import '../../features/campaigns/presentation/screens/campaigns_screen.dart';
import '../../features/dashboard/presentation/screens/home_screen.dart';
import '../../features/profile/presentation/screens/edit_profile_screen.dart';
import '../../features/profile/presentation/screens/profile_screen.dart';
import '../../features/referral/presentation/screens/referral_screen.dart';
import '../../features/settings/presentation/screens/change_password_screen.dart';
import '../../features/settings/presentation/screens/settings_screen.dart';
import '../../features/tasks/presentation/screens/my_submissions_screen.dart';
import '../../features/tasks/presentation/screens/task_detail_screen.dart';
import '../../features/tasks/presentation/screens/task_submission_screen.dart';
import '../../features/wallet/presentation/screens/add_bank_account_screen.dart';
import '../../features/wallet/presentation/screens/bank_accounts_screen.dart';
import '../../features/wallet/presentation/screens/rewards_screen.dart';
import '../../features/wallet/presentation/screens/transactions_screen.dart';
import '../../features/wallet/presentation/screens/wallet_screen.dart';
import '../../features/wallet/presentation/screens/withdraw_screen.dart';
import '../../features/wallet/presentation/screens/withdrawal_history_screen.dart';
import '../../shared/providers/core_providers.dart';
import '../constants/storage_keys.dart';
import 'app_shell.dart';
import 'route_paths.dart';

const _authRoutes = {
  RoutePaths.login,
  RoutePaths.register,
  RoutePaths.forgotPassword,
  RoutePaths.resetPassword,
};

/// Bridges a Riverpod-watched value into the [Listenable] GoRouter's
/// `refreshListenable` expects, so redirects re-run whenever auth state
/// resolves or changes — not just on explicit navigation.
class _RouterRefreshNotifier extends ChangeNotifier {
  _RouterRefreshNotifier(Ref ref) {
    ref.listen(authStateProvider, (_, _) => notifyListeners());
  }
}

final routerProvider = Provider<GoRouter>((ref) {
  final refreshNotifier = _RouterRefreshNotifier(ref);
  ref.onDispose(refreshNotifier.dispose);

  return GoRouter(
    initialLocation: RoutePaths.splash,
    refreshListenable: refreshNotifier,
    redirect: (context, state) {
      final authState = ref.read(authStateProvider);
      final location = state.matchedLocation;

      // Still resolving the persisted session — stay on splash.
      if (authState.isLoading) {
        return location == RoutePaths.splash ? null : RoutePaths.splash;
      }

      final isAuthenticated = authState.value != null;
      final onboardingSeen = ref.read(settingsBoxProvider).get(StorageKeys.onboardingSeen, defaultValue: false) as bool;

      if (location == RoutePaths.splash) {
        if (!onboardingSeen) return RoutePaths.onboarding;
        return isAuthenticated ? RoutePaths.home : RoutePaths.login;
      }

      if (location == RoutePaths.onboarding) return null;

      final onAuthRoute = _authRoutes.contains(location);
      if (!isAuthenticated && !onAuthRoute) return RoutePaths.login;
      if (isAuthenticated && onAuthRoute) return RoutePaths.home;

      return null;
    },
    routes: [
      GoRoute(path: RoutePaths.splash, builder: (context, state) => const SplashScreen()),
      GoRoute(path: RoutePaths.onboarding, builder: (context, state) => const OnboardingScreen()),
      GoRoute(path: RoutePaths.login, builder: (context, state) => const LoginScreen()),
      GoRoute(path: RoutePaths.register, builder: (context, state) => const RegisterScreen()),
      GoRoute(
        path: RoutePaths.forgotPassword,
        builder: (context, state) => const ForgotPasswordScreen(),
      ),
      GoRoute(
        path: RoutePaths.resetPassword,
        builder: (context, state) => ResetPasswordScreen(email: state.extra as String?),
      ),
      GoRoute(
        path: RoutePaths.otpVerification,
        builder: (context, state) => OtpVerificationScreen(type: state.extra as OtpType),
      ),

      // Bottom-nav tabs — each a top-level route wrapped by the same shell.
      ShellRoute(
        builder: (context, state, child) => AppShell(child: child),
        routes: [
          GoRoute(path: RoutePaths.home, builder: (context, state) => const HomeScreen()),
          GoRoute(path: RoutePaths.tasks, builder: (context, state) => const CampaignsScreen()),
          GoRoute(path: RoutePaths.wallet, builder: (context, state) => const WalletScreen()),
          GoRoute(path: RoutePaths.profile, builder: (context, state) => const ProfileScreen()),
        ],
      ),

      // Pushed on top of the shell (no bottom nav) — detail/sub-screens.
      GoRoute(
        path: RoutePaths.campaignDetail,
        builder: (context, state) => CampaignDetailScreen(campaignId: state.pathParameters['campaignId']!),
      ),
      GoRoute(
        path: RoutePaths.taskDetail,
        builder: (context, state) => TaskDetailScreen(
          campaignId: state.pathParameters['campaignId']!,
          taskId: state.pathParameters['taskId']!,
        ),
      ),
      GoRoute(
        path: RoutePaths.taskSubmission,
        builder: (context, state) => TaskSubmissionScreen(
          taskId: state.pathParameters['taskId']!,
          task: state.extra as CampaignTaskModel,
        ),
      ),
      GoRoute(path: RoutePaths.mySubmissions, builder: (context, state) => const MySubmissionsScreen()),

      GoRoute(path: RoutePaths.walletTransactions, builder: (context, state) => const TransactionsScreen()),
      GoRoute(path: RoutePaths.walletRewards, builder: (context, state) => const RewardsScreen()),
      GoRoute(path: RoutePaths.bankAccounts, builder: (context, state) => const BankAccountsScreen()),
      GoRoute(path: RoutePaths.addBankAccount, builder: (context, state) => const AddBankAccountScreen()),
      GoRoute(path: RoutePaths.withdraw, builder: (context, state) => const WithdrawScreen()),
      GoRoute(path: RoutePaths.withdrawalHistory, builder: (context, state) => const WithdrawalHistoryScreen()),

      GoRoute(path: RoutePaths.referral, builder: (context, state) => const ReferralScreen()),

      GoRoute(path: RoutePaths.editProfile, builder: (context, state) => const EditProfileScreen()),
      GoRoute(path: RoutePaths.settings, builder: (context, state) => const SettingsScreen()),
      GoRoute(path: RoutePaths.changePassword, builder: (context, state) => const ChangePasswordScreen()),
    ],
  );
});
