import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../data/models/app_config_model.dart';
import '../../providers/app_status_providers.dart';
import '../screens/app_status_screens.dart';

/// Puts the maintenance or update page in front of the whole app when the server says the app can not run.
///
/// The app underneath is kept, only hidden, so when maintenance ends the person is exactly where they were.
class AppStatusGate extends ConsumerWidget {
  const AppStatusGate({super.key, required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final status = ref.watch(appStatusProvider);

    final Widget? blocker = switch (status) {
      AppOpen() => null,
      AppInMaintenance(:final message) => MaintenanceScreen(message: message),
      AppNeedsUpdate(:final minimumVersion, :final updateUrl) => UpdateRequiredScreen(
        minimumVersion: minimumVersion,
        updateUrl: updateUrl,
      ),
    };

    return Stack(
      fit: StackFit.expand,
      children: [
        Visibility(visible: blocker == null, maintainState: true, child: child),
        ?blocker,
      ],
    );
  }
}
