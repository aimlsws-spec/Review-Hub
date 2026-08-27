import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../theme/app_colors.dart';
import 'route_paths.dart';

const _tabs = [
  (path: RoutePaths.home, icon: Icons.home_rounded, label: 'Home'),
  (path: RoutePaths.tasks, icon: Icons.checklist_rounded, label: 'Tasks'),
  (path: RoutePaths.wallet, icon: Icons.account_balance_wallet_rounded, label: 'Wallet'),
  (path: RoutePaths.profile, icon: Icons.person_rounded, label: 'Profile'),
];

/// Wraps the four bottom-nav destinations. Each tab is its own top-level
/// route (not a nested navigation stack) — simple `context.go()` tab
/// switching is enough for now; screens pushed from within a tab (task
/// detail, submission, etc.) still layer on top of it normally via `push`.
class AppShell extends StatelessWidget {
  const AppShell({super.key, required this.child});

  final Widget child;

  int _currentIndex(BuildContext context) {
    final location = GoRouterState.of(context).matchedLocation;
    final index = _tabs.indexWhere((tab) => location == tab.path);
    return index == -1 ? 0 : index;
  }

  @override
  Widget build(BuildContext context) {
    final currentIndex = _currentIndex(context);

    return Scaffold(
      body: child,
      bottomNavigationBar: NavigationBar(
        selectedIndex: currentIndex,
        onDestinationSelected: (index) => context.go(_tabs[index].path),
        backgroundColor: Colors.white,
        indicatorColor: AppColors.primary50,
        destinations: [
          for (final tab in _tabs)
            NavigationDestination(icon: Icon(tab.icon), label: tab.label),
        ],
      ),
    );
  }
}
