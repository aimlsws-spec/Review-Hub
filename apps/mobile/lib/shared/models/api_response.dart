/// Mirrors `ResponseTransformInterceptor`'s success envelope exactly:
/// `{success, statusCode, message, data, timestamp}`.
class ApiResponse<T> {
  const ApiResponse({
    required this.success,
    required this.statusCode,
    required this.message,
    required this.data,
    required this.timestamp,
  });

  factory ApiResponse.fromJson(
    Map<String, dynamic> json,
    T Function(dynamic json) fromJsonT,
  ) {
    return ApiResponse<T>(
      success: json['success'] as bool? ?? false,
      statusCode: json['statusCode'] as int? ?? 0,
      message: json['message'] as String? ?? '',
      data: json['data'] == null ? null : fromJsonT(json['data']),
      timestamp: json['timestamp'] as String? ?? '',
    );
  }

  final bool success;
  final int statusCode;
  final String message;
  final T? data;
  final String timestamp;
}

/// Mirrors the paginated shape used across list endpoints
/// (`PaginatedResponse<T>` on the backend): `{ data: T[], total, page, limit }`.
class PaginatedResponse<T> {
  const PaginatedResponse({
    required this.items,
    required this.total,
    required this.page,
    required this.limit,
  });

  factory PaginatedResponse.fromJson(
    Map<String, dynamic> json,
    T Function(dynamic json) fromJsonT,
  ) {
    final rawItems = json['data'] as List<dynamic>? ?? const [];
    return PaginatedResponse<T>(
      items: rawItems.map(fromJsonT).toList(),
      total: json['total'] as int? ?? 0,
      page: json['page'] as int? ?? 1,
      limit: json['limit'] as int? ?? rawItems.length,
    );
  }

  final List<T> items;
  final int total;
  final int page;
  final int limit;

  int get totalPages => limit == 0 ? 1 : (total / limit).ceil().clamp(1, 1 << 30);
  bool get hasMore => page < totalPages;
}
