import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/router/route_paths.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../shared/widgets/error_banner.dart';
import '../../../../shared/widgets/loading_button.dart';
import '../../../auth/providers/auth_providers.dart';

final deleteAccountSubmitProvider = AsyncNotifierProvider.autoDispose<DeleteAccountSubmitNotifier, void>(
  DeleteAccountSubmitNotifier.new,
);

/// Deletes the account. The server refuses while money is still in the wallet or a withdrawal is in progress, and
/// its message says which; that message is shown as is.
class DeleteAccountSubmitNotifier extends AsyncNotifier<void> {
  @override
  Future<void> build() async {}

  Future<bool> submit({String? currentPassword}) async {
    state = const AsyncLoading();
    final result = await ref.read(authStateProvider.notifier).deleteAccount(currentPassword: currentPassword);
    if (result.isFailure) {
      state = AsyncError(result.failureOrNull?.message ?? 'Could not delete your account.', StackTrace.current);
      return false;
    }
    state = const AsyncData(null);
    return true;
  }
}

/// Lets a person delete their own account (required by the app stores). Explains what happens first, asks for the
/// password where there is one, and confirms once more before sending anything.
class DeleteAccountScreen extends ConsumerStatefulWidget {
  const DeleteAccountScreen({super.key});

  @override
  ConsumerState<DeleteAccountScreen> createState() => _DeleteAccountScreenState();
}

class _DeleteAccountScreenState extends ConsumerState<DeleteAccountScreen> {
  final _formKey = GlobalKey<FormState>();
  final _passwordController = TextEditingController();

  @override
  void dispose() {
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _delete(bool hasPassword) async {
    if (!_formKey.currentState!.validate()) return;

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Delete your account?'),
        content: const Text('This can not be undone.'),
        actions: [
          TextButton(onPressed: () => Navigator.of(dialogContext).pop(false), child: const Text('Cancel')),
          TextButton(
            onPressed: () => Navigator.of(dialogContext).pop(true),
            style: TextButton.styleFrom(foregroundColor: AppColors.danger),
            child: const Text('Delete'),
          ),
        ],
      ),
    );
    if (confirmed != true || !mounted) return;

    final success = await ref
        .read(deleteAccountSubmitProvider.notifier)
        .submit(currentPassword: hasPassword ? _passwordController.text : null);
    if (mounted && success) context.go(RoutePaths.login);
  }

  @override
  Widget build(BuildContext context) {
    final submitState = ref.watch(deleteAccountSubmitProvider);
    final hasPassword = ref.watch(authStateProvider).value?.hasPassword ?? true;

    return Scaffold(
      appBar: AppBar(title: const Text('Delete account')),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(20),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (submitState.hasError) ...[ErrorBanner(submitState.error.toString()), const SizedBox(height: 16)],
                const Text(
                  'What happens when you delete your account',
                  style: TextStyle(fontWeight: FontWeight.w700, fontSize: 16),
                ),
                const SizedBox(height: 12),
                const _Point('You are signed out on every device and can no longer sign in to this account.'),
                const _Point(
                  'Your email address and phone number are freed, so you can sign up again later as a new account.',
                ),
                const _Point(
                  'Your earnings, referrals, badges and task history are not carried over to a new account.',
                ),
                const _Point('Records we must keep by law, such as payouts and tax deductions, stay on file.'),
                const SizedBox(height: 12),
                const Text(
                  'Withdraw any money in your wallet first: an account with a balance, rewards waiting for approval, or a '
                  'withdrawal in progress can not be deleted.',
                  style: TextStyle(color: AppColors.slate600, height: 1.4),
                ),
                if (hasPassword) ...[
                  const SizedBox(height: 20),
                  TextFormField(
                    key: const Key('deletePassword'),
                    controller: _passwordController,
                    obscureText: true,
                    decoration: const InputDecoration(labelText: 'Current password'),
                    validator: (v) => (v == null || v.isEmpty) ? 'Enter your password to confirm' : null,
                  ),
                ],
                const SizedBox(height: 24),
                LoadingButton(
                  label: 'Delete my account',
                  isLoading: submitState.isLoading,
                  onPressed: () => _delete(hasPassword),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _Point extends StatelessWidget {
  const _Point(this.text);

  final String text;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Padding(
            padding: EdgeInsets.only(top: 6),
            child: Icon(Icons.circle, size: 6, color: AppColors.slate500),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Text(text, style: const TextStyle(color: AppColors.slate800, height: 1.4)),
          ),
        ],
      ),
    );
  }
}
