import 'package:dio/dio.dart';

import '../../../core/constants/api_endpoints.dart';
import '../../../core/errors/result.dart';
import '../../../core/network/failure_mapper.dart';
import '../../../shared/models/api_response.dart';
import 'models/campaign_model.dart';
import 'models/campaign_progress_model.dart';
import 'models/campaign_task_model.dart';

class CampaignRepository {
  CampaignRepository(this._dio);

  final Dio _dio;

  Future<Result<PaginatedResponse<CampaignModel>>> browsePublic({
    int page = 1,
    int limit = 20,
    String? campaignType,
    String? search,
    String sort = 'featured',
    double? latitude,
    double? longitude,
  }) async {
    try {
      final response = await _dio.get<Map<String, dynamic>>(
        ApiEndpoints.campaignsBrowse,
        queryParameters: {
          'page': page,
          'limit': limit,
          'sort': sort,
          'campaignType': ?campaignType,
          if (search != null && search.isNotEmpty) 'search': search,
          'latitude': ?latitude,
          'longitude': ?longitude,
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

  /// One active, public campaign. The server answers "not found" for anything else, so a saved campaign that has
  /// ended comes back as a [NotFoundFailure].
  Future<Result<CampaignModel>> getPublicCampaign(String campaignId) async {
    try {
      final response = await _dio.get<Map<String, dynamic>>(ApiEndpoints.campaignDetails(campaignId));
      return Result.success(CampaignModel.fromJson(response.data!['data'] as Map<String, dynamic>));
    } on DioException catch (e) {
      return Result.failure(mapDioExceptionToFailure(e));
    }
  }

  /// The signed-in person's progress on each task of a campaign: what they can still do.
  Future<Result<CampaignProgressModel>> getProgress(String campaignId) async {
    try {
      final response = await _dio.get<Map<String, dynamic>>(ApiEndpoints.campaignProgress(campaignId));
      return Result.success(CampaignProgressModel.fromJson(response.data!['data'] as Map<String, dynamic>));
    } on DioException catch (e) {
      return Result.failure(mapDioExceptionToFailure(e));
    }
  }

  /// The campaigns the signed-in person joined, under way or completed.
  Future<Result<PaginatedResponse<JoinedCampaignModel>>> getJoinedCampaigns(
    JoinedCampaignFilter filter, {
    int page = 1,
    int limit = 20,
  }) async {
    try {
      final response = await _dio.get<Map<String, dynamic>>(
        ApiEndpoints.joinedCampaigns,
        queryParameters: {'status': filter.apiValue, 'page': page, 'limit': limit},
      );
      final data = response.data!['data'] as Map<String, dynamic>;
      return Result.success(
        PaginatedResponse.fromJson(data, (json) => JoinedCampaignModel.fromJson(json as Map<String, dynamic>)),
      );
    } on DioException catch (e) {
      return Result.failure(mapDioExceptionToFailure(e));
    }
  }

  Future<Result<List<CampaignTaskModel>>> getTasks(String campaignId) async {
    try {
      final response = await _dio.get<Map<String, dynamic>>(ApiEndpoints.campaignTasks(campaignId));
      final rawList = response.data!['data'] as List<dynamic>;
      return Result.success(rawList.map((json) => CampaignTaskModel.fromJson(json as Map<String, dynamic>)).toList());
    } on DioException catch (e) {
      return Result.failure(mapDioExceptionToFailure(e));
    }
  }
}
