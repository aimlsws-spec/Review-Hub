import 'package:dio/dio.dart';

import '../../../core/constants/api_endpoints.dart';
import '../../../core/errors/result.dart';
import '../../../core/network/failure_mapper.dart';
import '../../../shared/models/api_response.dart';
import 'models/marketplace_item_model.dart';
import 'models/redemption_model.dart';

class MarketplaceRepository {
  MarketplaceRepository(this._dio);

  final Dio _dio;

  Future<Result<PaginatedResponse<MarketplaceItemModel>>> getItems({
    int page = 1,
    int limit = 20,
    String? category,
  }) async {
    try {
      final response = await _dio.get<Map<String, dynamic>>(
        ApiEndpoints.marketplaceItems,
        queryParameters: {'page': page, 'limit': limit, 'category': ?category},
      );
      final data = response.data!['data'] as Map<String, dynamic>;
      return Result.success(
        PaginatedResponse.fromJson(data, (json) => MarketplaceItemModel.fromJson(json as Map<String, dynamic>)),
      );
    } on DioException catch (e) {
      return Result.failure(mapDioExceptionToFailure(e));
    }
  }

  Future<Result<RedemptionModel>> redeem(String itemId) async {
    try {
      final response = await _dio.post<Map<String, dynamic>>(ApiEndpoints.marketplaceRedeem(itemId));
      return Result.success(RedemptionModel.fromJson(response.data!['data'] as Map<String, dynamic>));
    } on DioException catch (e) {
      return Result.failure(mapDioExceptionToFailure(e));
    }
  }

  Future<Result<PaginatedResponse<RedemptionModel>>> getMyRedemptions({int page = 1, int limit = 20}) async {
    try {
      final response = await _dio.get<Map<String, dynamic>>(
        ApiEndpoints.marketplaceRedemptions,
        queryParameters: {'page': page, 'limit': limit},
      );
      final data = response.data!['data'] as Map<String, dynamic>;
      return Result.success(
        PaginatedResponse.fromJson(data, (json) => RedemptionModel.fromJson(json as Map<String, dynamic>)),
      );
    } on DioException catch (e) {
      return Result.failure(mapDioExceptionToFailure(e));
    }
  }
}
