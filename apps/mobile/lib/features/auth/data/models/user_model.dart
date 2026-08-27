import 'package:freezed_annotation/freezed_annotation.dart';

part 'user_model.freezed.dart';
part 'user_model.g.dart';

/// Mirrors `AuthService.getProfile()`'s `UserProfile` return shape exactly
/// (apps/backend/src/modules/auth/services/auth.service.ts).
@freezed
abstract class UserModel with _$UserModel {
  const factory UserModel({
    required String id,
    required String firstName,
    required String lastName,
    String? email,
    String? phone,
    String? avatarUrl,
    required String status,
    DateTime? emailVerifiedAt,
    DateTime? phoneVerifiedAt,
    @Default(false) bool isTwoFactorEnabled,
    String? referralCode,
    String? timezone,
    String? language,
    DateTime? createdAt,
  }) = _UserModel;

  factory UserModel.fromJson(Map<String, dynamic> json) => _$UserModelFromJson(json);
}

extension UserModelX on UserModel {
  String get fullName => '$firstName $lastName'.trim();
  String get initials => ((firstName.isNotEmpty ? firstName[0] : '') + (lastName.isNotEmpty ? lastName[0] : '')).toUpperCase();
  bool get isEmailVerified => emailVerifiedAt != null;
  bool get isPhoneVerified => phoneVerifiedAt != null;
}
