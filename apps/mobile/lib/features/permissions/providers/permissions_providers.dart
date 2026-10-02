import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/constants/storage_keys.dart';
import '../../../core/location/location_providers.dart';
import '../../../core/notifications/push_notification_controller.dart';
import '../../../shared/providers/core_providers.dart';

/// The system permission prompts the intro screen can trigger. A provider so tests can stand in for the plugins.
class PermissionPrompts {
  const PermissionPrompts({required this.notifications, required this.location});

  /// Shows the notification prompt and, if allowed, registers this phone for push.
  final Future<void> Function() notifications;

  /// Shows the location prompt. True when allowed.
  final Future<bool> Function() location;
}

final permissionPromptsProvider = Provider<PermissionPrompts>((ref) {
  return PermissionPrompts(
    notifications: () => ref.read(pushNotificationControllerProvider).syncForCurrentUser(),
    location: () => ref.read(locationServiceProvider).requestPermission(),
  );
});

/// A permission the intro screen explains.
enum IntroPermission { notifications, location }

/// What happened to each permission on the intro screen: missing means not asked yet, true allowed, false declined.
final permissionsIntroProvider = NotifierProvider.autoDispose<PermissionsIntroNotifier, Map<IntroPermission, bool>>(
  PermissionsIntroNotifier.new,
);

class PermissionsIntroNotifier extends Notifier<Map<IntroPermission, bool>> {
  @override
  Map<IntroPermission, bool> build() => const {};

  Future<void> allow(IntroPermission permission) async {
    final prompts = ref.read(permissionPromptsProvider);
    final allowed = switch (permission) {
      // The plugin does not say whether it was allowed; asking is what this screen is for.
      IntroPermission.notifications => await prompts.notifications().then((_) => true),
      IntroPermission.location => await prompts.location(),
    };
    state = {...state, permission: allowed};
  }

  /// Remembers that the intro was shown, so it never comes back on this phone.
  Future<void> finish() async {
    await ref.read(settingsBoxProvider).put(StorageKeys.permissionsIntroSeen, true);
  }
}
