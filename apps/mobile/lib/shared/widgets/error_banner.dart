import 'package:flutter/material.dart';

import '../../core/theme/app_colors.dart';

/// The red message box shown above a form when a request failed.
class ErrorBanner extends StatelessWidget {
  const ErrorBanner(this.message, {super.key});

  final String message;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(color: AppColors.dangerBg, borderRadius: BorderRadius.circular(10)),
      child: Text(message, style: const TextStyle(color: AppColors.danger, fontSize: 13)),
    );
  }
}
