import 'package:dio/dio.dart';

import '../../../core/constants/api_endpoints.dart';
import '../../../core/errors/result.dart';
import '../../../core/network/failure_mapper.dart';
import '../../../shared/models/api_response.dart';
import 'models/support_message_model.dart';
import 'models/support_ticket_model.dart';

class SupportRepository {
  SupportRepository(this._dio);

  final Dio _dio;

  Future<Result<SupportTicketModel>> createTicket({
    required String subject,
    required String description,
    String? category,
    String? priority,
  }) async {
    try {
      final response = await _dio.post<Map<String, dynamic>>(
        ApiEndpoints.supportTickets,
        data: {
          'subject': subject,
          'description': description,
          'category': ?category,
          'priority': ?priority,
        },
      );
      return Result.success(SupportTicketModel.fromJson(response.data!['data'] as Map<String, dynamic>));
    } on DioException catch (e) {
      return Result.failure(mapDioExceptionToFailure(e));
    }
  }

  Future<Result<PaginatedResponse<SupportTicketModel>>> listMine({
    int page = 1,
    int limit = 20,
    String? status,
    String? category,
    String? priority,
  }) async {
    try {
      final response = await _dio.get<Map<String, dynamic>>(
        ApiEndpoints.supportTickets,
        queryParameters: {
          'page': page,
          'limit': limit,
          'status': ?status,
          'category': ?category,
          'priority': ?priority,
        },
      );
      final data = response.data!['data'] as Map<String, dynamic>;
      return Result.success(
        PaginatedResponse.fromJson(data, (json) => SupportTicketModel.fromJson(json as Map<String, dynamic>)),
      );
    } on DioException catch (e) {
      return Result.failure(mapDioExceptionToFailure(e));
    }
  }

  Future<Result<SupportTicketModel>> getTicket(String ticketId) async {
    try {
      final response = await _dio.get<Map<String, dynamic>>(ApiEndpoints.supportTicket(ticketId));
      return Result.success(SupportTicketModel.fromJson(response.data!['data'] as Map<String, dynamic>));
    } on DioException catch (e) {
      return Result.failure(mapDioExceptionToFailure(e));
    }
  }

  Future<Result<SupportMessageModel>> reply(String ticketId, String message) async {
    try {
      final response = await _dio.post<Map<String, dynamic>>(
        ApiEndpoints.supportTicketMessages(ticketId),
        data: {'message': message},
      );
      return Result.success(SupportMessageModel.fromJson(response.data!['data'] as Map<String, dynamic>));
    } on DioException catch (e) {
      return Result.failure(mapDioExceptionToFailure(e));
    }
  }
}
