import 'package:flutter/material.dart';

import '../../core/theme/app_colors.dart';

/// A primary button that swaps its label for a spinner while [isLoading],
/// and disables itself during that time and whenever [onPressed] is null —
/// the same disabled/pending pattern used by every submit button in both
/// web portals.
class LoadingButton extends StatelessWidget {
  const LoadingButton({
    super.key,
    required this.label,
    required this.onPressed,
    this.isLoading = false,
    this.outlined = false,
    this.gradient = false,
  });

  final String label;
  final VoidCallback? onPressed;
  final bool isLoading;
  final bool outlined;

  /// Renders the orange hero gradient both web portals use for their auth
  /// CTAs, instead of the flat in-app primary color. Use this only on the
  /// splash → onboarding → login/register/OTP journey — everywhere else in
  /// the app mirrors the portals' dashboards, which stay on `primary` (blue).
  final bool gradient;

  @override
  Widget build(BuildContext context) {
    final child = isLoading
        ? SizedBox(
            width: 20,
            height: 20,
            child: CircularProgressIndicator(
              strokeWidth: 2.2,
              valueColor: AlwaysStoppedAnimation(
                outlined ? Theme.of(context).colorScheme.primary : Colors.white,
              ),
            ),
          )
        : Text(label);

    final handler = isLoading ? null : onPressed;

    if (outlined) {
      return OutlinedButton(onPressed: handler, child: child);
    }

    if (gradient) {
      final disabled = handler == null;
      return Opacity(
        opacity: disabled ? 0.5 : 1,
        child: Container(
          height: 48,
          decoration: BoxDecoration(
            gradient: const LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: AppColors.authGradient,
            ),
            borderRadius: BorderRadius.circular(12),
            boxShadow: [
              BoxShadow(color: AppColors.orange500.withValues(alpha: 0.35), blurRadius: 16, offset: const Offset(0, 6)),
            ],
          ),
          child: Material(
            color: Colors.transparent,
            child: InkWell(
              borderRadius: BorderRadius.circular(12),
              onTap: handler,
              child: Center(
                child: DefaultTextStyle.merge(
                  style: const TextStyle(color: Colors.white, fontSize: 15, fontWeight: FontWeight.w600),
                  child: IconTheme.merge(data: const IconThemeData(color: Colors.white), child: child),
                ),
              ),
            ),
          ),
        ),
      );
    }

    return ElevatedButton(onPressed: handler, child: child);
  }
}
