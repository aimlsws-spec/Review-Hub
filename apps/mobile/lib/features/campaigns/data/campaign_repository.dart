import 'package:dio/dio.dart';

import '../../../core/constants/api_endpoints.dart';
import '../../../core/errors/result.dart';
import '../../../core/network/failure_mapper.dart';
import '../../../shared/models/api_response.dart';
import 'models/campaign_model.dart';
import 'models/campaign_task_model.dart';

class CampaignRepository {
  CampaignRepository(this._dio);

  final Dio _dio;

  Future<Result<PaginatedResponse<CampaignModel>>> browsePublic({
    int page = 1,
    int limit = 20,
    String? campaignType,
    String? search,
  }) async {
    try {
      final response = await _dio.get<Map<String, dynamic>>(
        ApiEndpoints.campaignsBrowse,
        queryParameters: {
          'page': page,
          'limit': limit,
          'campaignType': ?campaignType,
          if (search != null && search.isNotEmpty) 'search': search,
        },
      );
      final data = response.data!['data'] as Map<String, dynamic>;
      return Result.success(
        PaginatedResponse.fromJson(data, (json) => CampaignModel.fromJson(json as Map<String, dynamic>)),
      );
    } on DioException catch (e) {
      return Result.failure(mapDioExceptionToFailure(e));
    }
  }

  Future<Result<List<CampaignTaskModel>>> getTasks(String campaignId) async {
    try {
      final response = await _dio.get<Map<String, dynamic>>(ApiEndpoints.campaignTasks(campaignId));
      final rawList = response.data!['data'] as List<dynamic>;
      return Result.success(
        rawList.map((json) => CampaignTaskModel.fromJson(json as Map<String, dynamic>)).toList(),
      );
    } on DioException catch (e) {
      return Result.failure(mapDioExceptionToFailure(e));
    }
  }
}
