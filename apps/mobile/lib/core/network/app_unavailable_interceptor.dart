import 'package:dio/dio.dart';

/// Notices when the backend turns a request away because the platform is in maintenance (503) or because this build
/// is too old (426), and tells the app so it can show the right screen.
///
/// The error is passed on unchanged: the screen that made the request still gets its failure, and this only adds the
/// signal.
class AppUnavailableInterceptor extends Interceptor {
  AppUnavailableInterceptor(this._onUnavailable);

  static const maintenanceCode = 'MAINTENANCE_MODE';
  static const updateRequiredCode = 'APP_UPDATE_REQUIRED';

  final void Function() _onUnavailable;

  /// Whether a response is the backend saying "not now" for one of those two reasons. A 503 from anything else (a
  /// crashed server, a proxy) is an ordinary failure and does not put the app behind a maintenance screen.
  static bool isRefusal(Response<dynamic>? response) {
    if (response == null) return false;
    final data = response.data;
    final code = data is Map ? data['code'] : null;
    return code == maintenanceCode || code == updateRequiredCode;
  }

  @override
  void onError(DioException err, ErrorInterceptorHandler handler) {
    if (isRefusal(err.response)) _onUnavailable();
    handler.next(err);
  }
}
