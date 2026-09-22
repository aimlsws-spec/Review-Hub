import 'package:dio/dio.dart';

import 'app_version_source.dart';

/// Adds the app's version to every request as `X-App-Version`, so the backend can refuse a build it no longer supports.
class AppVersionInterceptor extends Interceptor {
  AppVersionInterceptor(this._version);

  static const headerName = 'X-App-Version';

  final AppVersionSource _version;

  @override
  Future<void> onRequest(RequestOptions options, RequestInterceptorHandler handler) async {
    final version = await _version.value;
    if (version.isNotEmpty) options.headers[headerName] = version;
    handler.next(options);
  }
}
