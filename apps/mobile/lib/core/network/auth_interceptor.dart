import 'package:dio/dio.dart';

import '../constants/api_endpoints.dart';
import 'token_storage.dart';

/// Attaches the bearer access token to every request, and on a 401
/// transparently refreshes it once and retries — mirroring the web
/// portals' axios interceptor and the backend's 15-minute access /
/// 30-day refresh token pair.
///
/// Concurrent requests that all 401 at once share a single in-flight
/// refresh (via [_refreshCompleter]) instead of each triggering their own.
class AuthInterceptor extends Interceptor {
  AuthInterceptor(this._tokenStorage, this._refreshDio, {this.onSessionExpired});

  final TokenStorage _tokenStorage;

  /// A separate, un-intercepted Dio instance used only for the refresh call
  /// itself, so a failed refresh can't recursively trigger this interceptor.
  final Dio _refreshDio;

  /// Called when the refresh token itself is rejected — the app should
  /// clear local state and navigate to the login screen.
  final Future<void> Function()? onSessionExpired;

  Future<String?>? _refreshCompleter;

  static const _authExemptPaths = {
    ApiEndpoints.login,
    ApiEndpoints.register,
    ApiEndpoints.refresh,
    ApiEndpoints.sendOtp,
    ApiEndpoints.verifyOtp,
    ApiEndpoints.forgotPassword,
    ApiEndpoints.resetPassword,
  };

  @override
  Future<void> onRequest(
    RequestOptions options,
    RequestInterceptorHandler handler,
  ) async {
    if (!_authExemptPaths.contains(options.path)) {
      final token = await _tokenStorage.accessToken;
      if (token != null) {
        options.headers['Authorization'] = 'Bearer $token';
      }
    }
    handler.next(options);
  }

  @override
  Future<void> onError(
    DioException err,
    ErrorInterceptorHandler handler,
  ) async {
    final isUnauthorized = err.response?.statusCode == 401;
    final isExempt = _authExemptPaths.contains(err.requestOptions.path);
    final alreadyRetried = err.requestOptions.extra['retried'] == true;

    if (!isUnauthorized || isExempt || alreadyRetried) {
      handler.next(err);
      return;
    }

    final newAccessToken = await _refreshAccessToken();
    if (newAccessToken == null) {
      await onSessionExpired?.call();
      handler.next(err);
      return;
    }

    try {
      final retryOptions = err.requestOptions
        ..headers['Authorization'] = 'Bearer $newAccessToken'
        ..extra['retried'] = true;
      final response = await _refreshDio.fetch(retryOptions);
      handler.resolve(response);
    } on DioException catch (retryError) {
      handler.next(retryError);
    }
  }

  /// Deduplicates concurrent refresh attempts: the first caller performs the
  /// network call, subsequent callers await the same in-flight future.
  Future<String?> _refreshAccessToken() {
    return _refreshCompleter ??= _doRefresh().whenComplete(() {
      _refreshCompleter = null;
    });
  }

  Future<String?> _doRefresh() async {
    final refreshToken = await _tokenStorage.refreshToken;
    if (refreshToken == null) return null;

    try {
      final response = await _refreshDio.post<Map<String, dynamic>>(
        ApiEndpoints.refresh,
        data: {'refreshToken': refreshToken},
      );
      final data = response.data?['data'] as Map<String, dynamic>?;
      final newAccessToken = data?['accessToken'] as String?;
      final newRefreshToken = data?['refreshToken'] as String?;
      if (newAccessToken == null) return null;

      await _tokenStorage.saveTokens(
        accessToken: newAccessToken,
        refreshToken: newRefreshToken ?? refreshToken,
      );
      return newAccessToken;
    } on DioException {
      await _tokenStorage.clear();
      return null;
    }
  }
}
