import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:viral_kar/core/errors/failure.dart';
import 'package:viral_kar/core/errors/result.dart';
import 'package:viral_kar/core/location/location_coordinates.dart';
import 'package:viral_kar/core/location/location_providers.dart';
import 'package:viral_kar/core/location/location_service.dart';
import 'package:viral_kar/features/campaigns/data/campaign_repository.dart';
import 'package:viral_kar/features/campaigns/data/models/campaign_browse.dart';
import 'package:viral_kar/features/campaigns/data/models/campaign_model.dart';
import 'package:viral_kar/features/campaigns/presentation/widgets/campaign_card.dart';
import 'package:viral_kar/features/campaigns/providers/campaign_providers.dart';
import 'package:viral_kar/shared/models/api_response.dart';

CampaignModel _campaign(String id, {double? distanceMeters}) => CampaignModel(
  id: id,
  title: 'Campaign $id',
  slug: id,
  description: 'Tell us honestly how your visit went.',
  campaignType: 'REVIEW',
  status: 'ACTIVE',
  rewardType: 'CASH',
  rewardAmount: '40.00',
  distanceMeters: distanceMeters,
);

/// Stands in for the phone's GPS, and counts how often the app asked for it.
class _FakeLocationService implements LocationService {
  _FakeLocationService(this.answer);

  Result<LocationCoordinates> answer;
  int asked = 0;

  @override
  Future<Result<LocationCoordinates>> getCurrentLocation() async {
    asked++;
    return answer;
  }

  @override
  Future<bool> requestPermission() async {
    asked++;
    return answer.isSuccess;
  }
}

/// Stands in for the server and records how each page was asked for.
class _FakeCampaignRepository extends Fake implements CampaignRepository {
  final List<({String sort, double? latitude, double? longitude})> browses = [];

  @override
  Future<Result<PaginatedResponse<CampaignModel>>> browsePublic({
    int page = 1,
    int limit = 20,
    String? campaignType,
    String? search,
    String sort = 'featured',
    double? latitude,
    double? longitude,
  }) async {
    browses.add((sort: sort, latitude: latitude, longitude: longitude));
    return Result.success(PaginatedResponse(items: [_campaign('c1')], total: 1, page: page, limit: limit));
  }
}

void main() {
  const ahmedabad = LocationCoordinates(latitude: 23.0225, longitude: 72.5714);

  late _FakeLocationService location;
  late _FakeCampaignRepository repository;
  late ProviderContainer container;

  ProviderContainer makeContainer() => ProviderContainer(
    overrides: [
      locationServiceProvider.overrideWithValue(location),
      campaignRepositoryProvider.overrideWithValue(repository),
    ],
  );

  setUp(() {
    location = _FakeLocationService(const Result.success(ahmedabad));
    repository = _FakeCampaignRepository();
    container = makeContainer();
    // Keep the screen-scoped providers alive for the test, as an open Tasks tab would.
    container.listen(campaignBrowseFilterProvider, (_, _) {});
    container.listen(browseCampaignsProvider, (_, _) {});
  });

  tearDown(() => container.dispose());

  test('opening the campaign list never asks for location', () async {
    await container.read(browseCampaignsProvider.future);

    expect(location.asked, 0);
    expect(repository.browses.single, (sort: 'featured', latitude: null, longitude: null));
  });

  test('choosing Nearest asks for location then, and sorts by distance from the phone', () async {
    await container.read(browseCampaignsProvider.future);

    final failure = await container.read(campaignBrowseFilterProvider.notifier).sortByNearest();
    await container.read(browseCampaignsProvider.future);

    expect(failure, isNull);
    expect(location.asked, 1);
    expect(container.read(campaignBrowseFilterProvider).sort, CampaignSort.nearest);
    expect(repository.browses.last, (sort: 'nearest', latitude: 23.0225, longitude: 72.5714));
  });

  test('keeps the current order and says why when location is refused', () async {
    location.answer = const Result.failure(LocationPermissionDeniedFailure());
    await container.read(browseCampaignsProvider.future);

    final failure = await container.read(campaignBrowseFilterProvider.notifier).sortByNearest();

    expect(failure, isA<LocationPermissionDeniedFailure>());
    expect(container.read(campaignBrowseFilterProvider).sort, CampaignSort.featured);
    expect(repository.browses.map((browse) => browse.sort), isNot(contains('nearest')));
  });

  test('says so when location is turned off on the phone', () async {
    location.answer = const Result.failure(LocationServiceDisabledFailure());

    final failure = await container.read(campaignBrowseFilterProvider.notifier).sortByNearest();

    expect(failure, isA<LocationServiceDisabledFailure>());
    expect(container.read(campaignBrowseFilterProvider).sort, CampaignSort.featured);
  });

  test('switching to another sort stops sending the location', () async {
    final notifier = container.read(campaignBrowseFilterProvider.notifier);
    await notifier.sortByNearest();
    await container.read(browseCampaignsProvider.future);

    notifier.setSort(CampaignSort.newest);
    await container.read(browseCampaignsProvider.future);

    expect(container.read(campaignBrowseFilterProvider).near, isNull);
    expect(repository.browses.last, (sort: 'newest', latitude: null, longitude: null));
  });

  group('distance on the card', () {
    test('is shown in metres nearby and kilometres further away', () {
      expect(_campaign('a', distanceMeters: 348).distanceLabel, '350 m away');
      expect(_campaign('b', distanceMeters: 4230).distanceLabel, '4.2 km away');
      expect(_campaign('c', distanceMeters: 18600).distanceLabel, '19 km away');
    });

    test('is left out for a store with no location, which is listed last', () {
      expect(_campaign('d').distanceLabel, isNull);
    });

    testWidgets('appears as a badge on the campaign card', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: CampaignCard(campaign: _campaign('a', distanceMeters: 1240), onTap: () {}),
          ),
        ),
      );
      expect(find.text('1.2 km away'), findsOneWidget);
    });
  });
}
