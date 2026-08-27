import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../shared/widgets/app_badge.dart';
import '../../data/models/campaign_model.dart';

class CampaignCard extends StatelessWidget {
  const CampaignCard({super.key, required this.campaign, required this.onTap});

  final CampaignModel campaign;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              ClipRRect(
                borderRadius: BorderRadius.circular(10),
                child: campaign.thumbnailUrl != null
                    ? CachedNetworkImage(
                        imageUrl: campaign.thumbnailUrl!,
                        width: 64,
                        height: 64,
                        fit: BoxFit.cover,
                        errorWidget: (context, url, error) => _fallbackThumb(),
                      )
                    : _fallbackThumb(),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            campaign.title,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(fontSize: 14.5, fontWeight: FontWeight.w700, color: AppColors.slate900),
                          ),
                        ),
                        if (campaign.featured) ...[
                          const SizedBox(width: 6),
                          const Icon(Icons.star_rounded, size: 16, color: Color(0xFFF59E0B)),
                        ],
                      ],
                    ),
                    if (campaign.shortDescription != null) ...[
                      const SizedBox(height: 3),
                      Text(
                        campaign.shortDescription!,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(fontSize: 12.5, color: AppColors.slate500, height: 1.3),
                      ),
                    ],
                    const SizedBox(height: 8),
                    Wrap(
                      spacing: 6,
                      runSpacing: 4,
                      children: [
                        AppBadge(label: '₹${campaign.rewardAmountValue.toStringAsFixed(0)} reward', variant: BadgeVariant.green),
                        if (campaign.isEndingSoon)
                          const AppBadge(label: 'Ending soon', variant: BadgeVariant.yellow),
                        if (campaign.isFull)
                          const AppBadge(label: 'Full', variant: BadgeVariant.gray),
                      ],
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
      width: 64,
      height: 64,
      color: AppColors.primary50,
      child: const Icon(Icons.campaign_outlined, color: AppColors.primary400),
    );
  }
}
