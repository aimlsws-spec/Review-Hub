import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../auth/providers/auth_providers.dart';
import '../../providers/app_lock_providers.dart';
import '../screens/lock_screen.dart';

/// Puts the lock screen over the whole app while it is locked.
///
/// The app underneath stays where it was, but can not be touched or read out by a screen reader. Nothing is covered
/// for someone who is not signed in: there is nothing of theirs to protect on the sign-in screen.
class AppLockGate extends ConsumerWidget {
  const AppLockGate({super.key, required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final lock = ref.watch(appLockProvider);
    final signedIn = ref.watch(authStateProvider).value != null;
    final covered = lock.enabled && lock.locked && signedIn;

    return Stack(
      fit: StackFit.expand,
      children: [
        ExcludeSemantics(excluding: covered, child: IgnorePointer(ignoring: covered, child: child)),
        if (covered) const LockScreen(),
      ],
    );
  }
}
