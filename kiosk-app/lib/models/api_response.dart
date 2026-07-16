class ApiResponse<T> {
  final bool success;
  final T? data;
  final String? error;

  ApiResponse({required this.success, this.data, this.error});

  factory ApiResponse.fromJson(
    Map<String, dynamic> json,
    T Function(dynamic) fromData,
  ) {
    return ApiResponse<T>(
      success: json['success'] == true,
      data: json['data'] != null ? fromData(json['data']) : null,
      error: json['error'] as String?,
    );
  }
}
