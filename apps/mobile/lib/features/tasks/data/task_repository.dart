import 'package:dio/dio.dart';

import '../../../core/constants/api_endpoints.dart';
import '../../../core/errors/result.dart';
import '../../../core/network/failure_mapper.dart';
import '../../../shared/models/api_response.dart';
import 'models/task_submission_model.dart';
import 'models/text_suggestion_model.dart';

class TaskRepository {
  TaskRepository(this._dio);

  final Dio _dio;

  Future<Result<void>> startTask(String taskId) async {
    try {
      await _dio.post<void>(ApiEndpoints.taskStart(taskId));
      return const Result.success(null);
    } on DioException catch (e) {
      return Result.failure(mapDioExceptionToFailure(e));
    }
  }

  Future<Result<TaskSubmissionModel>> submitTask(
    String taskId, {
    String? filePath,
    String? externalUrl,
    String? textAnswer,
  }) async {
    try {
      final formData = FormData.fromMap({
        if (filePath != null) 'file': await MultipartFile.fromFile(filePath),
        if (externalUrl != null && externalUrl.isNotEmpty) 'externalUrl': externalUrl,
        if (textAnswer != null && textAnswer.isNotEmpty) 'textAnswer': textAnswer,
      });
      final response = await _dio.post<Map<String, dynamic>>(
        ApiEndpoints.taskSubmit(taskId),
        data: formData,
      );
      final submission = TaskSubmissionModel.fromJson(response.data!['data'] as Map<String, dynamic>);
      return Result.success(submission);
    } on DioException catch (e) {
      return Result.failure(mapDioExceptionToFailure(e));
    }
  }

  Future<Result<TextSuggestionModel>> getTextSuggestion(String taskId) async {
    try {
      final response = await _dio.get<Map<String, dynamic>>(ApiEndpoints.taskTextSuggestion(taskId));
      return Result.success(TextSuggestionModel.fromJson(response.data!['data'] as Map<String, dynamic>));
    } on DioException catch (e) {
      return Result.failure(mapDioExceptionToFailure(e));
    }
  }

  Future<Result<PaginatedResponse<TaskSubmissionModel>>> listMySubmissions({
    int page = 1,
    int limit = 20,
  }) async {
    try {
      final response = await _dio.get<Map<String, dynamic>>(
        ApiEndpoints.submissions,
        queryParameters: {'page': page, 'limit': limit},
      );
      final data = response.data!['data'] as Map<String, dynamic>;
      return Result.success(
        PaginatedResponse.fromJson(data, (json) => TaskSubmissionModel.fromJson(json as Map<String, dynamic>)),
      );
    } on DioException catch (e) {
      return Result.failure(mapDioExceptionToFailure(e));
    }
  }

  Future<Result<TaskSubmissionModel>> getSubmission(String submissionId) async {
    try {
      final response = await _dio.get<Map<String, dynamic>>(ApiEndpoints.submission(submissionId));
      return Result.success(TaskSubmissionModel.fromJson(response.data!['data'] as Map<String, dynamic>));
    } on DioException catch (e) {
      return Result.failure(mapDioExceptionToFailure(e));
    }
  }
}
