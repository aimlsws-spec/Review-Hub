import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/router/route_paths.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../shared/widgets/loading_indicator.dart';
import '../../../auth/providers/auth_providers.dart';
import '../../data/models/notification_preference_model.dart';
import '../../providers/settings_providers.dart';

const _languages = {'en': 'English', 'hi': 'हिन्दी', 'gu': 'ગુજરાતી'};

class SettingsScreen extends ConsumerWidget {
  const SettingsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final preferencesAsync = ref.watch(notificationPreferencesProvider);
    final user = ref.watch(authStateProvider).value;

    return Scaffold(
      appBar: AppBar(title: const Text('Settings')),
      body: ListView(
        children: [
          const _SectionHeader('Notifications'),
          preferencesAsync.when(
            loading: () => const Padding(padding: EdgeInsets.symmetric(vertical: 24), child: PageLoader()),
            error: (error, stack) => Padding(padding: const EdgeInsets.all(16), child: Text('$error')),
            data: (result) => result.when(
              success: (prefs) => const _NotificationToggles(),
              failure: (failure) => Padding(
                padding: const EdgeInsets.all(16),
                child: Text(failure.message, style: const TextStyle(color: AppColors.danger)),
              ),
            ),
          ),
          const _SectionHeader('Language'),
          ..._languages.entries.map(
            (entry) {
              final isSelected = (user?.language ?? 'en') == entry.key;
              return ListTile(
                title: Text(entry.value),
                trailing: isSelected
                    ? const Icon(Icons.check_circle_rounded, color: AppColors.primary600)
                    : const Icon(Icons.circle_outlined, color: AppColors.slate300),
                onTap: () => ref.read(authStateProvider.notifier).updateProfile(language: entry.key),
              );
            },
          ),
          const _SectionHeader('Account'),
          ListTile(
            leading: const Icon(Icons.lock_outline_rounded, color: AppColors.primary600),
            title: const Text('Change password'),
            trailing: const Icon(Icons.chevron_right),
            onTap: () => context.push(RoutePaths.changePassword),
          ),
          const Divider(height: 1),
          ListTile(
            leading: const Icon(Icons.logout_rounded, color: AppColors.danger),
            title: const Text('Log out', style: TextStyle(color: AppColors.danger, fontWeight: FontWeight.w600)),
            onTap: () => ref.read(authStateProvider.notifier).logout(),
          ),
          const SizedBox(height: 24),
        ],
      ),
    );
  }
}

class _SectionHeader extends StatelessWidget {
  const _SectionHeader(this.title);

  final String title;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 20, 16, 8),
      child: Text(
        title.toUpperCase(),
        style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700, color: AppColors.slate400, letterSpacing: 0.5),
      ),
    );
  }
}

/// Re-seeds from [notificationPreferencesProvider] whenever it changes (e.g.
/// pull-to-refresh), then lets toggles update optimistically in between —
/// see Rule 2.3 (Optimistic UI). By the time this mounts the parent has
/// already gated rendering on that provider resolving successfully, so
/// `.value` is expected non-null here.
final _localPrefsProvider =
    NotifierProvider.autoDispose<_LocalPrefsNotifier, NotificationPreferenceModel?>(_LocalPrefsNotifier.new);

class _LocalPrefsNotifier extends Notifier<NotificationPreferenceModel?> {
  @override
  NotificationPreferenceModel? build() {
    return ref.watch(notificationPreferencesProvider).value?.valueOrNull;
  }

  Future<void> update({
    bool? emailEnabled,
    bool? smsEnabled,
    bool? pushEnabled,
    bool? inAppEnabled,
  }) async {
    final current = state;
    if (current == null) return;
    state = current.copyWith(
      emailEnabled: emailEnabled ?? current.emailEnabled,
      smsEnabled: smsEnabled ?? current.smsEnabled,
      pushEnabled: pushEnabled ?? current.pushEnabled,
      inAppEnabled: inAppEnabled ?? current.inAppEnabled,
    );
    await ref.read(settingsRepositoryProvider).updateNotificationPreferences(
          emailEnabled: emailEnabled,
          smsEnabled: smsEnabled,
          pushEnabled: pushEnabled,
          inAppEnabled: inAppEnabled,
        );
  }
}

class _NotificationToggles extends ConsumerWidget {
  const _NotificationToggles();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final local = ref.watch(_localPrefsProvider);
    if (local == null) return const SizedBox.shrink();
    final notifier = ref.read(_localPrefsProvider.notifier);

    return Column(
      children: [
        SwitchListTile(
          title: const Text('Push notifications'),
          value: local.pushEnabled,
          onChanged: (v) => notifier.update(pushEnabled: v),
        ),
        SwitchListTile(
          title: const Text('Email notifications'),
          value: local.emailEnabled,
          onChanged: (v) => notifier.update(emailEnabled: v),
        ),
        SwitchListTile(
          title: const Text('SMS notifications'),
          value: local.smsEnabled,
          onChanged: (v) => notifier.update(smsEnabled: v),
        ),
        SwitchListTile(
          title: const Text('In-app notifications'),
          value: local.inAppEnabled,
          onChanged: (v) => notifier.update(inAppEnabled: v),
        ),
      ],
    );
  }
}
