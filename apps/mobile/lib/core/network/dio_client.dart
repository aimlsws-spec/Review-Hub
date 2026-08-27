import 'package:dio/dio.dart';
import 'package:logger/logger.dart';

import '../config/app_config.dart';
import 'auth_interceptor.dart';
import 'token_storage.dart';

/// Builds the app's two Dio instances:
/// - [dio] — the main client every repository uses, with auth + logging.
/// - a bare, un-intercepted instance used internally only for the token
///   refresh call itself (passed into [AuthInterceptor]) to avoid recursion.
class DioClientFactory {
  static Dio create({
    required TokenStorage tokenStorage,
    Future<void> Function()? onSessionExpired,
  }) {
    final baseOptions = BaseOptions(
      baseUrl: AppConfig.apiBaseUrl,
      connectTimeout: AppConfig.connectTimeout,
      receiveTimeout: AppConfig.receiveTimeout,
      contentType: 'application/json',
      headers: const {'Accept': 'application/json'},
    );

    final refreshDio = Dio(baseOptions);

    final dio = Dio(baseOptions);
    dio.interceptors.add(
      AuthInterceptor(tokenStorage, refreshDio, onSessionExpired: onSessionExpired),
    );

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
