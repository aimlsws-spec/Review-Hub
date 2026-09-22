import 'package:dio/dio.dart';

import '../../../core/constants/api_endpoints.dart';
import '../../../core/errors/result.dart';
import '../../../core/network/failure_mapper.dart';
import 'models/leaderboard_models.dart';

class LeaderboardRepository {
  LeaderboardRepository(this._dio);

  final Dio _dio;

  Future<Result<LeaderboardModel>> load(LeaderboardPeriod period, {int limit = 20}) async {
    try {
      final response = await _dio.get<Map<String, dynamic>>(
        ApiEndpoints.leaderboard,
        queryParameters: {'period': period.apiValue, 'limit': limit},
      );
      return Result.success(LeaderboardModel.fromJson(response.data!['data'] as Map<String, dynamic>));
    } on DioException catch (e) {
      return Result.failure(mapDioExceptionToFailure(e));
    }
  }

  /// Shows the person on the leaderboard, or keeps them off it. Returns whether they are now visible.
  Future<Result<bool>> setVisibility({required bool visible}) async {
    try {
      final response = await _dio.patch<Map<String, dynamic>>(
        ApiEndpoints.leaderboardVisibility,
        data: {'visible': visible},
      );
      final data = response.data!['data'] as Map<String, dynamic>;
      return Result.success(data['visible'] != false);
    } on DioException catch (e) {
      return Result.failure(mapDioExceptionToFailure(e));
    }
  }
}
