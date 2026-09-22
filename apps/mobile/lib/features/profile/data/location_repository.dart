import 'package:dio/dio.dart';

import '../../../core/constants/api_endpoints.dart';
import '../../../core/errors/result.dart';
import '../../../core/network/failure_mapper.dart';
import 'models/location_models.dart';

/// The states and cities a person can pick. Both calls are public, so they also work on the sign-up screen.
class LocationRepository {
  LocationRepository(this._dio);

  final Dio _dio;

  Future<Result<List<StateModel>>> listStates() async {
    try {
      final response = await _dio.get<Map<String, dynamic>>(ApiEndpoints.locationStates);
      return Result.success(_parseList(response.data?['data'], StateModel.fromJson));
    } on DioException catch (e) {
      return Result.failure(mapDioExceptionToFailure(e));
    }
  }

  Future<Result<List<CityModel>>> listCities(String stateId) async {
    try {
      final response = await _dio.get<Map<String, dynamic>>(ApiEndpoints.locationCities(stateId));
      return Result.success(_parseList(response.data?['data'], CityModel.fromJson));
    } on DioException catch (e) {
      return Result.failure(mapDioExceptionToFailure(e));
    }
  }

  /// Keeps the entries that are well-formed and skips the rest, so one bad row never hides the whole list.
  List<T> _parseList<T>(Object? data, T Function(Map<String, dynamic>) fromJson) {
    if (data is! List) return <T>[];
    final items = <T>[];
    for (final entry in data) {
      if (entry is! Map<String, dynamic>) continue;
      try {
        items.add(fromJson(entry));
      } catch (_) {
        continue;
      }
    }
    return items;
  }
}
