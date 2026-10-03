import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/constants/app_constants.dart';
import '../../../../core/router/route_paths.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../shared/widgets/error_banner.dart';
import '../../../../shared/widgets/loading_button.dart';
import '../../data/models/login_challenge_model.dart';
import '../../providers/auth_providers.dart';

final _resendCooldownProvider = NotifierProvider.autoDispose<_ResendCooldownNotifier, int>(_ResendCooldownNotifier.new);

/// Seconds until another code may be requested; the server refuses sooner.
class _ResendCooldownNotifier extends Notifier<int> {
  Timer? _timer;

  @override
  int build() {
    ref.onDispose(() => _timer?.cancel());
    return AppConstants.otpResendCooldown.inSeconds;
  }

  void start() {
    state = AppConstants.otpResendCooldown.inSeconds;
    _timer?.cancel();
    _timer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (state <= 1) {
        timer.cancel();
        state = 0;
      } else {
        state -= 1;
      }
    });
  }
}

final newDeviceVerifyProvider = AsyncNotifierProvider.autoDispose<NewDeviceVerifyNotifier, void>(
  NewDeviceVerifyNotifier.new,
);

/// Finishes the held sign-in with the code, or sends a new one. Errors are surfaced through `state`.
class NewDeviceVerifyNotifier extends AsyncNotifier<void> {
  @override
  Future<void> build() async {}

  Future<bool> verify(String challengeToken, String code) async {
    if (code.length != AppConstants.otpLength) {
      state = AsyncError('Enter the ${AppConstants.otpLength}-digit code', StackTrace.current);
      return false;
    }
    state = const AsyncLoading();
    final result = await ref
        .read(authStateProvider.notifier)
        .verifyNewDevice(challengeToken: challengeToken, code: code);
    if (result.isFailure) {
      state = AsyncError(
        result.failureOrNull?.message ?? 'That code did not work. Please try again.',
        StackTrace.current,
      );
      return false;
    }
    state = const AsyncData(null);
    return true;
  }

  Future<bool> resend(String challengeToken) async {
    state = const AsyncLoading();
    final result = await ref.read(authRepositoryProvider).resendNewDeviceCode(challengeToken);
    if (result.isFailure) {
      state = AsyncError(result.failureOrNull?.message ?? 'Could not send a new code.', StackTrace.current);
      return false;
    }
    state = const AsyncData(null);
    return true;
  }
}

/// Shown when a password sign-in comes from a device this account has not used before: the server sent a code to
/// the account's email and phone, and only finishes the sign-in once it comes back from this same device.
class NewDeviceVerificationScreen extends ConsumerStatefulWidget {
  const NewDeviceVerificationScreen({super.key, required this.challenge});

  /// Null if the screen was opened without one (e.g. the app restarted here); the person then signs in again.
  final LoginChallengeModel? challenge;

  @override
  ConsumerState<NewDeviceVerificationScreen> createState() => _NewDeviceVerificationScreenState();
}

class _NewDeviceVerificationScreenState extends ConsumerState<NewDeviceVerificationScreen> {
  final _codeController = TextEditingController();

  @override
  void initState() {
    super.initState();
    // A code was sent with the sign-in itself, so the resend countdown starts right away.
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) ref.read(_resendCooldownProvider.notifier).start();
    });
  }

  @override
  void dispose() {
    _codeController.dispose();
    super.dispose();
  }

  Future<void> _verify(LoginChallengeModel challenge) async {
    final success = await ref
        .read(newDeviceVerifyProvider.notifier)
        .verify(challenge.challengeToken, _codeController.text.trim());
    if (mounted && success) context.go(RoutePaths.home);
  }

  Future<void> _resend(LoginChallengeModel challenge) async {
    final sent = await ref.read(newDeviceVerifyProvider.notifier).resend(challenge.challengeToken);
    if (mounted && sent) ref.read(_resendCooldownProvider.notifier).start();
  }

  @override
  Widget build(BuildContext context) {
    final challenge = widget.challenge;
    final verifyState = ref.watch(newDeviceVerifyProvider);
    final cooldownSeconds = ref.watch(_resendCooldownProvider);

    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        title: const Text(
          'Confirm it\'s you',
          style: TextStyle(color: AppColors.slate900, fontWeight: FontWeight.w700, fontSize: 20),
        ),
        backgroundColor: Colors.white,
        elevation: 0,
        iconTheme: const IconThemeData(color: AppColors.slate900),
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: challenge == null
              ? Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'This sign-in has expired. Please sign in again.',
                      style: TextStyle(fontSize: 15, color: AppColors.slate600),
                    ),
                    const SizedBox(height: 24),
                    LoadingButton(
                      label: 'Back to sign in',
                      gradient: true,
                      onPressed: () => context.go(RoutePaths.login),
                    ),
                  ],
                )
              : Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Icon(Icons.phonelink_lock_outlined, size: 40, color: AppColors.orange500),
                    const SizedBox(height: 16),
                    Text(
                      challenge.reason == LoginChallengeReason.twoFactor
                          ? 'Two-factor sign-in is on for this account'
                          : 'You are signing in on a new device',
                      style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700, color: AppColors.slate900),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      challenge.sentTo.isEmpty
                          ? 'Enter the code we sent you.'
                          : 'Enter the code we sent to ${challenge.sentTo.join(' and ')}.',
                      style: const TextStyle(fontSize: 14.5, color: AppColors.slate600),
                    ),
                    const SizedBox(height: 24),
                    if (verifyState.hasError) ...[
                      ErrorBanner(verifyState.error.toString()),
                      const SizedBox(height: 16),
                    ],
                    TextField(
                      key: const Key('newDeviceCode'),
                      controller: _codeController,
                      keyboardType: TextInputType.number,
                      textAlign: TextAlign.center,
                      maxLength: AppConstants.otpLength,
                      autofillHints: const [AutofillHints.oneTimeCode],
                      style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w700, letterSpacing: 8),
                      decoration: const InputDecoration(counterText: ''),
                      onSubmitted: (_) => _verify(challenge),
                    ),
                    const SizedBox(height: 16),
                    LoadingButton(
                      label: 'Verify',
                      isLoading: verifyState.isLoading,
                      gradient: true,
                      onPressed: () => _verify(challenge),
                    ),
                    const SizedBox(height: 16),
                    Center(
                      child: cooldownSeconds > 0
                          ? Text(
                              'Resend code in ${cooldownSeconds}s',
                              style: const TextStyle(fontSize: 13, color: AppColors.slate400),
                            )
                          : TextButton(
                              onPressed: verifyState.isLoading ? null : () => _resend(challenge),
                              style: TextButton.styleFrom(foregroundColor: AppColors.orange700),
                              child: const Text('Resend code'),
                            ),
                    ),
                  ],
                ),
        ),
      ),
    );
  }
}
