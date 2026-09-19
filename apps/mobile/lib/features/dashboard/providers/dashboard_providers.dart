import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../shared/models/api_response.dart';
import '../../../../shared/providers/core_providers.dart';
import '../data/models/home_dashboard_model.dart';

final homeDashboardProvider = FutureProvider.autoDispose<HomeDashboardModel>((ref) async {
  final dio = ref.watch(dioProvider);
  final response = await dio.get('/dashboard/home');
  final apiResponse = ApiResponse<HomeDashboardModel>.fromJson(
    response.data,
    (json) => HomeDashboardModel.fromJson(json as Map<String, dynamic>),
  );
  return apiResponse.data!;
});
