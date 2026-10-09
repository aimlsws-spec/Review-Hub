import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../shared/widgets/app_badge.dart';
import '../../data/models/campaign_model.dart';

/// Fixed-width card for a horizontal campaign carousel (e.g. Home's
/// "Popular Campaigns" row) — a denser alternative to [CampaignCard]'s
/// full-width list-row layout. Needs a bounded height: the picture fills what the text leaves.
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
              // The picture takes whatever height the row leaves after the text, so a large system text size
              // shrinks the picture instead of pushing the text out of the card.
              Expanded(
                child: campaign.thumbnailImageUrl != null
                    ? CachedNetworkImage(
                        imageUrl: campaign.thumbnailImageUrl!,
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
      width: double.infinity,
      color: AppColors.primary50,
      child: const Icon(Icons.campaign_outlined, color: AppColors.primary400),
    );
  }
}
