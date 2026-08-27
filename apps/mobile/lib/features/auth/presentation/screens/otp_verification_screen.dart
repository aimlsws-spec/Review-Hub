import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/constants/app_constants.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../shared/widgets/loading_button.dart';
import '../../data/otp_type.dart';
import '../../providers/auth_providers.dart';

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
  bool _isVerifying = false;
  bool _isResending = false;
  String? _errorMessage;
  int _cooldownSeconds = 0;
  Timer? _cooldownTimer;

  String get _label => widget.type == OtpType.emailVerification ? 'email address' : 'phone number';

  @override
  void initState() {
    super.initState();
    _sendInitialOtp();
  }

  @override
  void dispose() {
    _codeController.dispose();
    _cooldownTimer?.cancel();
    super.dispose();
  }

  Future<void> _sendInitialOtp() async {
    await ref.read(authRepositoryProvider).sendOtp(widget.type);
    _startCooldown();
  }

  void _startCooldown() {
    setState(() => _cooldownSeconds = AppConstants.otpResendCooldown.inSeconds);
    _cooldownTimer?.cancel();
    _cooldownTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (_cooldownSeconds <= 1) {
        timer.cancel();
        setState(() => _cooldownSeconds = 0);
      } else {
        setState(() => _cooldownSeconds -= 1);
      }
    });
  }

  Future<void> _resend() async {
    setState(() => _isResending = true);
    final result = await ref.read(authRepositoryProvider).resendOtp(widget.type);
    if (!mounted) return;
    setState(() => _isResending = false);
    if (result.isFailure) {
      setState(() => _errorMessage = result.failureOrNull?.message);
      return;
    }
    _startCooldown();
  }

  Future<void> _verify() async {
    if (_codeController.text.trim().length != AppConstants.otpLength) {
      setState(() => _errorMessage = 'Enter the ${AppConstants.otpLength}-digit code');
      return;
    }

    setState(() {
      _isVerifying = true;
      _errorMessage = null;
    });

    final result = await ref.read(authRepositoryProvider).verifyOtp(widget.type, _codeController.text.trim());
    if (!mounted) return;
    setState(() => _isVerifying = false);

    if (result.isFailure) {
      setState(() => _errorMessage = result.failureOrNull?.message ?? 'Invalid code, please try again.');
      return;
    }

    await ref.read(authStateProvider.notifier).refreshProfile();
    if (mounted) context.pop();
  }

  @override
  Widget build(BuildContext context) {
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
              if (_errorMessage != null) ...[
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(color: const Color(0xFFFEE2E2), borderRadius: BorderRadius.circular(10)),
                  child: Text(_errorMessage!, style: const TextStyle(color: AppColors.danger, fontSize: 13)),
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
              LoadingButton(label: 'Verify', isLoading: _isVerifying, onPressed: _verify),
              const SizedBox(height: 16),
              Center(
                child: _cooldownSeconds > 0
                    ? Text(
                        'Resend code in ${_cooldownSeconds}s',
                        style: const TextStyle(fontSize: 13, color: AppColors.slate400),
                      )
                    : TextButton(
                        onPressed: _isResending ? null : _resend,
                        child: Text(_isResending ? 'Sending…' : 'Resend code'),
                      ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
