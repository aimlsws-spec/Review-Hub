import 'package:dio/dio.dart';
import 'package:logger/logger.dart';

import '../config/app_config.dart';
import 'app_unavailable_interceptor.dart';
import 'app_version_interceptor.dart';
import 'app_version_source.dart';
import 'auth_interceptor.dart';
import 'device_id_interceptor.dart';
import 'device_id_storage.dart';
import 'retry_interceptor.dart';
import 'token_storage.dart';

/// Builds the app's two Dio instances:
/// - [dio] — the main client every repository uses, with auth + logging.
/// - a bare, un-intercepted instance used internally only for the token
///   refresh call itself (passed into [AuthInterceptor]) to avoid recursion.
class DioClientFactory {
  static Dio create({
    required TokenStorage tokenStorage,
    required DeviceIdStorage deviceIdStorage,
    required AppVersionSource appVersionSource,
    Future<void> Function()? onSessionExpired,
    void Function()? onAppUnavailable,
  }) {
    final baseOptions = BaseOptions(
      baseUrl: AppConfig.apiBaseUrl,
      connectTimeout: AppConfig.connectTimeout,
      receiveTimeout: AppConfig.receiveTimeout,
      contentType: 'application/json',
      headers: const {'Accept': 'application/json'},
    );

    // The refresh call needs the install id too: the backend ties it to the
    // session it renews.
    final refreshDio = Dio(baseOptions)
      ..interceptors.add(DeviceIdInterceptor(deviceIdStorage))
      ..interceptors.add(AppVersionInterceptor(appVersionSource));

    final dio = Dio(baseOptions);
    dio.interceptors.add(DeviceIdInterceptor(deviceIdStorage));
    dio.interceptors.add(AppVersionInterceptor(appVersionSource));
    dio.interceptors.add(
      AuthInterceptor(tokenStorage, refreshDio, onSessionExpired: onSessionExpired),
    );
    // After auth — a 401 should be refreshed-and-retried by AuthInterceptor
    // first; only genuinely transient failures (timeouts, connection drops,
    // 5xx) reach this one.
    dio.interceptors.add(RetryInterceptor(dio));
    // After retry, so it sees the final answer and not one that is about to be tried again.
    if (onAppUnavailable != null) dio.interceptors.add(AppUnavailableInterceptor(onAppUnavailable));

    if (AppConfig.enableLogging) {
      final logger = Logger(printer: PrettyPrinter(methodCount: 0));
      dio.interceptors.add(
        InterceptorsWrapper(
          onRequest: (options, handler) {
            logger.d('→ ${options.method} ${options.uri}');
            handler.next(options);
          },
          onResponse: (response, handler) {
            logger.d('← ${response.statusCode} ${response.requestOptions.uri}');
            handler.next(response);
          },
          onError: (error, handler) {
            logger.w('✗ ${error.requestOptions.uri}: ${error.message}');
            handler.next(error);
          },
        ),
      );
    }

    return dio;
  }
}
