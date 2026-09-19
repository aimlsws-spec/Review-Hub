import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/constants/app_constants.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../shared/widgets/loading_button.dart';
import '../../../auth/providers/auth_providers.dart';

final _changePasswordSubmitProvider =
    AsyncNotifierProvider.autoDispose<_ChangePasswordSubmitNotifier, void>(_ChangePasswordSubmitNotifier.new);

class _ChangePasswordSubmitNotifier extends AsyncNotifier<void> {
  @override
  Future<void> build() async {}

  Future<bool> submit({required String currentPassword, required String newPassword}) async {
    state = const AsyncLoading();
    final result = await ref.read(authRepositoryProvider).changePassword(
          currentPassword: currentPassword,
          newPassword: newPassword,
        );
    if (result.isFailure) {
      state = AsyncError(result.failureOrNull?.message ?? 'Could not change your password.', StackTrace.current);
      return false;
    }
    state = const AsyncData(null);
    return true;
  }
}

class ChangePasswordScreen extends ConsumerStatefulWidget {
  const ChangePasswordScreen({super.key});

  @override
  ConsumerState<ChangePasswordScreen> createState() => _ChangePasswordScreenState();
}

class _ChangePasswordScreenState extends ConsumerState<ChangePasswordScreen> {
  final _formKey = GlobalKey<FormState>();
  final _currentPasswordController = TextEditingController();
  final _newPasswordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();

  @override
  void dispose() {
    _currentPasswordController.dispose();
    _newPasswordController.dispose();
    _confirmPasswordController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;

    final success = await ref.read(_changePasswordSubmitProvider.notifier).submit(
          currentPassword: _currentPasswordController.text,
          newPassword: _newPasswordController.text,
        );

    if (!mounted || !success) return;

    ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Password changed successfully')));
    context.pop();
  }

  @override
  Widget build(BuildContext context) {
    final submitState = ref.watch(_changePasswordSubmitProvider);
    final errorMessage = submitState.hasError ? submitState.error.toString() : null;

    return Scaffold(
      appBar: AppBar(title: const Text('Change password')),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(20),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
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
                  controller: _currentPasswordController,
                  obscureText: true,
                  decoration: const InputDecoration(labelText: 'Current password'),
                  validator: (v) => (v == null || v.isEmpty) ? 'Enter your current password' : null,
                ),
                const SizedBox(height: 16),
                TextFormField(
                  controller: _newPasswordController,
                  obscureText: true,
                  decoration: const InputDecoration(
                    labelText: 'New password',
                    helperText: '8+ characters, upper & lowercase, a number and a symbol',
                    helperMaxLines: 2,
                  ),
                  validator: (v) {
                    if (v == null || v.isEmpty) return 'Enter a new password';
                    if (!AppConstants.passwordPattern.hasMatch(v)) return 'Must include upper, lower, number & symbol';
                    return null;
                  },
                ),
                const SizedBox(height: 16),
                TextFormField(
                  controller: _confirmPasswordController,
                  obscureText: true,
                  decoration: const InputDecoration(labelText: 'Confirm new password'),
                  validator: (v) => (v != _newPasswordController.text) ? 'Passwords do not match' : null,
                ),
                const SizedBox(height: 24),
                LoadingButton(label: 'Change password', isLoading: submitState.isLoading, onPressed: _submit),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
