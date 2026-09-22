import 'package:package_info_plus/package_info_plus.dart';

/// The version of this build, such as `1.4.2`, sent to the backend as `X-App-Version`.
///
/// The backend uses it to turn away builds that are older than the minimum it supports, so the app can ask its
/// user to update instead of failing in confusing ways against a server that has moved on.
class AppVersionSource {
  AppVersionSource({Future<String> Function()? loader}) : _loader = loader ?? _fromPlatform;

  final Future<String> Function() _loader;
  Future<String>? _pending;

  /// The same value on every call; it is read from the platform once.
  ///
  /// Empty when it can not be read. The header is then left off, and the backend never treats a request with
  /// no version as out of date.
  Future<String> get value => _pending ??= _read();

  Future<String> _read() async {
    try {
      return (await _loader()).trim();
    } catch (_) {
      return '';
    }
  }

  static Future<String> _fromPlatform() async => (await PackageInfo.fromPlatform()).version;
}
