import 'dart:convert';
import 'dart:typed_data';

import 'package:dio/dio.dart';

import '../../../core/constants/api_endpoints.dart';
import '../../../core/errors/result.dart';
import '../../../core/network/failure_mapper.dart';
import '../../../shared/models/api_response.dart';
import 'models/bank_account_model.dart';
import 'models/reward_model.dart';
import 'models/transaction_history.dart';
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
    String? from,
    String? to,
    String? search,
  }) async {
    try {
      final response = await _dio.get<Map<String, dynamic>>(
        ApiEndpoints.walletTransactions,
        queryParameters: {
          'page': page,
          'limit': limit,
          'type': ?type,
          'from': ?from,
          'to': ?to,
          if (search != null && search.isNotEmpty) 'search': search,
        },
      );
      final data = response.data!['data'] as Map<String, dynamic>;
      return Result.success(
        PaginatedResponse.fromJson(data, (json) => WalletTransactionModel.fromJson(json as Map<String, dynamic>)),
      );
    } on DioException catch (e) {
      return Result.failure(mapDioExceptionToFailure(e));
    }
  }

  /// The history under the same filter as the list, as a CSV statement to hand to another app.
  Future<Result<TransactionExport>> exportTransactions({String? type, String? from, String? to, String? search}) async {
    try {
      final response = await _dio.get<List<int>>(
        ApiEndpoints.walletTransactionsExport,
        queryParameters: {
          'type': ?type,
          'from': ?from,
          'to': ?to,
          if (search != null && search.isNotEmpty) 'search': search,
        },
        options: Options(responseType: ResponseType.bytes),
      );
      return Result.success(
        TransactionExport(
          bytes: Uint8List.fromList(response.data ?? const []),
          filename: _filenameOf(response.headers.value('content-disposition')) ?? 'wallet-statement.csv',
          truncated: response.headers.value('x-export-truncated') == 'true',
        ),
      );
    } on DioException catch (e) {
      return Result.failure(mapDioExceptionToFailure(_withReadableBody(e)));
    }
  }

  /// The name the server gave the file, from `attachment; filename="wallet-statement-2026-09-21.csv"`.
  static String? _filenameOf(String? contentDisposition) {
    final match = RegExp('filename="([^"]+)"').firstMatch(contentDisposition ?? '');
    final name = match?.group(1);
    // Only a plain file name is used, so a server can not point the file somewhere else.
    return name != null && RegExp(r'^[\w.-]+$').hasMatch(name) ? name : null;
  }

  /// A download asks for raw bytes, so an error comes back as bytes too. Turns it back into the JSON the rest of the
  /// app reads its error messages from.
  static DioException _withReadableBody(DioException e) {
    final data = e.response?.data;
    if (data is List<int>) {
      try {
        e.response!.data = jsonDecode(utf8.decode(data));
      } catch (_) {
        // Not JSON: the caller gets the generic message.
      }
    }
    return e;
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

  Future<Result<void>> simulateAddFunds(double amount) async {
    try {
      await _dio.post<Map<String, dynamic>>(
        '${ApiEndpoints.wallet}/simulate-add-funds',
        data: {'amount': amount},
      );
      return const Result.success(null);
    } on DioException catch (e) {
      return Result.failure(mapDioExceptionToFailure(e));
    }
  }
}
