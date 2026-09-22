import 'dart:async';

import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../shared/providers/core_providers.dart';
import '../data/app_config_repository.dart';
import '../data/models/app_config_model.dart';

final appConfigRepositoryProvider = Provider<AppConfigRepository>((ref) {
  return AppConfigRepository(ref.watch(dioProvider));
});

/// Opens a web address outside the app. A provider so a test can stand in for the phone's browser or store.
final urlOpenerProvider = Provider<Future<bool> Function(Uri uri)>((ref) {
  return (uri) => launchUrl(uri, mode: LaunchMode.externalApplication);
});

/// Whether the server currently lets this app run: open, in maintenance, or too old.
final appStatusProvider = NotifierProvider<AppStatusNotifier, AppAvailability>(AppStatusNotifier.new);

/// Asks the server when the app starts, whenever it comes back to the front, and whenever a request is turned away
/// for maintenance or an old version. Until it hears otherwise the app is open: a server that can not be reached is
/// a connection problem for the screens to explain, not a reason to show a maintenance page.
class AppStatusNotifier extends Notifier<AppAvailability> {
  Future<void>? _checking;

  @override
  AppAvailability build() {
    final lifecycle = AppLifecycleListener(onResume: () => unawaited(check()));
    ref.onDispose(lifecycle.dispose);
    ref.listen<int>(appUnavailableSignalProvider, (previous, next) => unawaited(check()));

    unawaited(Future.microtask(check));
    return const AppOpen();
  }

  /// Looks again. Calls made while one is running share it, so a burst of refused requests asks the server once.
  Future<void> check() => _checking ??= _run().whenComplete(() => _checking = null);

  Future<void> _run() async {
    final result = await ref.read(appConfigRepositoryProvider).load();
    if (!ref.mounted) return;
    // A failed check keeps whatever was showing: a person who is looking at the maintenance page and loses their
    // connection has not been told the platform is back.
    result.when(success: (config) => state = availabilityOf(config), failure: (_) {});
  }
}
