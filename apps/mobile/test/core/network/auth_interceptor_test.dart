import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:viral_kar/core/constants/api_endpoints.dart';
import 'package:viral_kar/core/network/auth_interceptor.dart';
import 'package:viral_kar/core/network/token_storage.dart';

/// A signed-in session whose access token is always 'access-1'.
class _SignedIn extends TokenStorage {
  _SignedIn() : super(const FlutterSecureStorage());

  @override
  Future<String?> get accessToken async => 'access-1';
}

/// Answers every request with an empty 200 and remembers its headers.
class _RecordingAdapter implements HttpClientAdapter {
  RequestOptions? last;

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<List<int>>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    last = options;
    return ResponseBody.fromString(
      '{}',
      200,
      headers: {
        Headers.contentTypeHeader: ['application/json'],
      },
    );
  }

  @override
  void close({bool force = false}) {}
}

void main() {
  Future<String?> authorizationSentTo(String path) async {
    final adapter = _RecordingAdapter();
    final dio = Dio(BaseOptions(baseUrl: 'https://example.test'))
      ..httpClientAdapter = adapter
      ..interceptors.add(AuthInterceptor(_SignedIn(), Dio()));
    await dio.post<dynamic>(path);
    return adapter.last!.headers['Authorization'] as String?;
  }

  // The server issues and checks these codes only for the signed-in person; without the token every email
  // verification failed with a 401 and no code was ever sent.
  for (final path in [
    ApiEndpoints.sendOtp,
    ApiEndpoints.verifyOtp,
    ApiEndpoints.resendOtp,
  ]) {
    test('signs $path with the access token', () async {
      expect(await authorizationSentTo(path), 'Bearer access-1');
    });
  }

  test(
    'leaves the token off sign-in, which comes before any session',
    () async {
      expect(await authorizationSentTo(ApiEndpoints.login), isNull);
    },
  );
}
