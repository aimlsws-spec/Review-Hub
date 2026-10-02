import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../shared/providers/core_providers.dart';
import '../../auth/providers/auth_providers.dart';
import '../data/legal_repository.dart';
import '../data/models/content_page_model.dart';

final legalRepositoryProvider = Provider<LegalRepository>((ref) => LegalRepository(ref.watch(dioProvider)));

/// One published legal page by slug. Throws the failure, so the screen can show it with a retry.
final contentPageProvider = FutureProvider.autoDispose.family<ContentPageModel, String>((ref, slug) async {
  final result = await ref.watch(legalRepositoryProvider).getPage(slug);
  return result.when(success: (page) => page, failure: (f) => throw f);
});

final policyAcceptanceProvider = AsyncNotifierProvider.autoDispose<PolicyAcceptanceNotifier, void>(
  PolicyAcceptanceNotifier.new,
);

/// Accepts the current policies, then reloads the profile so the router stops asking.
class PolicyAcceptanceNotifier extends AsyncNotifier<void> {
  @override
  Future<void> build() async {}

  Future<bool> accept() async {
    state = const AsyncLoading();
    final result = await ref.read(legalRepositoryProvider).acceptPolicies();
    if (result.isFailure) {
      state = AsyncError(
        result.failureOrNull?.message ?? 'Could not save your acceptance. Please try again.',
        StackTrace.current,
      );
      return false;
    }
    await ref.read(authStateProvider.notifier).refreshProfile();
    state = const AsyncData(null);
    return true;
  }
}
