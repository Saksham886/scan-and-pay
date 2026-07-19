enum OrderStatus {
  created,
  paymentPending,
  paid,
  preparing,
  ready,
  completed,
  cancelled,
  failed;

  static OrderStatus fromWire(String raw) {
    switch (raw) {
      case 'CREATED':
        return OrderStatus.created;
      case 'PAYMENT_PENDING':
        return OrderStatus.paymentPending;
      case 'PAID':
        return OrderStatus.paid;
      case 'PREPARING':
        return OrderStatus.preparing;
      case 'READY':
        return OrderStatus.ready;
      case 'COMPLETED':
        return OrderStatus.completed;
      case 'CANCELLED':
        return OrderStatus.cancelled;
      case 'FAILED':
        return OrderStatus.failed;
      default:
        throw ArgumentError('Unknown order status: $raw');
    }
  }

  bool get isPaidOrBeyond =>
      this == OrderStatus.paid ||
      this == OrderStatus.preparing ||
      this == OrderStatus.ready ||
      this == OrderStatus.completed;

  bool get isFailedOrCancelled =>
      this == OrderStatus.failed || this == OrderStatus.cancelled;

  bool get isTerminal =>
      this == OrderStatus.completed ||
      this == OrderStatus.cancelled ||
      this == OrderStatus.failed;
}

class CreateOrderRequest {
  final String cafeSlug;
  final List<Map<String, dynamic>> items;
  final String customerName;
  final String customerPhone;
  final String? customerEmail;
  final String? notes;
  final String idempotencyKey;

  CreateOrderRequest({
    required this.cafeSlug,
    required this.items,
    required this.customerName,
    required this.customerPhone,
    this.customerEmail,
    this.notes,
    required this.idempotencyKey,
  });

  Map<String, dynamic> toJson() {
    return {
      'cafeSlug': cafeSlug,
      'items': items,
      'customerName': customerName,
      'customerPhone': customerPhone,
      if (customerEmail != null && customerEmail!.isNotEmpty)
        'customerEmail': customerEmail,
      if (notes != null && notes!.isNotEmpty) 'notes': notes,
      'idempotencyKey': idempotencyKey,
    };
  }
}

class CreateOrderResponse {
  final String orderId;
  final String orderNumber;
  final int totalPaise;
  final String paymentRedirectUrl;

  CreateOrderResponse({
    required this.orderId,
    required this.orderNumber,
    required this.totalPaise,
    required this.paymentRedirectUrl,
  });

  factory CreateOrderResponse.fromJson(Map<String, dynamic> json) {
    return CreateOrderResponse(
      orderId: json['orderId'] as String,
      orderNumber: json['orderNumber'] as String,
      totalPaise: json['totalPaise'] as int,
      paymentRedirectUrl: json['paymentRedirectUrl'] as String? ?? '',
    );
  }
}

class OrderItemSummary {
  final String id;
  final String itemName;
  final int itemPricePaise;
  final int quantity;
  final int subtotalPaise;

  OrderItemSummary({
    required this.id,
    required this.itemName,
    required this.itemPricePaise,
    required this.quantity,
    required this.subtotalPaise,
  });

  factory OrderItemSummary.fromJson(Map<String, dynamic> json) {
    return OrderItemSummary(
      id: json['id'] as String,
      itemName: json['itemName'] as String,
      itemPricePaise: json['itemPricePaise'] as int,
      quantity: json['quantity'] as int,
      subtotalPaise: json['subtotalPaise'] as int,
    );
  }
}

class OrderSummary {
  final String id;
  final String orderNumber;
  final OrderStatus status;
  final int totalPaise;
  final String? customerName;
  final String? customerPhone;
  final String? notes;
  final String createdAt;
  final List<OrderItemSummary> items;

  OrderSummary({
    required this.id,
    required this.orderNumber,
    required this.status,
    required this.totalPaise,
    this.customerName,
    this.customerPhone,
    this.notes,
    required this.createdAt,
    required this.items,
  });

  factory OrderSummary.fromJson(Map<String, dynamic> json) {
    return OrderSummary(
      id: json['id'] as String,
      orderNumber: json['orderNumber'] as String,
      status: OrderStatus.fromWire(json['status'] as String),
      totalPaise: json['totalPaise'] as int,
      customerName: json['customerName'] as String?,
      customerPhone: json['customerPhone'] as String?,
      notes: json['notes'] as String?,
      createdAt: json['createdAt'] as String,
      items: (json['items'] as List<dynamic>? ?? [])
          .map((e) => OrderItemSummary.fromJson(e as Map<String, dynamic>))
          .toList(),
    );
  }
}
