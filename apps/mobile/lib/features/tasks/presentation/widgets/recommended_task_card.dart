import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../shared/widgets/app_badge.dart';
import '../../data/models/recommended_task_model.dart';

/// Fixed-width card for Home's "✨ AI Recommended for you" carousel — same
/// shape as `CampaignCardCompact`, plus reward/time metadata and a
/// "High Reward" badge when the task clears [RecommendedTaskModel.isHighReward]. Needs a bounded height: the
/// picture fills what the text leaves.
class RecommendedTaskCard extends StatelessWidget {
  const RecommendedTaskCard({super.key, required this.task, required this.onTap});

  final RecommendedTaskModel task;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 160,
      child: Card(
        margin: EdgeInsets.zero,
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: onTap,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // The picture takes whatever height the row leaves after the text, so a large system text size
              // shrinks the picture instead of pushing the text out of the card.
              Expanded(
                child: task.thumbnailImageUrl != null
                    ? CachedNetworkImage(
                        imageUrl: task.thumbnailImageUrl!,
                        width: double.infinity,
                        fit: BoxFit.cover,
                        errorWidget: (context, url, error) => _fallbackThumb(),
                      )
                    : _fallbackThumb(),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(10, 8, 10, 10),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      task.title,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: AppColors.slate900),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      task.campaignTitle,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(fontSize: 11, color: AppColors.slate500),
                    ),
                    const SizedBox(height: 6),
                    // One line only: a second line of badges would not fit the card's height. With large system text
                    // the line is shrunk to the card's width rather than running past its edge.
                    FittedBox(
                      fit: BoxFit.scaleDown,
                      alignment: Alignment.centerLeft,
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          AppBadge(
                            label: '₹${task.rewardAmountValue.toStringAsFixed(0)}',
                            variant: BadgeVariant.green,
                          ),
                          if (task.isHighReward) ...[
                            const SizedBox(width: 5),
                            const AppBadge(label: 'High Reward', variant: BadgeVariant.purple),
                          ],
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _fallbackThumb() {
    return Container(
      width: double.infinity,
      color: AppColors.brand500.withValues(alpha: 0.08),
      child: const Icon(Icons.auto_awesome_rounded, color: AppColors.brand500),
    );
  }
}
