import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hive_flutter/hive_flutter.dart';

import 'core/constants/storage_keys.dart';
import 'core/notifications/push_notification_controller.dart';
import 'core/router/app_router.dart';
import 'core/theme/app_theme.dart';
import 'features/auth/data/models/user_model.dart';
import 'features/auth/providers/auth_providers.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  await Hive.initFlutter();
  await Hive.openBox(StorageKeys.settingsBox);

  // A container built ahead of runApp so push notifications can boot (and,
  // if a terminated-state notification tap launched the app, record where to
  // navigate) before there's a widget tree to read providers from.
  final container = ProviderContainer();
  await container.read(pushNotificationControllerProvider).start();

  runApp(UncontrolledProviderScope(container: container, child: const ViralKarApp()));
}

class ViralKarApp extends ConsumerStatefulWidget {
  const ViralKarApp({super.key});

  @override
  ConsumerState<ViralKarApp> createState() => _ViralKarAppState();
}

class _ViralKarAppState extends ConsumerState<ViralKarApp> {
  @override
  void initState() {
    super.initState();
    // GoRouter isn't attached to a Navigator until after this first frame —
    // a cold-start notification tap's target route waits until now.
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(pushNotificationControllerProvider).consumePendingRoute();
    });
  }

  @override
  Widget build(BuildContext context) {
    final router = ref.watch(routerProvider);

    ref.listen<AsyncValue<UserModel?>>(authStateProvider, (previous, next) {
      final justSignedIn = next.value != null && previous?.value == null;
      if (justSignedIn) {
        unawaited(ref.read(pushNotificationControllerProvider).syncForCurrentUser());
      }
    });

    return MaterialApp.router(
      title: 'VIRAL KAR',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light,
      routerConfig: router,
    );
  }
}
