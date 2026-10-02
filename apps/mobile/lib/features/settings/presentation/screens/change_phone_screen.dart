import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_riverpod/legacy.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/constants/app_constants.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../shared/widgets/error_banner.dart';
import '../../../../shared/widgets/loading_button.dart';
import '../../../auth/data/models/phone_change_request_model.dart';
import '../../../auth/providers/auth_providers.dart';

/// The change waiting for its code, or null while the person is still entering the new number.
final _pendingChangeProvider = StateProvider.autoDispose<PhoneChangeRequestModel?>((ref) => null);

final phoneChangeSubmitProvider = AsyncNotifierProvider.autoDispose<PhoneChangeSubmitNotifier, void>(
  PhoneChangeSubmitNotifier.new,
);

/// Both steps of a phone number change. Errors are surfaced through `state`.
class PhoneChangeSubmitNotifier extends AsyncNotifier<void> {
  @override
  Future<void> build() async {}

  /// Step 1: sends a code to [newPhone]. Returns what was sent, or null on failure.
  Future<PhoneChangeRequestModel?> request({required String newPhone, String? currentPassword}) async {
    state = const AsyncLoading();
    final result = await ref
        .read(authRepositoryProvider)
        .requestPhoneChange(newPhone: newPhone, currentPassword: currentPassword);
    if (result.isFailure) {
      state = AsyncError(result.failureOrNull?.message ?? 'Could not send a code to that number.', StackTrace.current);
      return null;
    }
    state = const AsyncData(null);
    return result.valueOrNull;
  }

  /// Step 2: confirms with the code from the new number, then reloads the profile so the new number shows.
  Future<bool> verify(String code) async {
    if (code.length != AppConstants.otpLength) {
      state = AsyncError('Enter the ${AppConstants.otpLength}-digit code', StackTrace.current);
      return false;
    }
    state = const AsyncLoading();
    final result = await ref.read(authRepositoryProvider).verifyPhoneChange(code);
    if (result.isFailure) {
      state = AsyncError(
        result.failureOrNull?.message ?? 'That code did not work. Please try again.',
        StackTrace.current,
      );
      return false;
    }
    await ref.read(authStateProvider.notifier).refreshProfile();
    state = const AsyncData(null);
    return true;
  }
}

/// Changes the phone number: the new number only replaces the old one once the code sent to it is typed in.
class ChangePhoneScreen extends ConsumerStatefulWidget {
  const ChangePhoneScreen({super.key});

  @override
  ConsumerState<ChangePhoneScreen> createState() => _ChangePhoneScreenState();
}

class _ChangePhoneScreenState extends ConsumerState<ChangePhoneScreen> {
  final _formKey = GlobalKey<FormState>();
  final _phoneController = TextEditingController();
  final _passwordController = TextEditingController();
  final _codeController = TextEditingController();

  @override
  void dispose() {
    _phoneController.dispose();
    _passwordController.dispose();
    _codeController.dispose();
    super.dispose();
  }

  Future<void> _request(bool hasPassword) async {
    if (!_formKey.currentState!.validate()) return;
    final pending = await ref
        .read(phoneChangeSubmitProvider.notifier)
        .request(
          newPhone: _phoneController.text.trim(),
          currentPassword: hasPassword ? _passwordController.text : null,
        );
    if (pending != null) ref.read(_pendingChangeProvider.notifier).state = pending;
  }

  Future<void> _verify() async {
    final success = await ref.read(phoneChangeSubmitProvider.notifier).verify(_codeController.text.trim());
    if (!mounted || !success) return;
    ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Phone number changed')));
    context.pop();
  }

  @override
  Widget build(BuildContext context) {
    final submitState = ref.watch(phoneChangeSubmitProvider);
    final pending = ref.watch(_pendingChangeProvider);
    final user = ref.watch(authStateProvider).value;
    final hasPassword = user?.hasPassword ?? true;

    return Scaffold(
      appBar: AppBar(title: const Text('Change phone number')),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(20),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (submitState.hasError) ...[ErrorBanner(submitState.error.toString()), const SizedBox(height: 16)],
                if (pending == null) ...[
                  Text(
                    user?.phone == null
                        ? 'Add a phone number to your account.'
                        : 'Your current number is ${user!.phone}.',
                    style: const TextStyle(color: AppColors.slate600),
                  ),
                  const SizedBox(height: 16),
                  TextFormField(
                    key: const Key('newPhone'),
                    controller: _phoneController,
                    keyboardType: TextInputType.phone,
                    decoration: const InputDecoration(labelText: 'New phone number'),
                    validator: (v) {
                      if (v == null || v.trim().isEmpty) return 'Enter a phone number';
                      return AppConstants.phonePattern.hasMatch(v.trim()) ? null : 'Enter a valid phone number';
                    },
                  ),
                  if (hasPassword) ...[
                    const SizedBox(height: 16),
                    TextFormField(
                      key: const Key('currentPassword'),
                      controller: _passwordController,
                      obscureText: true,
                      decoration: const InputDecoration(labelText: 'Current password'),
                      validator: (v) => (v == null || v.isEmpty) ? 'Enter your current password' : null,
                    ),
                  ],
                  const SizedBox(height: 24),
                  LoadingButton(
                    label: 'Send code',
                    isLoading: submitState.isLoading,
                    onPressed: () => _request(hasPassword),
                  ),
                ] else ...[
                  Text(
                    'Enter the code we sent by SMS to ${pending.sentTo}.',
                    style: const TextStyle(color: AppColors.slate600),
                  ),
                  const SizedBox(height: 16),
                  TextField(
                    key: const Key('phoneCode'),
                    controller: _codeController,
                    keyboardType: TextInputType.number,
                    textAlign: TextAlign.center,
                    maxLength: AppConstants.otpLength,
                    autofillHints: const [AutofillHints.oneTimeCode],
                    style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w700, letterSpacing: 8),
                    decoration: const InputDecoration(counterText: ''),
                  ),
                  const SizedBox(height: 16),
                  LoadingButton(label: 'Confirm new number', isLoading: submitState.isLoading, onPressed: _verify),
                  const SizedBox(height: 8),
                  Center(
                    child: TextButton(
                      onPressed: submitState.isLoading
                          ? null
                          : () => ref.read(_pendingChangeProvider.notifier).state = null,
                      child: const Text('Use a different number'),
                    ),
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }
}
