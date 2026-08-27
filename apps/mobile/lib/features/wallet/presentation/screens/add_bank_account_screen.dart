import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../shared/widgets/loading_button.dart';
import '../../providers/wallet_providers.dart';

/// IFSC codes are 4 letters + 0 + 6 alphanumeric characters, e.g. HDFC0001234.
final _ifscPattern = RegExp(r'^[A-Z]{4}0[A-Z0-9]{6}$');

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
  bool _isPrimary = false;
  bool _isSubmitting = false;
  String? _errorMessage;

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
    setState(() {
      _isSubmitting = true;
      _errorMessage = null;
    });

    final result = await ref.read(walletRepositoryProvider).addBankAccount(
          bankName: _bankNameController.text.trim(),
          accountHolderName: _holderNameController.text.trim(),
          accountNumber: _accountNumberController.text.trim(),
          ifscCode: _ifscController.text.trim().toUpperCase(),
          branch: _branchController.text.trim(),
          upiId: _upiController.text.trim(),
          isPrimary: _isPrimary,
        );

    if (!mounted) return;
    setState(() => _isSubmitting = false);

    if (result.isFailure) {
      setState(() => _errorMessage = result.failureOrNull?.message ?? 'Could not add this account.');
      return;
    }

    ref.read(walletRefreshProvider.notifier).state++;
    if (mounted) context.pop();
  }

  @override
  Widget build(BuildContext context) {
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
                if (_errorMessage != null) ...[
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(color: const Color(0xFFFEE2E2), borderRadius: BorderRadius.circular(10)),
                    child: Text(_errorMessage!, style: const TextStyle(color: AppColors.danger, fontSize: 13)),
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
                  value: _isPrimary,
                  onChanged: (v) => setState(() => _isPrimary = v ?? false),
                  title: const Text('Set as primary account', style: TextStyle(fontSize: 14)),
                  controlAffinity: ListTileControlAffinity.leading,
                ),
                const SizedBox(height: 16),
                LoadingButton(label: 'Add account', isLoading: _isSubmitting, onPressed: _submit),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
