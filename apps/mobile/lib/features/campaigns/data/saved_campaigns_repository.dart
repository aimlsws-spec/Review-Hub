import 'package:dio/dio.dart';

import '../../../core/constants/api_endpoints.dart';
import '../../../core/errors/result.dart';
import '../../../core/network/failure_mapper.dart';

/// The person's saved campaigns, kept on the server so the list follows them to another phone.
///
/// Every call answers with the whole list of ids, newest first, so the phone can simply take the server's word for it.
class SavedCampaignsRepository {
  SavedCampaignsRepository(this._dio);

  final Dio _dio;

  Future<Result<List<String>>> list() => _call(() => _dio.get<Map<String, dynamic>>(ApiEndpoints.savedCampaigns));

  /// Saving one that is already saved changes nothing.
  Future<Result<List<String>>> save(String campaignId) =>
      _call(() => _dio.put<Map<String, dynamic>>(ApiEndpoints.savedCampaign(campaignId)));

  /// Removing one that is not saved changes nothing.
  Future<Result<List<String>>> remove(String campaignId) =>
      _call(() => _dio.delete<Map<String, dynamic>>(ApiEndpoints.savedCampaign(campaignId)));

  /// Uploads the list this phone kept before saving moved to the server. The server skips campaigns that have ended.
  Future<Result<List<String>>> importIds(List<String> campaignIds) => _call(
    () => _dio.post<Map<String, dynamic>>(ApiEndpoints.savedCampaignsImport, data: {'campaignIds': campaignIds}),
  );

  Future<Result<List<String>>> _call(Future<Response<Map<String, dynamic>>> Function() request) async {
    try {
      final response = await request();
      final data = response.data!['data'] as Map<String, dynamic>;
      final ids = data['campaignIds'] as List<dynamic>;
      return Result.success([for (final id in ids) id as String]);
    } on DioException catch (e) {
      return Result.failure(mapDioExceptionToFailure(e));
    }
  }
}
