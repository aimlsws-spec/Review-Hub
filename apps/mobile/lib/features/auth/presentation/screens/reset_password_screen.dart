import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/constants/app_constants.dart';
import '../../../../core/router/route_paths.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../shared/widgets/loading_button.dart';
import '../../providers/auth_providers.dart';

final _resetPasswordSubmitProvider =
    AsyncNotifierProvider.autoDispose<_ResetPasswordSubmitNotifier, void>(_ResetPasswordSubmitNotifier.new);

class _ResetPasswordSubmitNotifier extends AsyncNotifier<void> {
  @override
  Future<void> build() async {}

  Future<bool> submit({required String email, required String code, required String password}) async {
    state = const AsyncLoading();
    final result = await ref.read(authRepositoryProvider).resetPassword(email: email, code: code, password: password);
    if (result.isFailure) {
      state = AsyncError(result.failureOrNull?.message ?? 'Something went wrong.', StackTrace.current);
      return false;
    }
    state = const AsyncData(null);
    return true;
  }
}

class ResetPasswordScreen extends ConsumerStatefulWidget {
  const ResetPasswordScreen({super.key, this.email});

  final String? email;

  @override
  ConsumerState<ResetPasswordScreen> createState() => _ResetPasswordScreenState();
}

class _ResetPasswordScreenState extends ConsumerState<ResetPasswordScreen> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _emailController;
  final _codeController = TextEditingController();
  final _passwordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _emailController = TextEditingController(text: widget.email ?? '');
  }

  @override
  void dispose() {
    _emailController.dispose();
    _codeController.dispose();
    _passwordController.dispose();
    _confirmPasswordController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;

    final success = await ref.read(_resetPasswordSubmitProvider.notifier).submit(
          email: _emailController.text.trim(),
          code: _codeController.text.trim(),
          password: _passwordController.text,
        );

    if (!mounted || !success) return;

    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Password reset successfully. Please sign in.')),
    );
    context.go(RoutePaths.login);
  }

  @override
  Widget build(BuildContext context) {
    final submitState = ref.watch(_resetPasswordSubmitProvider);
    final errorMessage = submitState.hasError ? submitState.error.toString() : null;

    return Scaffold(
      appBar: AppBar(title: const Text('Reset password')),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Enter the OTP sent to your email.', style: TextStyle(fontSize: 14.5, color: AppColors.slate500)),
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
                const SizedBox(height: 16),
                TextFormField(
                  controller: _codeController,
                  keyboardType: TextInputType.number,
                  maxLength: AppConstants.otpLength,
                  decoration: const InputDecoration(labelText: 'OTP code', helperText: '6-digit code from your email'),
                  validator: (v) => (v == null || v.trim().length != AppConstants.otpLength) ? 'Enter the 6-digit OTP' : null,
                ),
                TextFormField(
                  controller: _passwordController,
                  obscureText: true,
                  decoration: const InputDecoration(labelText: 'New password'),
                  validator: (v) {
                    if (v == null || v.isEmpty) return 'Password is required';
                    if (!AppConstants.passwordPattern.hasMatch(v)) return 'Must include upper, lower, number & symbol';
                    return null;
                  },
                ),
                const SizedBox(height: 16),
                TextFormField(
                  controller: _confirmPasswordController,
                  obscureText: true,
                  decoration: const InputDecoration(labelText: 'Confirm new password'),
                  validator: (v) => (v != _passwordController.text) ? 'Passwords do not match' : null,
                ),
                const SizedBox(height: 24),
                LoadingButton(label: 'Reset password', isLoading: submitState.isLoading, gradient: true, onPressed: _submit),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
