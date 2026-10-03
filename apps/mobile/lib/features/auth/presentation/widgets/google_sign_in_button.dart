import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_sign_in/google_sign_in.dart';

import '../../../../core/config/app_config.dart';
import '../../../../core/router/route_paths.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../shared/widgets/error_banner.dart';
import '../../data/models/login_challenge_model.dart';
import '../../providers/auth_providers.dart';

/// Signs in with the Google account on the phone, creating the VIRAL KAR account the first time.
///
/// Signing in and signing up are the same step with Google, so the login and sign-up screens share this.
final googleSignInProvider = AsyncNotifierProvider.autoDispose<GoogleSignInNotifier, void>(GoogleSignInNotifier.new);

/// Google's plugin must be initialised exactly once per app run; a second call fails.
Future<void>? _googleInitialised;

class GoogleSignInNotifier extends AsyncNotifier<void> {
  @override
  Future<void> build() async {}

  /// `signedIn` when done, a `challenge` when this device is new to the account and needs the emailed code first,
  /// neither when the person backed out or it failed (the reason is in `state`).
  Future<({bool signedIn, LoginChallengeModel? challenge})> signIn() async {
    const notSignedIn = (signedIn: false, challenge: null);
    state = const AsyncLoading();
    try {
      final googleSignIn = GoogleSignIn.instance;
      await (_googleInitialised ??= googleSignIn.initialize(
        serverClientId: AppConfig.googleServerClientId.isEmpty ? null : AppConfig.googleServerClientId,
      ));
      final account = await googleSignIn.authenticate();
      final idToken = account.authentication.idToken;
      if (idToken == null) {
        state = AsyncError('Google did not return a usable sign-in token.', StackTrace.current);
        return notSignedIn;
      }

      final names = account.displayName?.trim().split(RegExp(r'\s+')) ?? const <String>[];
      final result = await ref
          .read(authStateProvider.notifier)
          .socialLogin(
            provider: 'google',
            idToken: idToken,
            firstName: names.isEmpty ? null : names.first,
            lastName: names.length < 2 ? null : names.skip(1).join(' '),
            avatarUrl: account.photoUrl,
          );
      if (result.isFailure) {
        state = AsyncError(result.failureOrNull?.message ?? 'Could not sign in. Please try again.', StackTrace.current);
        return notSignedIn;
      }
      state = const AsyncData(null);
      final challenge = result.valueOrNull;
      return (signedIn: challenge == null, challenge: challenge);
    } on GoogleSignInException catch (e) {
      state = switch (e.code) {
        // Google reports an app it does not recognise (package name and signing key not registered in Google Cloud)
        // as "canceled" too, with this description. Saying nothing then looks like a button that does nothing.
        GoogleSignInExceptionCode.canceled when (e.description ?? '').contains('[16]') => AsyncError(
          'Google sign-in is not set up for this version of the app yet. Please sign in with email or phone.',
          StackTrace.current,
        ),
        GoogleSignInExceptionCode.canceled => const AsyncData(null),
        _ => AsyncError('Could not sign in with Google. Please try again.', StackTrace.current),
      };
      return notSignedIn;
    } catch (_) {
      state = AsyncError('Could not sign in with Google. Please try again.', StackTrace.current);
      return notSignedIn;
    }
  }
}

/// "Continue with Google", and what went wrong if it did not work. Goes on to the device code or Home by itself.
class GoogleSignInButton extends ConsumerWidget {
  const GoogleSignInButton({super.key, this.label = 'Continue with Google'});

  final String label;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(googleSignInProvider);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (state.hasError) ...[ErrorBanner(state.error.toString()), const SizedBox(height: 12)],
        OutlinedButton.icon(
          onPressed: state.isLoading
              ? null
              : () async {
                  final outcome = await ref.read(googleSignInProvider.notifier).signIn();
                  if (!context.mounted) return;
                  if (outcome.challenge != null) {
                    await context.push(RoutePaths.newDeviceVerification, extra: outcome.challenge);
                  } else if (outcome.signedIn) {
                    context.go(RoutePaths.home);
                  }
                },
          icon: state.isLoading
              ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2))
              : const Icon(Icons.g_mobiledata, color: AppColors.slate900, size: 32),
          label: Text(label, style: const TextStyle(color: AppColors.slate900)),
          style: OutlinedButton.styleFrom(
            minimumSize: const Size(double.infinity, 50),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          ),
        ),
      ],
    );
  }
}
