import 'package:flutter/material.dart';

import '../../../../core/theme/app_colors.dart';
import '../../data/models/gamification_profile_model.dart';

/// A small pill with the tier's name, for the gamification card and anywhere else the tier is shown.
class TierBadge extends StatelessWidget {
  const TierBadge({super.key, required this.tier});

  final GamificationTier tier;

  @override
  Widget build(BuildContext context) {
    return Container(
      key: const Key('tierBadge'),
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(color: AppColors.white, borderRadius: BorderRadius.circular(20)),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.workspace_premium_rounded, size: 14, color: AppColors.orange500),
          const SizedBox(width: 4),
          Text(
            tier.label,
            style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: AppColors.navy900),
          ),
        ],
      ),
    );
  }
}
