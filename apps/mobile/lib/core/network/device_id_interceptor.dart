import 'package:dio/dio.dart';

import 'device_id_storage.dart';

/// Adds the install id to every request as `X-Device-ID`.
///
/// It is on every request, not only sign-in: the backend links the id to a
/// session when one is created or refreshed, and those calls skip the auth
/// interceptor, so this one has to sit on both Dio instances.
class DeviceIdInterceptor extends Interceptor {
  DeviceIdInterceptor(this._deviceId);

  static const headerName = 'X-Device-ID';

  final DeviceIdStorage _deviceId;

  @override
  Future<void> onRequest(RequestOptions options, RequestInterceptorHandler handler) async {
    options.headers[headerName] = await _deviceId.value;
    handler.next(options);
  }
}
