import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../theme/app_colors.dart';

/// Wraps the five bottom-nav destinations, one [StatefulShellBranch] each
/// (see `app_router.dart`) — GoRouter keeps every branch's navigator alive in
/// an `IndexedStack` under the hood, so switching tabs no longer disposes the
/// previous tab's screen and its `autoDispose` providers, unlike a plain
/// `ShellRoute` with `context.go()` tab switching.
class AppShell extends StatelessWidget {
  const AppShell({super.key, required this.navigationShell});

  final StatefulNavigationShell navigationShell;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      extendBody: true, // Fix for FAB shadow and clipping
      body: navigationShell,
      floatingActionButton: Container(
        width: 60,
        height: 60,
        decoration: BoxDecoration(
          gradient: const LinearGradient(
            colors: [AppColors.primary400, AppColors.primary600],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
          shape: BoxShape.circle,
          boxShadow: [
            BoxShadow(color: AppColors.primary600.withValues(alpha: 0.3), blurRadius: 12, offset: const Offset(0, 6)),
          ],
          border: Border.all(color: Colors.white, width: 4),
        ),
        child: FloatingActionButton(
          onPressed: () => navigationShell.goBranch(3, initialLocation: true), // Trigger Gamification/Rewards branch on FAB
          backgroundColor: Colors.transparent,
          elevation: 0,
          highlightElevation: 0,
          child: const Icon(Icons.auto_awesome_rounded, color: Colors.white, size: 28),
        ),
      ),
      floatingActionButtonLocation: FloatingActionButtonLocation.centerDocked,
      bottomNavigationBar: BottomAppBar(
        color: Colors.white,
        shape: const CircularNotchedRectangle(),
        notchMargin: 8.0,
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceAround,
          children: [
            _buildNavItem(context, icon: Icons.home_rounded, label: 'Home', routerIndex: 0),
            _buildNavItem(context, icon: Icons.checklist_rounded, label: 'Tasks', routerIndex: 1),
            const SizedBox(width: 48), // Space for FAB
            _buildNavItem(context, icon: Icons.account_balance_wallet_rounded, label: 'Wallet', routerIndex: 2),
            _buildNavItem(context, icon: Icons.person_rounded, label: 'Profile', routerIndex: 4),
          ],
        ),
      ),
    );
  }

  Widget _buildNavItem(BuildContext context, {required IconData icon, required String label, required int routerIndex}) {
    final isSelected = navigationShell.currentIndex == routerIndex;
    final color = isSelected ? AppColors.orange700 : AppColors.slate400;
    
    return InkWell(
      onTap: () => navigationShell.goBranch(routerIndex, initialLocation: routerIndex == navigationShell.currentIndex),
      highlightColor: Colors.transparent,
      splashColor: Colors.transparent,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(icon, color: color, size: 24),
          const SizedBox(height: 4),
          Text(label, style: TextStyle(color: color, fontSize: 11, fontWeight: FontWeight.w600)),
        ],
      ),
    );
  }
}
