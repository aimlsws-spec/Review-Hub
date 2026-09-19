import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_riverpod/legacy.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/router/route_paths.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../shared/widgets/loading_button.dart';
import '../../providers/auth_providers.dart';

final _obscurePasswordProvider = StateProvider.autoDispose<bool>((ref) => true);
final _rememberMeProvider = StateProvider.autoDispose<bool>((ref) => false);

final _loginSubmitProvider = AsyncNotifierProvider.autoDispose<_LoginSubmitNotifier, void>(_LoginSubmitNotifier.new);

class _LoginSubmitNotifier extends AsyncNotifier<void> {
  @override
  Future<void> build() async {}

  /// Returns true on success. Errors are surfaced via `state` rather than a
  /// thrown exception, so the screen just watches this provider.
  Future<bool> submit({required String identifier, required String password, required bool rememberMe}) async {
    state = const AsyncLoading();
    final isEmail = identifier.contains('@');
    final result = await ref.read(authStateProvider.notifier).login(
          email: isEmail ? identifier : null,
          phone: isEmail ? null : identifier,
          password: password,
          rememberMe: rememberMe,
        );
    if (result.isFailure) {
      state = AsyncError(result.failureOrNull?.message ?? 'Something went wrong.', StackTrace.current);
      return false;
    }
    state = const AsyncData(null);
    return true;
  }
}

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _identifierController = TextEditingController();
  final _passwordController = TextEditingController();

  @override
  void dispose() {
    _identifierController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    final success = await ref.read(_loginSubmitProvider.notifier).submit(
          identifier: _identifierController.text.trim(),
          password: _passwordController.text,
          rememberMe: ref.read(_rememberMeProvider),
        );
    if (!mounted || !success) return;
    context.go(RoutePaths.home);
  }

  @override
  Widget build(BuildContext context) {
    final submitState = ref.watch(_loginSubmitProvider);
    final obscurePassword = ref.watch(_obscurePasswordProvider);
    final rememberMe = ref.watch(_rememberMeProvider);
    final errorMessage = submitState.hasError ? submitState.error.toString() : null;

    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 32),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                SizedBox(
                  height: 40,
                  child: SvgPicture.asset('assets/images/viralkar_logo.svg'),
                ),
                const SizedBox(height: 24),
                const Text(
                  'Welcome back',
                  style: TextStyle(fontSize: 26, fontWeight: FontWeight.w800, color: AppColors.slate900),
                ),
                const SizedBox(height: 6),
                const Text(
                  'Sign in to continue earning rewards.',
                  style: TextStyle(fontSize: 14.5, color: AppColors.slate500),
                ),
                const SizedBox(height: 32),
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
                _buildTextField(
                  controller: _identifierController,
                  label: 'Email or phone number',
                  keyboardType: TextInputType.emailAddress,
                  validator: (value) => (value == null || value.trim().isEmpty) ? 'Enter your email or phone number' : null,
                ),
                const SizedBox(height: 16),
                _buildTextField(
                  controller: _passwordController,
                  label: 'Password',
                  obscureText: obscurePassword,
                  suffixIcon: IconButton(
                    icon: Icon(obscurePassword ? Icons.visibility_outlined : Icons.visibility_off_outlined, color: AppColors.slate500),
                    onPressed: () => ref.read(_obscurePasswordProvider.notifier).state = !obscurePassword,
                  ),
                  validator: (value) => (value == null || value.isEmpty) ? 'Enter your password' : null,
                  onSubmitted: (_) => _submit(),
                ),
                const SizedBox(height: 12),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      children: [
                        SizedBox(
                          width: 24,
                          height: 24,
                          child: Checkbox(
                            value: rememberMe,
                            onChanged: (v) => ref.read(_rememberMeProvider.notifier).state = v ?? false,
                            activeColor: AppColors.orange500,
                            side: const BorderSide(color: AppColors.slate300),
                          ),
                        ),
                        const SizedBox(width: 8),
                        const Text('Remember me', style: TextStyle(fontSize: 13.5, color: AppColors.slate600)),
                      ],
                    ),
                    TextButton(
                      onPressed: () => context.push(RoutePaths.forgotPassword),
                      style: TextButton.styleFrom(foregroundColor: AppColors.orange500),
                      child: const Text('Forgot password?'),
                    ),
                  ],
                ),
                const SizedBox(height: 32),
                LoadingButton(
                  label: 'Sign in',
                  isLoading: submitState.isLoading,
                  gradient: true,
                  onPressed: _submit,
                ),
                const SizedBox(height: 24),
                Center(
                  child: TextButton(
                    onPressed: () => context.push(RoutePaths.register),
                    child: RichText(
                      text: const TextSpan(
                        style: TextStyle(fontSize: 14, color: AppColors.slate500),
                        children: [
                          TextSpan(text: "Don't have an account? "),
                          TextSpan(
                            text: 'Sign up',
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
        suffixIcon: suffixIcon,
        filled: true,
        fillColor: Colors.white,
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 18),
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppColors.slate200)),
        enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppColors.slate200)),
        focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppColors.orange500)),
        errorBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppColors.danger)),
      ),
    );
  }
}
