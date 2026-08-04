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

  /// Actively reconciles the payment against the gateway and returns the
  /// resulting order status in a single call — the native-QR screen polls this
  /// while the customer scans and pays. Unlike [reconcile], the caller uses the
  /// result. A 202 ("still pending") arrives as success:false / data:null,
  /// which the caller treats as "keep waiting", never as a failure.
  Future<ApiResult<OrderSummary>> reconcileForStatus({
    required String orderId,
    required String merchantTransactionId,
  }) {
    return _client.postJson(
      '/api/orders/$orderId/reconcile',
      {'merchantTransactionId': merchantTransactionId},
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
