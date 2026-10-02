import 'package:dio/dio.dart';

import '../../../core/constants/api_endpoints.dart';
import '../../../core/errors/result.dart';
import '../../../core/network/failure_mapper.dart';
import '../../../core/network/token_storage.dart';
import 'device_integrity.dart';
import 'models/auth_tokens_model.dart';
import 'models/login_challenge_model.dart';
import 'models/phone_change_request_model.dart';
import 'models/user_model.dart';
import 'otp_type.dart';

class AuthRepository {
  AuthRepository(this._dio, this._tokenStorage, [this._integrity]);

  final Dio _dio;
  final TokenStorage _tokenStorage;

  /// What the phone says about itself, sent with sign-in and registration so the backend can score the device's risk.
  /// Left out when there is no checker.
  final DeviceIntegrityChecker? _integrity;

  Future<Map<String, dynamic>> _deviceSignals() async {
    final integrity = await _integrity?.check();
    if (integrity == null) return const {};
    // Always both, true or false: a phone that is no longer rooted must be able to clear an earlier report.
    return {'isRooted': integrity.isRooted, 'isEmulator': integrity.isEmulator, 'isAutomationDetected': integrity.isAutomationDetected};
  }

  Future<Result<AuthSessionModel>> register({
    required String firstName,
    required String lastName,
    String? email,
    String? phone,
    required String password,
    required bool acceptPolicies,
    String? referralCode,
  }) async {
    try {
      final response = await _dio.post<Map<String, dynamic>>(
        ApiEndpoints.register,
        data: {
          'firstName': firstName,
          'lastName': lastName,
          if (email != null && email.isNotEmpty) 'email': email,
          if (phone != null && phone.isNotEmpty) 'phone': phone,
          'password': password,
          'acceptPolicies': acceptPolicies,
          if (referralCode != null && referralCode.isNotEmpty) 'referralCode': referralCode,
          ...await _deviceSignals(),
        },
      );
      final session = AuthSessionModel.fromJson(response.data!['data'] as Map<String, dynamic>);
      await _persistSession(session);
      return Result.success(session);
    } on DioException catch (e) {
      return Result.failure(mapDioExceptionToFailure(e));
    }
  }

  /// Signs in with a password. From a device the account has not used before, no session is saved yet: the result is
  /// a [LoginNeedsDeviceCode] to finish with [verifyNewDevice].
  Future<Result<LoginOutcome>> login({
    String? email,
    String? phone,
    required String password,
    bool rememberMe = false,
  }) async {
    try {
      final response = await _dio.post<Map<String, dynamic>>(
        ApiEndpoints.login,
        data: {
          if (email != null && email.isNotEmpty) 'email': email,
          if (phone != null && phone.isNotEmpty) 'phone': phone,
          'password': password,
          'rememberMe': rememberMe,
          ...await _deviceSignals(),
        },
      );
      final outcome = LoginOutcome.fromJson(response.data!['data'] as Map<String, dynamic>);
      if (outcome is LoginSignedIn) await _persistSession(outcome.session);
      return Result.success(outcome);
    } on DioException catch (e) {
      return Result.failure(mapDioExceptionToFailure(e));
    }
  }

  /// Finishes a sign-in from a new device with the code that was sent. The device id header (added to every
  /// request) must match the device that started the sign-in.
  Future<Result<AuthSessionModel>> verifyNewDevice({required String challengeToken, required String code}) async {
    try {
      final response = await _dio.post<Map<String, dynamic>>(
        ApiEndpoints.loginVerifyDevice,
        data: {'challengeToken': challengeToken, 'code': code},
      );
      final session = AuthSessionModel.fromJson(response.data!['data'] as Map<String, dynamic>);
      await _persistSession(session);
      return Result.success(session);
    } on DioException catch (e) {
      return Result.failure(mapDioExceptionToFailure(e));
    }
  }

  Future<Result<void>> resendNewDeviceCode(String challengeToken) async {
    try {
      await _dio.post<void>(ApiEndpoints.loginResendDeviceCode, data: {'challengeToken': challengeToken});
      return const Result.success(null);
    } on DioException catch (e) {
      return Result.failure(mapDioExceptionToFailure(e));
    }
  }

  /// Starts a phone number change: a code goes by SMS to [newPhone].
  Future<Result<PhoneChangeRequestModel>> requestPhoneChange({required String newPhone, String? currentPassword}) async {
    try {
      final response = await _dio.post<Map<String, dynamic>>(
        ApiEndpoints.phoneChange,
        data: {'newPhone': newPhone, 'currentPassword': ?currentPassword},
      );
      return Result.success(PhoneChangeRequestModel.fromJson(response.data!['data'] as Map<String, dynamic>));
    } on DioException catch (e) {
      return Result.failure(mapDioExceptionToFailure(e));
    }
  }

  Future<Result<void>> verifyPhoneChange(String code) async {
    try {
      await _dio.post<void>(ApiEndpoints.phoneVerify, data: {'code': code});
      return const Result.success(null);
    } on DioException catch (e) {
      return Result.failure(mapDioExceptionToFailure(e));
    }
  }

  /// Deletes the account. On success the local session is cleared too, since the server has already revoked it.
  Future<Result<void>> deleteAccount({String? currentPassword}) async {
    try {
      await _dio.delete<void>(ApiEndpoints.account, data: {'currentPassword': ?currentPassword});
      await _tokenStorage.clear();
      return const Result.success(null);
    } on DioException catch (e) {
      return Result.failure(mapDioExceptionToFailure(e));
    }
  }

  Future<Result<AuthSessionModel>> socialLogin(String provider, String idToken, {String? firstName, String? lastName, String? avatarUrl}) async {
    try {
      final response = await _dio.post<Map<String, dynamic>>(
        '/auth/$provider/mobile',
        data: {
          'idToken': idToken,
          'firstName': ?firstName,
          'lastName': ?lastName,
          'avatarUrl': ?avatarUrl,
          ...await _deviceSignals(),
        },
      );
      final session = AuthSessionModel.fromJson(response.data!['data'] as Map<String, dynamic>);
      await _persistSession(session);
      return Result.success(session);
    } on DioException catch (e) {
      return Result.failure(mapDioExceptionToFailure(e));
    }
  }

  Future<Result<UserModel>> getMe() async {
    try {
      final response = await _dio.get<Map<String, dynamic>>(ApiEndpoints.me);
      final user = UserModel.fromJson(response.data!['data'] as Map<String, dynamic>);
      return Result.success(user);
    } on DioException catch (e) {
      return Result.failure(mapDioExceptionToFailure(e));
    }
  }

  Future<Result<UserModel>> updateProfile({
    String? firstName,
    String? lastName,
    String? timezone,
    String? language,
  }) async {
    try {
      final response = await _dio.patch<Map<String, dynamic>>(
        ApiEndpoints.profile,
        data: {
          'firstName': ?firstName,
          'lastName': ?lastName,
          'timezone': ?timezone,
          'language': ?language,
        },
      );
      return Result.success(UserModel.fromJson(response.data!['data'] as Map<String, dynamic>));
    } on DioException catch (e) {
      return Result.failure(mapDioExceptionToFailure(e));
    }
  }

  /// Saves the edit-profile form. Unlike [updateProfile], every detail is always sent, and a `null` means "remove
  /// what was saved": the form on screen is exactly what ends up saved.
  Future<Result<UserModel>> updateProfileDetails({
    required String firstName,
    required String lastName,
    required String? dateOfBirth,
    required String? gender,
    required String? stateId,
    required String? cityId,
  }) async {
    try {
      final response = await _dio.patch<Map<String, dynamic>>(
        ApiEndpoints.profile,
        data: {
          'firstName': firstName,
          'lastName': lastName,
          'dateOfBirth': dateOfBirth,
          'gender': gender,
          'stateId': stateId,
          'cityId': cityId,
        },
      );
      return Result.success(UserModel.fromJson(response.data!['data'] as Map<String, dynamic>));
    } on DioException catch (e) {
      return Result.failure(mapDioExceptionToFailure(e));
    }
  }

  Future<Result<void>> changePassword({required String currentPassword, required String newPassword}) async {
    try {
      await _dio.patch<void>(
        ApiEndpoints.changePassword,
        data: {'currentPassword': currentPassword, 'newPassword': newPassword},
      );
      return const Result.success(null);
    } on DioException catch (e) {
      return Result.failure(mapDioExceptionToFailure(e));
    }
  }

  Future<Result<void>> updatePushToken(String pushToken) async {
    try {
      await _dio.patch<void>(ApiEndpoints.devicePushToken, data: {'pushToken': pushToken});
      return const Result.success(null);
    } on DioException catch (e) {
      return Result.failure(mapDioExceptionToFailure(e));
    }
  }

  Future<Result<void>> logout() async {
    try {
      await _dio.post<void>(ApiEndpoints.logout);
    } on DioException {
      // Best-effort — the local session is cleared regardless below.
    }
    await _tokenStorage.clear();
    return const Result.success(null);
  }

  Future<Result<void>> sendOtp(OtpType type) async {
    try {
      await _dio.post<void>(ApiEndpoints.sendOtp, data: {'type': type.value});
      return const Result.success(null);
    } on DioException catch (e) {
      return Result.failure(mapDioExceptionToFailure(e));
    }
  }

  Future<Result<void>> verifyOtp(OtpType type, String code) async {
    try {
      await _dio.post<void>(ApiEndpoints.verifyOtp, data: {'type': type.value, 'code': code});
      return const Result.success(null);
    } on DioException catch (e) {
      return Result.failure(mapDioExceptionToFailure(e));
    }
  }

  Future<Result<void>> resendOtp(OtpType type) async {
    try {
      await _dio.post<void>(ApiEndpoints.resendOtp, data: {'type': type.value});
      return const Result.success(null);
    } on DioException catch (e) {
      return Result.failure(mapDioExceptionToFailure(e));
    }
  }

  Future<Result<void>> forgotPassword({String? email, String? phone}) async {
    try {
      await _dio.post<void>(
        ApiEndpoints.forgotPassword,
        data: {
          if (email != null && email.isNotEmpty) 'email': email,
          if (phone != null && phone.isNotEmpty) 'phone': phone,
        },
      );
      return const Result.success(null);
    } on DioException catch (e) {
      return Result.failure(mapDioExceptionToFailure(e));
    }
  }

  Future<Result<void>> resetPassword({
    String? email,
    String? phone,
    required String code,
    required String password,
  }) async {
    try {
      await _dio.post<void>(
        ApiEndpoints.resetPassword,
        data: {
          if (email != null && email.isNotEmpty) 'email': email,
          if (phone != null && phone.isNotEmpty) 'phone': phone,
          'code': code,
          'password': password,
        },
      );
      return const Result.success(null);
    } on DioException catch (e) {
      return Result.failure(mapDioExceptionToFailure(e));
    }
  }

  Future<void> _persistSession(AuthSessionModel session) {
    return _tokenStorage.saveTokens(
      accessToken: session.tokens.accessToken,
      refreshToken: session.tokens.refreshToken,
    );
  }
}
