import 'dart:convert';

import 'package:http/http.dart' as http;

import '../config/constants.dart';

/// Wraps a decoded `{ success, data, error }` body together with the HTTP
/// status code, since callers (order-status polling) need the status code
/// to decide whether a failure is transient (429/5xx) and worth retrying.
class ApiResult<T> {
  final int statusCode;
  final bool success;
  final T? data;
  final String? error;

  ApiResult({
    required this.statusCode,
    required this.success,
    this.data,
    this.error,
  });

  bool get isTransientError => statusCode == 429 || statusCode >= 500;
}

class ApiClient {
  final String baseUrl;
  final http.Client _client;

  ApiClient({this.baseUrl = kApiBaseUrl, http.Client? client})
      : _client = client ?? http.Client();

  Uri _uri(String path) => Uri.parse('$baseUrl$path');

  Future<ApiResult<T>> getJson<T>(
    String path,
    T Function(dynamic) fromData,
  ) async {
    final res = await _client.get(_uri(path));
    return _parse(res, fromData);
  }

  Future<ApiResult<T>> postJson<T>(
    String path,
    Map<String, dynamic> body,
    T Function(dynamic) fromData,
  ) async {
    final res = await _client.post(
      _uri(path),
      headers: const {'Content-Type': 'application/json'},
      body: jsonEncode(body),
    );
    return _parse(res, fromData);
  }

  ApiResult<T> _parse<T>(http.Response res, T Function(dynamic) fromData) {
    Map<String, dynamic>? json;
    try {
      json = jsonDecode(res.body) as Map<String, dynamic>;
    } catch (_) {
      json = null;
    }

    if (json == null) {
      return ApiResult<T>(
        statusCode: res.statusCode,
        success: false,
        error: 'Unexpected server response (${res.statusCode})',
      );
    }

    final success = json['success'] == true;
    return ApiResult<T>(
      statusCode: res.statusCode,
      success: success,
      data: success && json['data'] != null ? fromData(json['data']) : null,
      error: json['error'] as String?,
    );
  }
}
