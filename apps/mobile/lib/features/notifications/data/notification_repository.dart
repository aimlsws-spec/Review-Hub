import 'package:dio/dio.dart';

import '../../../core/constants/api_endpoints.dart';
import '../../../core/errors/result.dart';
import '../../../core/network/failure_mapper.dart';
import '../../../shared/models/api_response.dart';
import 'models/notification_model.dart';

class NotificationRepository {
  NotificationRepository(this._dio);

  final Dio _dio;

  Future<Result<PaginatedResponse<NotificationModel>>> listMine({
    int page = 1,
    int limit = 20,
    bool? unreadOnly,
  }) async {
    try {
      final response = await _dio.get<Map<String, dynamic>>(
        ApiEndpoints.notifications,
        queryParameters: {'page': page, 'limit': limit, 'unreadOnly': ?unreadOnly},
      );
      final data = response.data!['data'] as Map<String, dynamic>;
      return Result.success(
        PaginatedResponse.fromJson(data, (json) => NotificationModel.fromJson(json as Map<String, dynamic>)),
      );
    } on DioException catch (e) {
      return Result.failure(mapDioExceptionToFailure(e));
    }
  }

  Future<Result<int>> getUnreadCount() async {
    try {
      final response = await _dio.get<Map<String, dynamic>>(ApiEndpoints.notificationUnreadCount);
      final data = response.data!['data'] as Map<String, dynamic>;
      return Result.success(data['count'] as int? ?? 0);
    } on DioException catch (e) {
      return Result.failure(mapDioExceptionToFailure(e));
    }
  }

  Future<Result<NotificationModel>> markRead(String notificationId) async {
    try {
      final response = await _dio.post<Map<String, dynamic>>(ApiEndpoints.notificationRead(notificationId));
      return Result.success(NotificationModel.fromJson(response.data!['data'] as Map<String, dynamic>));
    } on DioException catch (e) {
      return Result.failure(mapDioExceptionToFailure(e));
    }
  }

  /// Tells the server the person opened ([NotificationEngagement.opened]) or clicked through
  /// ([NotificationEngagement.clicked]) a notification, for open and click rates. Only the first of each counts.
  Future<Result<void>> recordEngagement(String notificationId, NotificationEngagement action) async {
    try {
      await _dio.post<void>(ApiEndpoints.notificationEngagement(notificationId), data: {'action': action.apiValue});
      return const Result.success(null);
    } on DioException catch (e) {
      return Result.failure(mapDioExceptionToFailure(e));
    }
  }

  Future<Result<int>> markAllRead() async {
    try {
      final response = await _dio.post<Map<String, dynamic>>(ApiEndpoints.notificationReadAll);
      final data = response.data!['data'] as Map<String, dynamic>;
      return Result.success(data['updated'] as int? ?? 0);
    } on DioException catch (e) {
      return Result.failure(mapDioExceptionToFailure(e));
    }
  }
}

/// What the person did with a notification: tapped it, or followed it on to what it links to.
enum NotificationEngagement {
  opened('OPENED'),
  clicked('CLICKED');

  const NotificationEngagement(this.apiValue);

  final String apiValue;
}
