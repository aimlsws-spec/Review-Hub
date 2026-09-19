import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../shared/widgets/app_badge.dart';
import '../../data/models/campaign_model.dart';

/// Fixed-width card for a horizontal campaign carousel (e.g. Home's
/// "Popular Campaigns" row) — a denser alternative to [CampaignCard]'s
/// full-width list-row layout.
class CampaignCardCompact extends StatelessWidget {
  const CampaignCardCompact({super.key, required this.campaign, required this.onTap});

  final CampaignModel campaign;
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
              ClipRRect(
                child: campaign.thumbnailUrl != null
                    ? CachedNetworkImage(
                        imageUrl: campaign.thumbnailUrl!,
                        width: 160,
                        height: 90,
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
                      campaign.title,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: AppColors.slate900),
                    ),
                    const SizedBox(height: 6),
                    AppBadge(label: '₹${campaign.rewardAmountValue.toStringAsFixed(0)}', variant: BadgeVariant.green),
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
      width: 160,
      height: 90,
      color: AppColors.primary50,
      child: const Icon(Icons.campaign_outlined, color: AppColors.primary400),
    );
  }
}
