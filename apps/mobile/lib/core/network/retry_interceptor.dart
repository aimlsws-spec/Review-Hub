import 'package:dio/dio.dart';

/// Retries idempotent GET requests on transient failures (timeouts,
/// connection drops, 5xx) with exponential backoff — a flaky mobile
/// connection shouldn't surface an error to the user on the first blip.
/// POST/PATCH/DELETE etc. are never retried here since they aren't
/// guaranteed idempotent.
class RetryInterceptor extends Interceptor {
  RetryInterceptor(this._dio, {this.delays = const [Duration(seconds: 1), Duration(seconds: 3), Duration(seconds: 5)]});

  final Dio _dio;
  final List<Duration> delays;

  static const _retryCountKey = 'retry_count';

  bool _isRetryable(DioException error) {
    if (error.requestOptions.method.toUpperCase() != 'GET') return false;

    final isTransientError = error.type == DioExceptionType.connectionTimeout ||
        error.type == DioExceptionType.receiveTimeout ||
        error.type == DioExceptionType.sendTimeout ||
        error.type == DioExceptionType.connectionError;
    final isServerError = error.response != null && error.response!.statusCode != null && error.response!.statusCode! >= 500;

    return isTransientError || isServerError;
  }

  @override
  Future<void> onError(DioException err, ErrorInterceptorHandler handler) async {
    final retryCount = (err.requestOptions.extra[_retryCountKey] as int?) ?? 0;

    if (!_isRetryable(err) || retryCount >= delays.length) {
      return handler.next(err);
    }

    await Future<void>.delayed(delays[retryCount]);

    final retryOptions = err.requestOptions..extra[_retryCountKey] = retryCount + 1;
    try {
      final response = await _dio.fetch<dynamic>(retryOptions);
      return handler.resolve(response);
    } on DioException catch (retryError) {
      return handler.next(retryError);
    }
  }
}
