import 'package:flutter/material.dart';

import '../../../../core/theme/app_colors.dart';

/// Shown on review tasks. Says plainly that the reward never depends on the rating or on what the review says,
/// so nobody feels pushed to write something they do not mean.
class HonestFeedbackNotice extends StatelessWidget {
  const HonestFeedbackNotice({super.key});

  static const String message =
      'Write what you really think, good or bad. Your reward never depends on your rating or on what your review says.';

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(color: AppColors.successBg, borderRadius: BorderRadius.circular(10)),
      child: const Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(Icons.verified_outlined, size: 18, color: AppColors.success),
          SizedBox(width: 8),
          Expanded(
            child: Text(message, style: TextStyle(fontSize: 13, color: AppColors.slate700, height: 1.4)),
          ),
        ],
      ),
    );
  }
}
