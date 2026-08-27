import 'package:dio/dio.dart';

import '../../../core/constants/api_endpoints.dart';
import '../../../core/errors/result.dart';
import '../../../core/network/failure_mapper.dart';
import 'models/notification_preference_model.dart';

class SettingsRepository {
  SettingsRepository(this._dio);

  final Dio _dio;

  Future<Result<NotificationPreferenceModel>> getNotificationPreferences() async {
    try {
      final response = await _dio.get<Map<String, dynamic>>(ApiEndpoints.notificationPreferences);
      return Result.success(NotificationPreferenceModel.fromJson(response.data!['data'] as Map<String, dynamic>));
    } on DioException catch (e) {
      return Result.failure(mapDioExceptionToFailure(e));
    }
  }

  Future<Result<NotificationPreferenceModel>> updateNotificationPreferences({
    bool? emailEnabled,
    bool? smsEnabled,
    bool? pushEnabled,
    bool? inAppEnabled,
  }) async {
    try {
      final response = await _dio.patch<Map<String, dynamic>>(
        ApiEndpoints.notificationPreferences,
        data: {
          'emailEnabled': ?emailEnabled,
          'smsEnabled': ?smsEnabled,
          'pushEnabled': ?pushEnabled,
          'inAppEnabled': ?inAppEnabled,
        },
      );
      return Result.success(NotificationPreferenceModel.fromJson(response.data!['data'] as Map<String, dynamic>));
    } on DioException catch (e) {
      return Result.failure(mapDioExceptionToFailure(e));
    }
  }
}
