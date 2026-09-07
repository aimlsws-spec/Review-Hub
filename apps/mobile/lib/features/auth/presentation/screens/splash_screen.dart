import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_svg/flutter_svg.dart';

import '../../../../core/errors/failure.dart';
import '../../../../core/theme/app_colors.dart';
import '../../providers/auth_providers.dart';

/// Shown while `authStateProvider` resolves the persisted session (or lack
/// thereof) — the router's redirect then sends the user on to the right
/// place. `splashMinDurationProvider` (see `core_providers.dart`) keeps it
/// visible for a minimum stretch so it reads as an intentional splash rather
/// than a one-frame flash. If the session check fails because of a network
/// problem (see `NetworkFailure`), this screen offers a retry instead of
/// silently treating the user as logged out.
class SplashScreen extends ConsumerWidget {
  const SplashScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authStateProvider);
    final isOffline = authState.hasError && authState.error is NetworkFailure;

    return Scaffold(
      body: Container(
        width: double.infinity,
        height: double.infinity,
        decoration: const BoxDecoration(
          image: DecorationImage(
            image: AssetImage('assets/images/splash_bg_clean.png'),
            fit: BoxFit.cover,
          ),
        ),
        child: SafeArea(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 32),
            child: Column(
              children: [
                const Spacer(flex: 3),
                Opacity(
                  opacity: isOffline ? 0.6 : 1,
                  child: SvgPicture.asset(
                    'assets/images/viralkar_logo.svg',
                    width: 230,
                  ),
                ),
                const SizedBox(height: 40),
                const Text(
                  'Earn Rewards.',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    color: AppColors.navy900,
                    fontSize: 27,
                    fontWeight: FontWeight.w800,
                    height: 1.25,
                  ),
                ),
                const Text(
                  'Do What You Love.',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    color: AppColors.orange500,
                    fontSize: 27,
                    fontWeight: FontWeight.w800,
                    height: 1.25,
                  ),
                ),
                const SizedBox(height: 36),
                if (isOffline)
                  _OfflineNotice(
                    onRetry: () => ref.invalidate(authStateProvider),
                  )
                else
                  const _LoadingIndicator(),
                const Spacer(flex: 4),
                const SizedBox(
                  height: 84,
                ), // Placeholder for spacing where the old illustration was
                const SizedBox(height: 28),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _LoadingIndicator extends StatelessWidget {
  const _LoadingIndicator();

  @override
  Widget build(BuildContext context) {
    return const Column(
      children: [
        SizedBox(
          width: 32,
          height: 32,
          child: Stack(
            alignment: Alignment.center,
            children: [
              CircularProgressIndicator(
                strokeWidth: 3,
                value: 1,
                color: AppColors.slate200,
              ),
              CircularProgressIndicator(
                strokeWidth: 3,
                color: AppColors.orange500,
              ),
            ],
          ),
        ),
        SizedBox(height: 16),
        Text(
          'Loading your world of rewards…',
          style: TextStyle(color: AppColors.slate500, fontSize: 13.5),
        ),
      ],
    );
  }
}

class _OfflineNotice extends StatelessWidget {
  const _OfflineNotice({required this.onRetry});
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        const Icon(
          Icons.cloud_off_rounded,
          color: AppColors.slate400,
          size: 28,
        ),
        const SizedBox(height: 12),
        const Text(
          'No internet connection',
          style: TextStyle(
            color: AppColors.navy900,
            fontSize: 16,
            fontWeight: FontWeight.w700,
          ),
        ),
        const SizedBox(height: 6),
        const Text(
          'Check your connection and try again.',
          textAlign: TextAlign.center,
          style: TextStyle(color: AppColors.slate500, fontSize: 13.5),
        ),
        const SizedBox(height: 20),
        SizedBox(
          width: double.infinity,
          child: ElevatedButton(
            onPressed: onRetry,
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.orange500,
              foregroundColor: Colors.white,
              elevation: 0,
            ),
            child: const Text('Retry'),
          ),
        ),
      ],
    );
  }
}
