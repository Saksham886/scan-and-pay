import 'dart:async';
import 'dart:convert';

import 'package:http/http.dart' as http;

import '../config/constants.dart';

/// Not a status any server sends here — it's synthesised for a client-side
/// timeout so callers can treat it like any other transient failure.
const int _timeoutStatusCode = 408;

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

  bool get isTransientError =>
      statusCode == _timeoutStatusCode || statusCode == 429 || statusCode >= 500;
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
    try {
      final res = await _client.get(_uri(path)).timeout(kApiTimeout);
      return _parse(res, fromData);
    } on TimeoutException {
      return _timedOut<T>();
    }
  }

  /// A timed-out POST may still have been processed by the server, so callers
  /// must stay idempotent rather than assume nothing happened — order creation
  /// reuses its idempotencyKey precisely so a retry resolves to the same order
  /// instead of charging twice.
  Future<ApiResult<T>> postJson<T>(
    String path,
    Map<String, dynamic> body,
    T Function(dynamic) fromData,
  ) async {
    try {
      final res = await _client
          .post(
            _uri(path),
            headers: const {'Content-Type': 'application/json'},
            body: jsonEncode(body),
          )
          .timeout(kApiTimeout);
      return _parse(res, fromData);
    } on TimeoutException {
      return _timedOut<T>();
    }
  }

  ApiResult<T> _timedOut<T>() => ApiResult<T>(
        statusCode: _timeoutStatusCode,
        success: false,
        error: 'The server took too long to respond. Please try again.',
      );

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
