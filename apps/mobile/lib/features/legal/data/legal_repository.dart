import 'package:dio/dio.dart';

import '../../../core/constants/api_endpoints.dart';
import '../../../core/errors/result.dart';
import '../../../core/network/failure_mapper.dart';
import 'models/content_page_model.dart';

/// Reads the published legal texts and records that the person accepted them.
class LegalRepository {
  LegalRepository(this._dio);

  final Dio _dio;

  /// A published page, readable before signing in (the sign-up screen links to it).
  Future<Result<ContentPageModel>> getPage(String slug) async {
    try {
      final response = await _dio.get<Map<String, dynamic>>(ApiEndpoints.contentPage(slug));
      return Result.success(ContentPageModel.fromJson(response.data!['data'] as Map<String, dynamic>));
    } on DioException catch (e) {
      return Result.failure(mapDioExceptionToFailure(e));
    }
  }

  /// Accepts the current version of every policy document for the signed-in person.
  Future<Result<void>> acceptPolicies() async {
    try {
      await _dio.post<void>(ApiEndpoints.acceptPolicies);
      return const Result.success(null);
    } on DioException catch (e) {
      return Result.failure(mapDioExceptionToFailure(e));
    }
  }
}
