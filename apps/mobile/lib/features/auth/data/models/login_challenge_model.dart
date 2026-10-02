import 'package:freezed_annotation/freezed_annotation.dart';

import 'auth_tokens_model.dart';

part 'login_challenge_model.freezed.dart';
part 'login_challenge_model.g.dart';

/// What `/auth/login` returns instead of tokens when the sign-in comes from a device the account has not used before.
/// The code that was sent is typed in on the new-device screen and sent back with [challengeToken].
@freezed
abstract class LoginChallengeModel with _$LoginChallengeModel {
  const factory LoginChallengeModel({
    required String challengeToken,

    /// Seconds until the code expires.
    required int expiresIn,

    /// Masked email and/or phone the code went to, e.g. `j****n@example.com`.
    @Default(<String>[]) List<String> sentTo,
  }) = _LoginChallengeModel;

  factory LoginChallengeModel.fromJson(Map<String, dynamic> json) => _$LoginChallengeModelFromJson(json);
}

/// How a password sign-in ended: signed in, or waiting for the new-device code.
sealed class LoginOutcome {
  const LoginOutcome();

  /// Reads either shape of the `/auth/login` response.
  factory LoginOutcome.fromJson(Map<String, dynamic> json) => json['requiresVerification'] == true
      ? LoginNeedsDeviceCode(LoginChallengeModel.fromJson(json))
      : LoginSignedIn(AuthSessionModel.fromJson(json));
}

final class LoginSignedIn extends LoginOutcome {
  const LoginSignedIn(this.session);
  final AuthSessionModel session;
}

final class LoginNeedsDeviceCode extends LoginOutcome {
  const LoginNeedsDeviceCode(this.challenge);
  final LoginChallengeModel challenge;
}
