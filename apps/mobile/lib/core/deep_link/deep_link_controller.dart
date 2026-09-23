import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../router/app_router.dart';
import '../router/route_paths.dart';
import 'deep_link_service.dart';
import 'pending_referral_code_provider.dart';

final deepLinkServiceProvider = Provider<DeepLinkService>((ref) => DeepLinkService());

final deepLinkControllerProvider = Provider<DeepLinkController>((ref) => DeepLinkController(ref));

/// The referral code in a `viralkar://referral?code=...` link, or `null` if
/// this link isn't one of those (a different host, or no code at all).
/// Pulled out as a pure function so the parsing rule is testable without a
/// router or a real deep-link plugin.
String? referralCodeFromLink(Uri uri) {
  if (uri.host != 'referral') return null;
  final code = uri.queryParameters['code'];
  return (code == null || code.isEmpty) ? null : code;
}

/// Listens for the app's custom `viralkar://` links and routes them.
/// `start()` runs once at app boot, outside the widget tree — mirrors
/// [PushNotificationController].
class DeepLinkController {
  DeepLinkController(this._ref);

  final Ref _ref;

  Future<void> start() async {
    final service = _ref.read(deepLinkServiceProvider);

    service.onLink.listen(_handle);

    final initialLink = await service.getInitialLink();
    if (initialLink != null) _handle(initialLink);
  }

  void _handle(Uri uri) {
    final code = referralCodeFromLink(uri);
    if (code == null) return;

    _ref.read(pendingReferralCodeProvider.notifier).state = code;
    _ref.read(routerProvider).go(RoutePaths.register);
  }
}
