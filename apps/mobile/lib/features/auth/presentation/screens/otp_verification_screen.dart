import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/constants/app_constants.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../shared/widgets/loading_button.dart';
import '../../data/otp_type.dart';
import '../../providers/auth_providers.dart';

final _cooldownProvider = NotifierProvider.autoDispose<_CooldownNotifier, int>(_CooldownNotifier.new);

class _CooldownNotifier extends Notifier<int> {
  Timer? _timer;

  @override
  int build() {
    ref.onDispose(() => _timer?.cancel());
    return 0;
  }

  void start(int seconds) {
    state = seconds;
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

final _verifySubmitProvider = AsyncNotifierProvider.autoDispose<_VerifySubmitNotifier, void>(_VerifySubmitNotifier.new);

class _VerifySubmitNotifier extends AsyncNotifier<void> {
  @override
  Future<void> build() async {}

  Future<bool> verify(OtpType type, String code) async {
    if (code.length != AppConstants.otpLength) {
      state = AsyncError('Enter the ${AppConstants.otpLength}-digit code', StackTrace.current);
      return false;
    }
    state = const AsyncLoading();
    final result = await ref.read(authRepositoryProvider).verifyOtp(type, code);
    if (result.isFailure) {
      state = AsyncError(result.failureOrNull?.message ?? 'Invalid code, please try again.', StackTrace.current);
      return false;
    }
    await ref.read(authStateProvider.notifier).refreshProfile();
    state = const AsyncData(null);
    return true;
  }
}

final _resendSubmitProvider = AsyncNotifierProvider.autoDispose<_ResendSubmitNotifier, void>(_ResendSubmitNotifier.new);

class _ResendSubmitNotifier extends AsyncNotifier<void> {
  @override
  Future<void> build() async {}

  Future<void> resend(OtpType type) async {
    state = const AsyncLoading();
    final result = await ref.read(authRepositoryProvider).resendOtp(type);
    if (result.isFailure) {
      state = AsyncError(result.failureOrNull?.message ?? 'Something went wrong.', StackTrace.current);
      return;
    }
    state = const AsyncData(null);
    ref.read(_cooldownProvider.notifier).start(AppConstants.otpResendCooldown.inSeconds);
  }
}

/// Verifies the signed-in user's email or phone. Reached from a
/// "verify now" prompt elsewhere in the app (e.g. the profile screen) —
/// `send-otp`/`verify-otp` both require an authenticated session.
class OtpVerificationScreen extends ConsumerStatefulWidget {
  const OtpVerificationScreen({super.key, required this.type});

  final OtpType type;

  @override
  ConsumerState<OtpVerificationScreen> createState() => _OtpVerificationScreenState();
}

class _OtpVerificationScreenState extends ConsumerState<OtpVerificationScreen> {
  final _codeController = TextEditingController();

  String get _label => widget.type == OtpType.emailVerification ? 'email address' : 'phone number';

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _sendInitialOtp());
  }

  @override
  void dispose() {
    _codeController.dispose();
    super.dispose();
  }

  Future<void> _sendInitialOtp() async {
    await ref.read(authRepositoryProvider).sendOtp(widget.type);
    if (mounted) ref.read(_cooldownProvider.notifier).start(AppConstants.otpResendCooldown.inSeconds);
  }

  Future<void> _verify() async {
    final success = await ref.read(_verifySubmitProvider.notifier).verify(widget.type, _codeController.text.trim());
    if (mounted && success) context.pop();
  }

  @override
  Widget build(BuildContext context) {
    final cooldownSeconds = ref.watch(_cooldownProvider);
    final verifyState = ref.watch(_verifySubmitProvider);
    final resendState = ref.watch(_resendSubmitProvider);
    final errorMessage = verifyState.hasError
        ? verifyState.error.toString()
        : (resendState.hasError ? resendState.error.toString() : null);

    return Scaffold(
      appBar: AppBar(title: const Text('Verify your account')),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Enter the code sent to your $_label',
                style: const TextStyle(fontSize: 15, color: AppColors.slate600),
              ),
              const SizedBox(height: 24),
              if (errorMessage != null) ...[
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(color: AppColors.dangerBg, borderRadius: BorderRadius.circular(10)),
                  child: Text(errorMessage, style: const TextStyle(color: AppColors.danger, fontSize: 13)),
                ),
                const SizedBox(height: 16),
              ],
              TextField(
                controller: _codeController,
                keyboardType: TextInputType.number,
                textAlign: TextAlign.center,
                maxLength: AppConstants.otpLength,
                style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w700, letterSpacing: 8),
                decoration: const InputDecoration(counterText: ''),
              ),
              const SizedBox(height: 16),
              LoadingButton(label: 'Verify', isLoading: verifyState.isLoading, gradient: true, onPressed: _verify),
              const SizedBox(height: 16),
              Center(
                child: cooldownSeconds > 0
                    ? Text(
                        'Resend code in ${cooldownSeconds}s',
                        style: const TextStyle(fontSize: 13, color: AppColors.slate400),
                      )
                    : TextButton(
                        onPressed: resendState.isLoading ? null : () => ref.read(_resendSubmitProvider.notifier).resend(widget.type),
                        style: TextButton.styleFrom(foregroundColor: AppColors.orange700),
                        child: Text(resendState.isLoading ? 'Sending…' : 'Resend code'),
                      ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
