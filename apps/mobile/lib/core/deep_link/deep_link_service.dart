import 'package:app_links/app_links.dart';
import 'package:logger/logger.dart';

/// Wraps `app_links` over the `viralkar://` scheme registered in the Android
/// manifest. Every method fails safely — a broken or unavailable deep-link
/// plugin must never crash app startup.
class DeepLinkService {
  final _appLinks = AppLinks();
  final _logger = Logger(printer: PrettyPrinter(methodCount: 0));

  /// The link that launched the app from fully terminated, if any.
  Future<Uri?> getInitialLink() async {
    try {
      return await _appLinks.getInitialLink();
    } catch (error) {
      _logger.w('Failed to read initial deep link: $error');
      return null;
    }
  }

  /// Fires for every link received while the app is already running (foreground or background).
  Stream<Uri> get onLink => _appLinks.uriLinkStream;
}
