import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_riverpod/legacy.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/constants/app_constants.dart';
import '../../../../core/router/route_paths.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../shared/widgets/loading_button.dart';
import '../../providers/auth_providers.dart';

final _obscurePasswordProvider = StateProvider.autoDispose<bool>((ref) => true);
final _obscureConfirmPasswordProvider = StateProvider.autoDispose<bool>((ref) => true);

final _registerSubmitProvider =
    AsyncNotifierProvider.autoDispose<_RegisterSubmitNotifier, void>(_RegisterSubmitNotifier.new);

class _RegisterSubmitNotifier extends AsyncNotifier<void> {
  @override
  Future<void> build() async {}

  Future<bool> submit({
    required String firstName,
    required String lastName,
    required String phone,
    required String password,
    String? referralCode,
  }) async {
    state = const AsyncLoading();
    final result = await ref.read(authStateProvider.notifier).register(
          firstName: firstName,
          lastName: lastName,
          phone: phone,
          password: password,
          referralCode: referralCode,
        );
    if (result.isFailure) {
      state = AsyncError(result.failureOrNull?.message ?? 'Something went wrong.', StackTrace.current);
      return false;
    }
    state = const AsyncData(null);
    return true;
  }
}

class RegisterScreen extends ConsumerStatefulWidget {
  const RegisterScreen({super.key});

  @override
  ConsumerState<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends ConsumerState<RegisterScreen> {
  final _formKey = GlobalKey<FormState>();
  final _firstNameController = TextEditingController();
  final _lastNameController = TextEditingController();
  final _phoneController = TextEditingController();
  final _passwordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();
  final _referralCodeController = TextEditingController();

  @override
  void dispose() {
    _firstNameController.dispose();
    _lastNameController.dispose();
    _phoneController.dispose();
    _passwordController.dispose();
    _confirmPasswordController.dispose();
    _referralCodeController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;

    final success = await ref.read(_registerSubmitProvider.notifier).submit(
          firstName: _firstNameController.text.trim(),
          lastName: _lastNameController.text.trim(),
          phone: _phoneController.text.trim(),
          password: _passwordController.text,
          referralCode: _referralCodeController.text.trim().isEmpty ? null : _referralCodeController.text.trim(),
        );

    if (!mounted || !success) return;
    context.go(RoutePaths.home);
  }

  @override
  Widget build(BuildContext context) {
    final submitState = ref.watch(_registerSubmitProvider);
    final obscurePassword = ref.watch(_obscurePasswordProvider);
    final obscureConfirmPassword = ref.watch(_obscureConfirmPasswordProvider);
    final errorMessage = submitState.hasError ? submitState.error.toString() : null;

    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        title: const Text('Create account', style: TextStyle(color: AppColors.slate900, fontWeight: FontWeight.w700, fontSize: 20)),
        backgroundColor: Colors.white,
        elevation: 0,
        iconTheme: const IconThemeData(color: AppColors.slate900),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (errorMessage != null) ...[
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: AppColors.dangerBg,
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Text(
                      errorMessage,
                      style: const TextStyle(color: AppColors.danger, fontSize: 13),
                    ),
                  ),
                  const SizedBox(height: 16),
                ],
                Row(
                  children: [
                    Expanded(
                      child: _buildTextField(
                        controller: _firstNameController,
                        label: 'First name',
                        validator: (v) => (v == null || v.trim().isEmpty) ? 'Required' : null,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: _buildTextField(
                        controller: _lastNameController,
                        label: 'Last name',
                        validator: (v) => (v == null || v.trim().isEmpty) ? 'Required' : null,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                _buildTextField(
                  controller: _phoneController,
                  keyboardType: TextInputType.phone,
                  label: 'Phone',
                  validator: (v) {
                    if (v == null || v.trim().isEmpty) return 'Enter a phone number';
                    return AppConstants.phonePattern.hasMatch(v.trim()) ? null : 'Enter a valid phone number';
                  },
                ),
                const SizedBox(height: 16),
                _buildTextField(
                  controller: _passwordController,
                  obscureText: obscurePassword,
                  label: 'Password',
                  helperText: '8+ characters, upper & lowercase, a number and a symbol',
                  helperMaxLines: 2,
                  suffixIcon: IconButton(
                    icon: Icon(obscurePassword ? Icons.visibility_outlined : Icons.visibility_off_outlined, color: AppColors.slate500),
                    onPressed: () => ref.read(_obscurePasswordProvider.notifier).state = !obscurePassword,
                  ),
                  validator: (v) {
                    if (v == null || v.isEmpty) return 'Enter a password';
                    if (!AppConstants.passwordPattern.hasMatch(v)) {
                      return 'Must include upper, lower, number & symbol';
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 16),
                _buildTextField(
                  controller: _confirmPasswordController,
                  obscureText: obscureConfirmPassword,
                  label: 'Confirm password',
                  suffixIcon: IconButton(
                    icon: Icon(obscureConfirmPassword ? Icons.visibility_outlined : Icons.visibility_off_outlined, color: AppColors.slate500),
                    onPressed: () => ref.read(_obscureConfirmPasswordProvider.notifier).state = !obscureConfirmPassword,
                  ),
                  validator: (v) {
                    if (v == null || v.isEmpty) return 'Re-enter your password';
                    if (v != _passwordController.text) return 'Passwords do not match';
                    return null;
                  },
                ),
                const SizedBox(height: 16),
                _buildTextField(
                  controller: _referralCodeController,
                  label: 'Referral code (optional)',
                ),
                const SizedBox(height: 32),
                LoadingButton(label: 'Create account', isLoading: submitState.isLoading, gradient: true, onPressed: _submit),
                const SizedBox(height: 32),
                Center(
                  child: TextButton(
                    onPressed: () => context.pop(),
                    child: RichText(
                      text: const TextSpan(
                        style: TextStyle(fontSize: 14, color: AppColors.slate500),
                        children: [
                          TextSpan(text: 'Already have an account? '),
                          TextSpan(
                            text: 'Sign in',
                            style: TextStyle(color: AppColors.orange500, fontWeight: FontWeight.w700),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildTextField({
    required TextEditingController controller,
    required String label,
    bool obscureText = false,
    TextInputType? keyboardType,
    Widget? suffixIcon,
    String? helperText,
    String? hintText,
    int? helperMaxLines,
    String? Function(String?)? validator,
    void Function(String)? onSubmitted,
  }) {
    return TextFormField(
      controller: controller,
      obscureText: obscureText,
      keyboardType: keyboardType,
      validator: validator,
      onFieldSubmitted: onSubmitted,
      style: const TextStyle(color: AppColors.slate900),
      decoration: InputDecoration(
        labelText: label,
        labelStyle: const TextStyle(color: AppColors.slate500),
        hintText: hintText,
        hintStyle: const TextStyle(color: AppColors.slate400),
        helperText: helperText,
        helperStyle: const TextStyle(color: AppColors.slate500),
        helperMaxLines: helperMaxLines,
        suffixIcon: suffixIcon,
        filled: true,
        fillColor: Colors.white,
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppColors.slate200)),
        enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppColors.slate200)),
        focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppColors.orange500)),
        errorBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppColors.danger)),
      ),
    );
  }
}
