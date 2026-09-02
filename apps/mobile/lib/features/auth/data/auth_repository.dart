import 'package:dio/dio.dart';

import '../../../core/constants/api_endpoints.dart';
import '../../../core/errors/result.dart';
import '../../../core/network/failure_mapper.dart';
import '../../../core/network/token_storage.dart';
import 'models/auth_tokens_model.dart';
import 'models/user_model.dart';
import 'otp_type.dart';

class AuthRepository {
  AuthRepository(this._dio, this._tokenStorage);

  final Dio _dio;
  final TokenStorage _tokenStorage;

  Future<Result<AuthSessionModel>> register({
    required String firstName,
    required String lastName,
    String? email,
    String? phone,
    required String password,
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
          if (referralCode != null && referralCode.isNotEmpty) 'referralCode': referralCode,
        },
      );
      final session = AuthSessionModel.fromJson(response.data!['data'] as Map<String, dynamic>);
      await _persistSession(session);
      return Result.success(session);
    } on DioException catch (e) {
      return Result.failure(mapDioExceptionToFailure(e));
    }
  }

  Future<Result<AuthSessionModel>> login({
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
