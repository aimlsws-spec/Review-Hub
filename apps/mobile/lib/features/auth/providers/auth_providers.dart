import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/errors/failure.dart';
import '../../../core/errors/result.dart';
import '../../../shared/providers/core_providers.dart';
import '../data/auth_repository.dart';
import '../data/device_integrity.dart';
import '../data/models/user_model.dart';

/// The phone's own report on whether it looks rooted or emulated.
final deviceIntegrityCheckerProvider = Provider<DeviceIntegrityChecker>((ref) => PlatformDeviceIntegrityChecker());

final authRepositoryProvider = Provider<AuthRepository>((ref) {
  return AuthRepository(ref.watch(dioProvider), ref.watch(tokenStorageProvider), ref.watch(deviceIntegrityCheckerProvider));
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
      // A network failure means we couldn't check, not that the user is
      // logged out — surface it as an error so the splash screen can offer
      // a retry instead of silently bouncing a real session to /login.
      failure: (f) => f is NetworkFailure ? throw f : null,
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
      // Merge only the fields this call actually changed rather than trusting
      // the response as a full replacement — if this endpoint's response
      // shape ever narrows to a partial payload, a wholesale `state = AsyncData(user)`
      // would silently drop everything else cached on the profile (avatarUrl,
      // verification timestamps, etc.). Fall back to the raw response only if
      // there's no cached profile to merge into yet.
      success: (user) {
        final current = state.value;
        state = AsyncData(current == null
            ? user
            : current.copyWith(
                firstName: firstName ?? current.firstName,
                lastName: lastName ?? current.lastName,
                timezone: timezone ?? current.timezone,
                language: language ?? current.language,
              ));
      },
      failure: (_) {},
    );
    return result;
  }

  /// Saves the edit-profile form and shows the result everywhere. The server works out the country from the chosen
  /// state, so the details are taken from its answer, not from what was sent.
  Future<Result<UserModel>> updateProfileDetails({
    required String firstName,
    required String lastName,
    required String? dateOfBirth,
    required String? gender,
    required String? stateId,
    required String? cityId,
  }) async {
    final result = await ref.read(authRepositoryProvider).updateProfileDetails(
          firstName: firstName,
          lastName: lastName,
          dateOfBirth: dateOfBirth,
          gender: gender,
          stateId: stateId,
          cityId: cityId,
        );
    result.when(
      success: (user) {
        final current = state.value;
        state = AsyncData(current == null
            ? user
            : current.copyWith(
                firstName: user.firstName,
                lastName: user.lastName,
                dateOfBirth: user.dateOfBirth,
                gender: user.gender,
                countryId: user.countryId,
                stateId: user.stateId,
                cityId: user.cityId,
              ));
      },
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
