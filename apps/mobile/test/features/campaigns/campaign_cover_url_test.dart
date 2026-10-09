import 'package:flutter_test/flutter_test.dart';
import 'package:viral_kar/features/campaigns/data/models/campaign_model.dart';
import 'package:viral_kar/features/tasks/data/models/recommended_task_model.dart';

CampaignModel _campaign({String? thumbnailUrl, String? bannerUrl}) => CampaignModel(
  id: 'campaign-1',
  title: 'Weekend Feedback',
  slug: 'weekend-feedback',
  description: 'Share your honest experience.',
  campaignType: 'REVIEW',
  status: 'ACTIVE',
  rewardType: 'CASH',
  rewardAmount: '40.00',
  thumbnailUrl: thumbnailUrl,
  bannerUrl: bannerUrl,
);

void main() {
  group('campaign cover image', () {
    test('turns the uploaded path the API returns into an address the app can load', () {
      final campaign = _campaign(thumbnailUrl: '/campaign/3f2a.jpg', bannerUrl: '/campaign/3f2a.jpg');

      expect(campaign.thumbnailImageUrl, endsWith('/uploads/campaign/3f2a.jpg'));
      expect(campaign.thumbnailImageUrl, startsWith('http'));
      expect(campaign.bannerImageUrl, campaign.thumbnailImageUrl);
    });

    test('keeps a full address as it is', () {
      expect(
        _campaign(thumbnailUrl: 'https://cdn.example.com/cafe.jpg').thumbnailImageUrl,
        'https://cdn.example.com/cafe.jpg',
      );
    });

    test('is null when the campaign has no cover, so the card shows its placeholder', () {
      expect(_campaign().thumbnailImageUrl, isNull);
      expect(_campaign(thumbnailUrl: '').thumbnailImageUrl, isNull);
      expect(_campaign().bannerImageUrl, isNull);
    });

    test('works the same for a recommended task card', () {
      const task = RecommendedTaskModel(
        taskId: 'task-1',
        campaignId: 'campaign-1',
        title: 'Write about your visit',
        campaignTitle: 'Mango Cafe Feedback',
        thumbnailUrl: '/campaign/3f2a.jpg',
        rewardAmount: '50.00',
        minimumTimeSeconds: 60,
        isHighReward: false,
        isQuickTask: true,
      );
      expect(task.thumbnailImageUrl, endsWith('/uploads/campaign/3f2a.jpg'));
    });
  });
}
