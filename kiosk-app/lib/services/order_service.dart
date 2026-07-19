import '../models/order.dart';
import 'api_client.dart';

class OrderService {
  final ApiClient _client;

  OrderService({ApiClient? client}) : _client = client ?? ApiClient();

  Future<ApiResult<CreateOrderResponse>> createOrder(
    CreateOrderRequest request,
  ) {
    return _client.postJson(
      '/api/orders',
      request.toJson(),
      (data) => CreateOrderResponse.fromJson(data as Map<String, dynamic>),
    );
  }

  /// Fire-and-forget-ish, mirroring the web app: the caller should ignore
  /// this result either way and proceed straight to polling order status.
  Future<void> reconcile({
    required String orderId,
    required String merchantTransactionId,
  }) async {
    try {
      await _client.postJson(
        '/api/orders/$orderId/reconcile',
        {'merchantTransactionId': merchantTransactionId},
        (data) => data,
      );
    } catch (_) {
      // Ignored intentionally - status polling is the source of truth.
    }
  }

  Future<ApiResult<OrderSummary>> getOrderStatus(String orderId) {
    return _client.getJson(
      '/api/orders/$orderId/status',
      (data) => OrderSummary.fromJson(data as Map<String, dynamic>),
    );
  }

  Future<ApiResult<void>> submitFeedback({
    required String orderId,
    required int rating,
  }) {
    return _client.postJson(
      '/api/orders/$orderId/feedback',
      {'rating': rating},
      (_) {},
    );
  }
}
