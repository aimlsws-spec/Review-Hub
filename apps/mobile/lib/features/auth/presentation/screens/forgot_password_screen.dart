import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_riverpod/legacy.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/router/route_paths.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../shared/widgets/loading_button.dart';
import '../../providers/auth_providers.dart';

final _sentProvider = StateProvider.autoDispose<bool>((ref) => false);

final _forgotPasswordSubmitProvider =
    AsyncNotifierProvider.autoDispose<_ForgotPasswordSubmitNotifier, void>(_ForgotPasswordSubmitNotifier.new);

class _ForgotPasswordSubmitNotifier extends AsyncNotifier<void> {
  @override
  Future<void> build() async {}

  Future<void> submit(String email) async {
    state = const AsyncLoading();
    final result = await ref.read(authRepositoryProvider).forgotPassword(email: email);
    if (result.isFailure) {
      state = AsyncError(result.failureOrNull?.message ?? 'Something went wrong.', StackTrace.current);
      return;
    }
    state = const AsyncData(null);
    ref.read(_sentProvider.notifier).state = true;
  }
}

class ForgotPasswordScreen extends ConsumerStatefulWidget {
  const ForgotPasswordScreen({super.key});

  @override
  ConsumerState<ForgotPasswordScreen> createState() => _ForgotPasswordScreenState();
}

class _ForgotPasswordScreenState extends ConsumerState<ForgotPasswordScreen> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();

  @override
  void dispose() {
    _emailController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    await ref.read(_forgotPasswordSubmitProvider.notifier).submit(_emailController.text.trim());
  }

  @override
  Widget build(BuildContext context) {
    final sent = ref.watch(_sentProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Forgot password')),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: sent ? _buildSentState(context) : _buildForm(),
        ),
      ),
    );
  }

  Widget _buildSentState(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Icon(Icons.mark_email_read_outlined, size: 48, color: AppColors.success),
        const SizedBox(height: 16),
        const Text('Check your email', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
        const SizedBox(height: 8),
        const Text(
          "We've sent a password reset OTP to your email address.",
          style: TextStyle(fontSize: 14, color: AppColors.slate500),
        ),
        const SizedBox(height: 24),
        ElevatedButton(
          onPressed: () => context.push(RoutePaths.resetPassword, extra: _emailController.text.trim()),
          child: const Text('Enter OTP'),
        ),
      ],
    );
  }

  Widget _buildForm() {
    final submitState = ref.watch(_forgotPasswordSubmitProvider);
    final errorMessage = submitState.hasError ? submitState.error.toString() : null;

    return Form(
      key: _formKey,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            "Enter your email and we'll send you a reset OTP.",
            style: TextStyle(fontSize: 14.5, color: AppColors.slate500),
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
          TextFormField(
            controller: _emailController,
            keyboardType: TextInputType.emailAddress,
            decoration: const InputDecoration(labelText: 'Email address'),
            validator: (v) => (v == null || v.trim().isEmpty) ? 'Email is required' : null,
          ),
          const SizedBox(height: 24),
          LoadingButton(label: 'Send reset OTP', isLoading: submitState.isLoading, gradient: true, onPressed: _submit),
        ],
      ),
    );
  }
}
