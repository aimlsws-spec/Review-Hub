import 'package:dio/dio.dart';

import '../../../core/constants/api_endpoints.dart';
import '../../../core/errors/result.dart';
import '../../../core/network/failure_mapper.dart';
import 'models/badge_model.dart';
import 'models/daily_reward_result_model.dart';
import 'models/gamification_profile_model.dart';

class GamificationRepository {
  GamificationRepository(this._dio);

  final Dio _dio;

  Future<Result<GamificationProfileModel>> getProfile() async {
    try {
      final response = await _dio.get<Map<String, dynamic>>(ApiEndpoints.gamificationProfile);
      return Result.success(GamificationProfileModel.fromJson(response.data!['data'] as Map<String, dynamic>));
    } on DioException catch (e) {
      return Result.failure(mapDioExceptionToFailure(e));
    }
  }

  Future<Result<List<BadgeModel>>> getBadges() async {
    try {
      final response = await _dio.get<Map<String, dynamic>>(ApiEndpoints.gamificationBadges);
      final rawList = response.data!['data'] as List<dynamic>;
      return Result.success(rawList.map((json) => BadgeModel.fromJson(json as Map<String, dynamic>)).toList());
    } on DioException catch (e) {
      return Result.failure(mapDioExceptionToFailure(e));
    }
  }

  Future<Result<DailyRewardResultModel>> claimDailyReward() async {
    try {
      final response = await _dio.post<Map<String, dynamic>>(ApiEndpoints.dailyRewardClaim);
      return Result.success(DailyRewardResultModel.fromJson(response.data!['data'] as Map<String, dynamic>));
    } on DioException catch (e) {
      return Result.failure(mapDioExceptionToFailure(e));
    }
  }
}
