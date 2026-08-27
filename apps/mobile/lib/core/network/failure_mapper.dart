import 'package:dio/dio.dart';

import '../errors/failure.dart';

/// Maps a [DioException] to a typed [Failure] using the backend's error
/// envelope (`{success:false, statusCode, code, message, details}`) when
/// present, falling back to the exception type otherwise.
Failure mapDioExceptionToFailure(DioException error) {
  switch (error.type) {
    case DioExceptionType.connectionTimeout:
    case DioExceptionType.sendTimeout:
    case DioExceptionType.receiveTimeout:
    case DioExceptionType.transformTimeout:
    case DioExceptionType.connectionError:
      return const NetworkFailure();
    case DioExceptionType.cancel:
      return const UnknownFailure('Request was cancelled.');
    case DioExceptionType.badCertificate:
      return const UnknownFailure('Could not establish a secure connection.');
    case DioExceptionType.badResponse:
      return _mapResponse(error);
    case DioExceptionType.unknown:
      return const NetworkFailure();
  }
}

Failure _mapResponse(DioException error) {
  final statusCode = error.response?.statusCode ?? 0;
  final body = error.response?.data;

  String message = 'Something went wrong. Please try again.';
  Map<String, List<String>> fieldErrors = const {};

  if (body is Map<String, dynamic>) {
    message = body['message'] as String? ?? message;
    final details = body['details'];
    if (details is Map) {
      fieldErrors = details.map(
        (key, value) => MapEntry(
          key.toString(),
          (value is List ? value : [value]).map((e) => e.toString()).toList(),
        ),
      );
    }
  }

  switch (statusCode) {
    case 400:
    case 422:
      return ValidationFailure(message, fieldErrors: fieldErrors);
    case 401:
      return UnauthorizedFailure(message);
    case 403:
      return ForbiddenFailure(message);
    case 404:
      return NotFoundFailure(message);
    case 409:
      return ConflictFailure(message);
    case 429:
      return RateLimitedFailure(message);
    default:
      if (statusCode >= 500) return ServerFailure(message);
      return UnknownFailure(message);
  }
}
