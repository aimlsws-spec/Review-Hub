import 'package:dio/dio.dart';

import '../../../core/constants/api_endpoints.dart';
import '../../../core/errors/result.dart';
import '../../../core/network/failure_mapper.dart';
import '../../../shared/models/api_response.dart';
import 'models/bank_account_model.dart';
import 'models/reward_model.dart';
import 'models/wallet_summary_model.dart';
import 'models/wallet_transaction_model.dart';
import 'models/withdrawal_model.dart';

class WalletRepository {
  WalletRepository(this._dio);

  final Dio _dio;

  Future<Result<WalletSummaryModel>> getWallet() async {
    try {
      final response = await _dio.get<Map<String, dynamic>>(ApiEndpoints.wallet);
      return Result.success(WalletSummaryModel.fromJson(response.data!['data'] as Map<String, dynamic>));
    } on DioException catch (e) {
      return Result.failure(mapDioExceptionToFailure(e));
    }
  }

  Future<Result<PaginatedResponse<WalletTransactionModel>>> getTransactions({
    int page = 1,
    int limit = 20,
    String? type,
  }) async {
    try {
      final response = await _dio.get<Map<String, dynamic>>(
        ApiEndpoints.walletTransactions,
        queryParameters: {'page': page, 'limit': limit, 'type': ?type},
      );
      final data = response.data!['data'] as Map<String, dynamic>;
      return Result.success(
        PaginatedResponse.fromJson(data, (json) => WalletTransactionModel.fromJson(json as Map<String, dynamic>)),
      );
    } on DioException catch (e) {
      return Result.failure(mapDioExceptionToFailure(e));
    }
  }

  Future<Result<PaginatedResponse<RewardModel>>> getRewards({int page = 1, int limit = 20, String? status}) async {
    try {
      final response = await _dio.get<Map<String, dynamic>>(
        ApiEndpoints.walletRewards,
        queryParameters: {'page': page, 'limit': limit, 'status': ?status},
      );
      final data = response.data!['data'] as Map<String, dynamic>;
      return Result.success(
        PaginatedResponse.fromJson(data, (json) => RewardModel.fromJson(json as Map<String, dynamic>)),
      );
    } on DioException catch (e) {
      return Result.failure(mapDioExceptionToFailure(e));
    }
  }

  Future<Result<List<BankAccountModel>>> getBankAccounts() async {
    try {
      final response = await _dio.get<Map<String, dynamic>>(ApiEndpoints.bankAccounts);
      final rawList = response.data!['data'] as List<dynamic>;
      return Result.success(rawList.map((json) => BankAccountModel.fromJson(json as Map<String, dynamic>)).toList());
    } on DioException catch (e) {
      return Result.failure(mapDioExceptionToFailure(e));
    }
  }

  Future<Result<BankAccountModel>> addBankAccount({
    required String bankName,
    required String accountHolderName,
    required String accountNumber,
    required String ifscCode,
    String? branch,
    String? upiId,
    bool isPrimary = false,
  }) async {
    try {
      final response = await _dio.post<Map<String, dynamic>>(
        ApiEndpoints.bankAccounts,
        data: {
          'bankName': bankName,
          'accountHolderName': accountHolderName,
          'accountNumber': accountNumber,
          'ifscCode': ifscCode,
          if (branch != null && branch.isNotEmpty) 'branch': branch,
          if (upiId != null && upiId.isNotEmpty) 'upiId': upiId,
          'isPrimary': isPrimary,
        },
      );
      return Result.success(BankAccountModel.fromJson(response.data!['data'] as Map<String, dynamic>));
    } on DioException catch (e) {
      return Result.failure(mapDioExceptionToFailure(e));
    }
  }

  Future<Result<WithdrawalModel>> requestWithdrawal({
    required double amount,
    required String bankAccountId,
  }) async {
    try {
      final response = await _dio.post<Map<String, dynamic>>(
        ApiEndpoints.withdrawals,
        data: {'amount': amount, 'bankAccountId': bankAccountId},
      );
      return Result.success(WithdrawalModel.fromJson(response.data!['data'] as Map<String, dynamic>));
    } on DioException catch (e) {
      return Result.failure(mapDioExceptionToFailure(e));
    }
  }

  Future<Result<PaginatedResponse<WithdrawalModel>>> getWithdrawals({int page = 1, int limit = 20}) async {
    try {
      final response = await _dio.get<Map<String, dynamic>>(
        ApiEndpoints.withdrawals,
        queryParameters: {'page': page, 'limit': limit},
      );
      final data = response.data!['data'] as Map<String, dynamic>;
      return Result.success(
        PaginatedResponse.fromJson(data, (json) => WithdrawalModel.fromJson(json as Map<String, dynamic>)),
      );
    } on DioException catch (e) {
      return Result.failure(mapDioExceptionToFailure(e));
    }
  }
}
