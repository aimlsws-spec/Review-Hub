import 'package:flutter/material.dart';

import '../../core/theme/app_colors.dart';

enum BadgeVariant { green, yellow, red, blue, gray, purple }

/// Mirrors `shared-ui`'s `Badge`/`StatusBadge` components — same variant
/// names, same semantic status → color mapping, so a status reads
/// identically across the mobile app and both web portals.
class AppBadge extends StatelessWidget {
  const AppBadge({super.key, required this.label, this.variant = BadgeVariant.gray});

  factory AppBadge.forStatus(String status) {
    return AppBadge(label: _humanize(status), variant: _variantForStatus(status));
  }

  final String label;
  final BadgeVariant variant;

  static String _humanize(String status) => status.replaceAll('_', ' ');

  static BadgeVariant _variantForStatus(String status) {
    const green = {
      'ACTIVE', 'APPROVED', 'VERIFIED', 'SUCCESS', 'COMPLETED', 'PAID', 'CREDITED', 'RESOLVED', 'PUBLISHED',
    };
    const yellow = {
      'PENDING', 'PENDING_VERIFICATION', 'PENDING_REVIEW', 'PENDING_MANUAL', 'UNDER_REVIEW',
      'AI_PROCESSING', 'PROCESSING', 'MEDIUM', 'CHANGES_REQUESTED', 'ASSIGNED', 'IN_PROGRESS',
      'REQUIRES_RESUBMISSION',
    };
    const blue = {'SCHEDULED', 'OPEN'};
    const red = {'SUSPENDED', 'REJECTED', 'FAILED', 'BANNED', 'CRITICAL', 'HIGH'};
    const purple = {'WAITING_USER'};

    if (green.contains(status)) return BadgeVariant.green;
    if (yellow.contains(status)) return BadgeVariant.yellow;
    if (blue.contains(status)) return BadgeVariant.blue;
    if (red.contains(status)) return BadgeVariant.red;
    if (purple.contains(status)) return BadgeVariant.purple;
    return BadgeVariant.gray;
  }

  ({Color bg, Color fg}) get _colors => switch (variant) {
        BadgeVariant.green => (bg: const Color(0xFFDCFCE7), fg: const Color(0xFF15803D)),
        BadgeVariant.yellow => (bg: const Color(0xFFFEF9C3), fg: const Color(0xFFA16207)),
        BadgeVariant.red => (bg: const Color(0xFFFEE2E2), fg: const Color(0xFFB91C1C)),
        BadgeVariant.blue => (bg: AppColors.primary100, fg: AppColors.primary700),
        BadgeVariant.purple => (bg: const Color(0xFFF3E8FF), fg: const Color(0xFF7E22CE)),
        BadgeVariant.gray => (bg: AppColors.slate100, fg: AppColors.slate600),
      };

  @override
  Widget build(BuildContext context) {
    final colors = _colors;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(color: colors.bg, borderRadius: BorderRadius.circular(999)),
      child: Text(
        label,
        style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: colors.fg),
      ),
    );
  }
}
