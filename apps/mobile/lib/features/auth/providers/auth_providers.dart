import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/errors/result.dart';
import '../../../shared/providers/core_providers.dart';
import '../data/auth_repository.dart';
import '../data/models/user_model.dart';

final authRepositoryProvider = Provider<AuthRepository>((ref) {
  return AuthRepository(ref.watch(dioProvider), ref.watch(tokenStorageProvider));
});

/// The single source of truth for "who is signed in right now" — `null`
/// means signed out. The router's redirect logic watches this.
final authStateProvider = AsyncNotifierProvider<AuthStateNotifier, UserModel?>(
  AuthStateNotifier.new,
);

class AuthStateNotifier extends AsyncNotifier<UserModel?> {
  @override
  Future<UserModel?> build() async {
    // Re-run whenever a refresh-token failure forces a logout elsewhere.
    ref.watch(sessionExpiredProvider);

    final tokenStorage = ref.watch(tokenStorageProvider);
    if (!await tokenStorage.hasSession) return null;

    final result = await ref.watch(authRepositoryProvider).getMe();
    return result.when(
      success: (user) => user,
      failure: (_) => null,
    );
  }

  Future<Result<UserModel?>> register({
    required String firstName,
    required String lastName,
    String? email,
    String? phone,
    required String password,
    String? referralCode,
  }) async {
    final repo = ref.read(authRepositoryProvider);
    final sessionResult = await repo.register(
      firstName: firstName,
      lastName: lastName,
      email: email,
      phone: phone,
      password: password,
      referralCode: referralCode,
    );
    if (sessionResult.isFailure) return Result.failure(sessionResult.failureOrNull!);
    return _loadProfileAfterAuth(repo);
  }

  Future<Result<UserModel?>> login({
    String? email,
    String? phone,
    required String password,
    bool rememberMe = false,
  }) async {
    final repo = ref.read(authRepositoryProvider);
    final sessionResult = await repo.login(
      email: email,
      phone: phone,
      password: password,
      rememberMe: rememberMe,
    );
    if (sessionResult.isFailure) return Result.failure(sessionResult.failureOrNull!);
    return _loadProfileAfterAuth(repo);
  }

  /// After a successful register/login, tokens are already saved — fetch the
  /// full profile (the login/register response only embeds a slim summary)
  /// and publish it as the new auth state.
  Future<Result<UserModel?>> _loadProfileAfterAuth(AuthRepository repo) async {
    final meResult = await repo.getMe();
    if (meResult.isFailure) return Result.failure(meResult.failureOrNull!);
    state = AsyncData(meResult.valueOrNull);
    return Result.success(meResult.valueOrNull);
  }

  Future<Result<UserModel>> updateProfile({
    String? firstName,
    String? lastName,
    String? timezone,
    String? language,
  }) async {
    final result = await ref.read(authRepositoryProvider).updateProfile(
          firstName: firstName,
          lastName: lastName,
          timezone: timezone,
          language: language,
        );
    result.when(
      success: (user) => state = AsyncData(user),
      failure: (_) {},
    );
    return result;
  }

  Future<void> refreshProfile() async {
    final result = await ref.read(authRepositoryProvider).getMe();
    result.when(
      success: (user) => state = AsyncData(user),
      failure: (_) {},
    );
  }

  Future<void> logout() async {
    await ref.read(authRepositoryProvider).logout();
    state = const AsyncData(null);
  }
}
