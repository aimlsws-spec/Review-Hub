import 'package:freezed_annotation/freezed_annotation.dart';

part 'auth_tokens_model.freezed.dart';
part 'auth_tokens_model.g.dart';

/// Mirrors the `tokens` object returned by `/auth/register`, `/auth/login`,
/// and `/auth/refresh`.
@freezed
abstract class AuthTokensModel with _$AuthTokensModel {
  const factory AuthTokensModel({
    required String accessToken,
    required String refreshToken,
    required int expiresIn,
  }) = _AuthTokensModel;

  factory AuthTokensModel.fromJson(Map<String, dynamic> json) => _$AuthTokensModelFromJson(json);
}

/// The full `{user, tokens}` payload from register/login.
@freezed
abstract class AuthSessionModel with _$AuthSessionModel {
  const factory AuthSessionModel({
    required UserAuthSummary user,
    required AuthTokensModel tokens,
  }) = _AuthSessionModel;

  factory AuthSessionModel.fromJson(Map<String, dynamic> json) => _$AuthSessionModelFromJson(json);
}

/// The slimmer user object embedded directly in the login/register response
/// (as distinct from the fuller `UserModel` returned by `GET /auth/me`).
@freezed
abstract class UserAuthSummary with _$UserAuthSummary {
  const factory UserAuthSummary({
    required String id,
    required String firstName,
    required String lastName,
    String? email,
    String? phone,
    String? avatarUrl,
    required String status,
    @Default(false) bool isTwoFactorEnabled,
  }) = _UserAuthSummary;

  factory UserAuthSummary.fromJson(Map<String, dynamic> json) => _$UserAuthSummaryFromJson(json);
}
