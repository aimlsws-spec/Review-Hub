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
              success: (prefs) => _NotificationToggles(preferences: prefs),
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

class _NotificationToggles extends ConsumerStatefulWidget {
  const _NotificationToggles({required this.preferences});

  final NotificationPreferenceModel preferences;

  @override
  ConsumerState<_NotificationToggles> createState() => _NotificationTogglesState();
}

class _NotificationTogglesState extends ConsumerState<_NotificationToggles> {
  late NotificationPreferenceModel _local;

  @override
  void initState() {
    super.initState();
    _local = widget.preferences;
  }

  Future<void> _update({
    bool? emailEnabled,
    bool? smsEnabled,
    bool? pushEnabled,
    bool? inAppEnabled,
  }) async {
    setState(() {
      _local = _local.copyWith(
        emailEnabled: emailEnabled ?? _local.emailEnabled,
        smsEnabled: smsEnabled ?? _local.smsEnabled,
        pushEnabled: pushEnabled ?? _local.pushEnabled,
        inAppEnabled: inAppEnabled ?? _local.inAppEnabled,
      );
    });
    await ref.read(settingsRepositoryProvider).updateNotificationPreferences(
          emailEnabled: emailEnabled,
          smsEnabled: smsEnabled,
          pushEnabled: pushEnabled,
          inAppEnabled: inAppEnabled,
        );
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        SwitchListTile(
          title: const Text('Push notifications'),
          value: _local.pushEnabled,
          onChanged: (v) => _update(pushEnabled: v),
        ),
        SwitchListTile(
          title: const Text('Email notifications'),
          value: _local.emailEnabled,
          onChanged: (v) => _update(emailEnabled: v),
        ),
        SwitchListTile(
          title: const Text('SMS notifications'),
          value: _local.smsEnabled,
          onChanged: (v) => _update(smsEnabled: v),
        ),
        SwitchListTile(
          title: const Text('In-app notifications'),
          value: _local.inAppEnabled,
          onChanged: (v) => _update(inAppEnabled: v),
        ),
      ],
    );
  }
}
