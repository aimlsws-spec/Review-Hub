import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:viral_kar/core/errors/result.dart';
import 'package:viral_kar/features/notifications/data/models/notification_model.dart';
import 'package:viral_kar/features/notifications/data/notification_repository.dart';
import 'package:viral_kar/features/notifications/presentation/screens/notifications_screen.dart';
import 'package:viral_kar/features/notifications/providers/notification_providers.dart';

import 'package:viral_kar/shared/models/api_response.dart';

class _FakeNotificationRepository extends Fake implements NotificationRepository {
  List<NotificationModel> notifications = [
    NotificationModel(
      id: 'notif-1',
      userId: 'user-1',
      title: 'Test Notification',
      message: 'This is a test',
      type: 'INFO',
      channel: 'IN_APP',
      status: 'SENT',
      createdAt: DateTime(2026, 10, 3, 12, 0),
      updatedAt: DateTime(2026, 10, 3, 12, 0),
      readAt: null,
    ),
  ];

  String? lastEngagedId;
  NotificationEngagement? lastEngagementType;

  String? lastMarkedReadId;

  @override
  Future<Result<PaginatedResponse<NotificationModel>>> listMine({int page = 1, int limit = 20, bool? unreadOnly}) async {
    return Result.success(
      PaginatedResponse(
        items: notifications,
        total: notifications.length,
        page: page,
        limit: limit,
      ),
    );
  }

  @override
  Future<Result<void>> recordEngagement(String id, NotificationEngagement type) async {
    lastEngagedId = id;
    lastEngagementType = type;
    return const Result.success(null);
  }

  @override
  Future<Result<NotificationModel>> markRead(String id) async {
    lastMarkedReadId = id;
    return Result.success(notifications.first);
  }
}

void main() {
  test('NotificationEngagement.clicked has correct apiValue', () {
    expect(NotificationEngagement.clicked.apiValue, 'CLICKED');
    expect(NotificationEngagement.opened.apiValue, 'OPENED');
  });

  testWidgets('tapping a tile calls recordEngagement(id, opened)', (tester) async {
    final repository = _FakeNotificationRepository();

    await tester.pumpWidget(
      ProviderScope(
        overrides: [notificationRepositoryProvider.overrideWithValue(repository)],
        child: const MaterialApp(home: NotificationsScreen()),
      ),
    );

    // Wait for the FutureProvider to resolve
    await tester.pumpAndSettle();

    expect(find.text('Test Notification'), findsOneWidget);

    // Tap the notification tile
    await tester.tap(find.text('Test Notification'));
    await tester.pumpAndSettle();

    expect(repository.lastEngagedId, 'notif-1');
    expect(repository.lastEngagementType, NotificationEngagement.opened);
    expect(repository.lastMarkedReadId, 'notif-1');
  });
}
