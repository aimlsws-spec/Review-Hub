import 'package:flutter_riverpod/legacy.dart';

/// A referral code carried by an incoming `viralkar://referral?code=...` link,
/// waiting for the register screen to read and clear it. `null` once consumed,
/// or when there was never one — see [DeepLinkController] and `RegisterScreen`'s
/// `initState`.
///
/// Kept in its own file, importing nothing beyond Riverpod: `DeepLinkController`
/// needs `app_router.dart` to navigate, and `app_router.dart` in turn imports
/// every screen (including the register screen that reads this) — routing this
/// value through `deep_link_controller.dart` instead would make that a cycle.
final pendingReferralCodeProvider = StateProvider<String?>((ref) => null);
