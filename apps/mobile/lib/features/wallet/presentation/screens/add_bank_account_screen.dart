import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_riverpod/legacy.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../shared/widgets/loading_button.dart';
import '../../providers/wallet_providers.dart';

/// IFSC codes are 4 letters + 0 + 6 alphanumeric characters, e.g. HDFC0001234.
final _ifscPattern = RegExp(r'^[A-Z]{4}0[A-Z0-9]{6}$');

final _isPrimaryProvider = StateProvider.autoDispose<bool>((ref) => false);

final _addBankAccountSubmitProvider =
    AsyncNotifierProvider.autoDispose<_AddBankAccountSubmitNotifier, void>(_AddBankAccountSubmitNotifier.new);

class _AddBankAccountSubmitNotifier extends AsyncNotifier<void> {
  @override
  Future<void> build() async {}

  Future<bool> submit({
    required String bankName,
    required String accountHolderName,
    required String accountNumber,
    required String ifscCode,
    required String branch,
    required String upiId,
    required bool isPrimary,
  }) async {
    state = const AsyncLoading();
    final result = await ref.read(walletRepositoryProvider).addBankAccount(
          bankName: bankName,
          accountHolderName: accountHolderName,
          accountNumber: accountNumber,
          ifscCode: ifscCode,
          branch: branch,
          upiId: upiId,
          isPrimary: isPrimary,
        );

    if (result.isFailure) {
      state = AsyncError(result.failureOrNull?.message ?? 'Could not add this account.', StackTrace.current);
      return false;
    }
    state = const AsyncData(null);
    ref.read(walletRefreshProvider.notifier).state++;
    return true;
  }
}

class AddBankAccountScreen extends ConsumerStatefulWidget {
  const AddBankAccountScreen({super.key});

  @override
  ConsumerState<AddBankAccountScreen> createState() => _AddBankAccountScreenState();
}

class _AddBankAccountScreenState extends ConsumerState<AddBankAccountScreen> {
  final _formKey = GlobalKey<FormState>();
  final _bankNameController = TextEditingController();
  final _holderNameController = TextEditingController();
  final _accountNumberController = TextEditingController();
  final _ifscController = TextEditingController();
  final _branchController = TextEditingController();
  final _upiController = TextEditingController();

  @override
  void dispose() {
    _bankNameController.dispose();
    _holderNameController.dispose();
    _accountNumberController.dispose();
    _ifscController.dispose();
    _branchController.dispose();
    _upiController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;

    final success = await ref.read(_addBankAccountSubmitProvider.notifier).submit(
          bankName: _bankNameController.text.trim(),
          accountHolderName: _holderNameController.text.trim(),
          accountNumber: _accountNumberController.text.trim(),
          ifscCode: _ifscController.text.trim().toUpperCase(),
          branch: _branchController.text.trim(),
          upiId: _upiController.text.trim(),
          isPrimary: ref.read(_isPrimaryProvider),
        );

    if (!mounted || !success) return;
    context.pop();
  }

  @override
  Widget build(BuildContext context) {
    final submitState = ref.watch(_addBankAccountSubmitProvider);
    final isPrimary = ref.watch(_isPrimaryProvider);
    final errorMessage = submitState.hasError ? submitState.error.toString() : null;

    return Scaffold(
      appBar: AppBar(title: const Text('Add bank account')),
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
                  controller: _bankNameController,
                  decoration: const InputDecoration(labelText: 'Bank name'),
                  validator: (v) => (v == null || v.trim().length < 2) ? 'Enter the bank name' : null,
                ),
                const SizedBox(height: 16),
                TextFormField(
                  controller: _holderNameController,
                  decoration: const InputDecoration(labelText: 'Account holder name'),
                  validator: (v) => (v == null || v.trim().length < 2) ? 'Enter the account holder name' : null,
                ),
                const SizedBox(height: 16),
                TextFormField(
                  controller: _accountNumberController,
                  keyboardType: TextInputType.number,
                  decoration: const InputDecoration(labelText: 'Account number'),
                  validator: (v) {
                    final value = v?.trim() ?? '';
                    if (value.length < 9 || value.length > 18) return 'Enter a valid account number';
                    return null;
                  },
                ),
                const SizedBox(height: 16),
                TextFormField(
                  controller: _ifscController,
                  textCapitalization: TextCapitalization.characters,
                  decoration: const InputDecoration(labelText: 'IFSC code', hintText: 'HDFC0001234'),
                  validator: (v) {
                    final value = v?.trim().toUpperCase() ?? '';
                    return _ifscPattern.hasMatch(value) ? null : 'Enter a valid IFSC code';
                  },
                ),
                const SizedBox(height: 16),
                TextFormField(
                  controller: _branchController,
                  decoration: const InputDecoration(labelText: 'Branch (optional)'),
                ),
                const SizedBox(height: 16),
                TextFormField(
                  controller: _upiController,
                  decoration: const InputDecoration(labelText: 'UPI ID (optional)'),
                ),
                const SizedBox(height: 8),
                CheckboxListTile(
                  contentPadding: EdgeInsets.zero,
                  value: isPrimary,
                  onChanged: (v) => ref.read(_isPrimaryProvider.notifier).state = v ?? false,
                  title: const Text('Set as primary account', style: TextStyle(fontSize: 14)),
                  controlAffinity: ListTileControlAffinity.leading,
                ),
                const SizedBox(height: 16),
                LoadingButton(label: 'Add account', isLoading: submitState.isLoading, onPressed: _submit),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
