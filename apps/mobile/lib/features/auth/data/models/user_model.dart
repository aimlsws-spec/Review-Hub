import 'package:freezed_annotation/freezed_annotation.dart';

part 'user_model.freezed.dart';
part 'user_model.g.dart';

/// The youngest and oldest age the backend accepts for a date of birth.
const int kMinUserAge = 13;
const int kMaxUserAge = 120;

/// What a person can say they are. The backend names these in capitals; this is the one place they are mapped.
enum UserGender {
  male('MALE', 'Male'),
  female('FEMALE', 'Female'),
  other('OTHER', 'Other');

  const UserGender(this.apiValue, this.label);

  final String apiValue;
  final String label;

  /// Null for a missing or unknown value, so a value added later on the server never crashes the app.
  static UserGender? fromApi(String? value) {
    for (final gender in UserGender.values) {
      if (gender.apiValue == value) return gender;
    }
    return null;
  }
}

/// A date as `YYYY-MM-DD`, the way the backend expects a date of birth. Only the calendar day is sent, never a time,
/// so the person's time zone can not move their birthday to another day.
String toApiDate(DateTime date) {
  final month = date.month.toString().padLeft(2, '0');
  final day = date.day.toString().padLeft(2, '0');
  return '${date.year.toString().padLeft(4, '0')}-$month-$day';
}

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
    /// `YYYY-MM-DD`, or null when the person has not said.
    String? dateOfBirth,
    String? gender,
    String? countryId,
    String? stateId,
    String? cityId,
    DateTime? createdAt,
  }) = _UserModel;

  factory UserModel.fromJson(Map<String, dynamic> json) => _$UserModelFromJson(json);
}

extension UserModelX on UserModel {
  String get fullName => '$firstName $lastName'.trim();
  String get initials => ((firstName.isNotEmpty ? firstName[0] : '') + (lastName.isNotEmpty ? lastName[0] : '')).toUpperCase();
  bool get isEmailVerified => emailVerifiedAt != null;
  bool get isPhoneVerified => phoneVerifiedAt != null;

  /// The saved date of birth as a calendar date, or null when missing or unreadable.
  DateTime? get birthDate {
    final raw = dateOfBirth;
    if (raw == null) return null;
    final parts = raw.split('-');
    if (parts.length != 3) return null;
    final year = int.tryParse(parts[0]);
    final month = int.tryParse(parts[1]);
    final day = int.tryParse(parts[2]);
    if (year == null || month == null || day == null) return null;
    return DateTime(year, month, day);
  }

  UserGender? get genderType => UserGender.fromApi(gender);
}
