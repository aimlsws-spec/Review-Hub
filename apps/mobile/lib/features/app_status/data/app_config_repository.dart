import 'package:dio/dio.dart';

import '../../../core/constants/api_endpoints.dart';
import '../../../core/errors/failure.dart';
import '../../../core/errors/result.dart';
import '../../../core/network/failure_mapper.dart';
import 'models/app_config_model.dart';

class AppConfigRepository {
  AppConfigRepository(this._dio);

  final Dio _dio;

  Future<Result<AppConfigModel>> load() async {
    try {
      final response = await _dio.get<Map<String, dynamic>>(ApiEndpoints.appConfig);
      return Result.success(AppConfigModel.fromJson(response.data!['data'] as Map<String, dynamic>));
    } on DioException catch (e) {
      return Result.failure(mapDioExceptionToFailure(e));
    } catch (_) {
      // A reply that is not the shape we expect is treated like no reply: the app carries on as it was.
      return const Result.failure(UnknownFailure('The app settings could not be read.'));
    }
  }
}
