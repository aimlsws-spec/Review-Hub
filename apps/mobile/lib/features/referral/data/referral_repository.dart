import 'package:dio/dio.dart';

import '../../../core/constants/api_endpoints.dart';
import '../../../core/errors/result.dart';
import '../../../core/network/failure_mapper.dart';
import '../../../shared/models/api_response.dart';
import 'models/referral_model.dart';

class ReferralRepository {
  ReferralRepository(this._dio);

  final Dio _dio;

  Future<Result<PaginatedResponse<ReferralModel>>> listMine({int page = 1, int limit = 20}) async {
    try {
      final response = await _dio.get<Map<String, dynamic>>(
        ApiEndpoints.referralMe,
        queryParameters: {'page': page, 'limit': limit},
      );
      final data = response.data!['data'] as Map<String, dynamic>;
      return Result.success(
        PaginatedResponse.fromJson(data, (json) => ReferralModel.fromJson(json as Map<String, dynamic>)),
      );
    } on DioException catch (e) {
      return Result.failure(mapDioExceptionToFailure(e));
    }
  }

  Future<Result<ReferralStatsModel>> getStats() async {
    try {
      final response = await _dio.get<Map<String, dynamic>>(ApiEndpoints.referralStats);
      return Result.success(ReferralStatsModel.fromJson(response.data!['data'] as Map<String, dynamic>));
    } on DioException catch (e) {
      return Result.failure(mapDioExceptionToFailure(e));
    }
  }
}
