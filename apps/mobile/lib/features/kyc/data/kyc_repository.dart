import 'package:dio/dio.dart';

import '../../../core/constants/api_endpoints.dart';
import '../../../core/errors/result.dart';
import '../../../core/network/failure_mapper.dart';
import 'models/kyc_document_model.dart';

class KycRepository {
  KycRepository(this._dio);

  final Dio _dio;

  Future<Result<KycDocumentModel>> uploadDocument({
    required String documentType,
    String? documentNumber,
    required String filePath,
  }) async {
    try {
      final formData = FormData.fromMap({
        'file': await MultipartFile.fromFile(filePath),
        'documentType': documentType,
        if (documentNumber != null && documentNumber.isNotEmpty) 'documentNumber': documentNumber,
      });
      final response = await _dio.post<Map<String, dynamic>>(ApiEndpoints.kycDocuments, data: formData);
      return Result.success(KycDocumentModel.fromJson(response.data!['data'] as Map<String, dynamic>));
    } on DioException catch (e) {
      return Result.failure(mapDioExceptionToFailure(e));
    }
  }

  Future<Result<List<KycDocumentModel>>> getDocuments() async {
    try {
      final response = await _dio.get<Map<String, dynamic>>(ApiEndpoints.kycDocuments);
      final rawItems = response.data!['data'] as List<dynamic>;
      return Result.success(rawItems.map((json) => KycDocumentModel.fromJson(json as Map<String, dynamic>)).toList());
    } on DioException catch (e) {
      return Result.failure(mapDioExceptionToFailure(e));
    }
  }
}
