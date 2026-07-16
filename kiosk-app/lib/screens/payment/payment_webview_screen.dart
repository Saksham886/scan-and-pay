import 'package:flutter/material.dart';
import 'package:webview_flutter/webview_flutter.dart';

import '../../config/customer_theme.dart';
import 'payment_processing_screen.dart';

/// Matches the Next.js payment-return page path, e.g. `/brew-and-bake/order/payment-return`.
/// Cafe-slug agnostic on purpose: works for whichever cafe this kiosk is set up for,
/// and identically whether PhonePe or PHONEPE_TEST_MODE's test-pay redirect got us here.
final RegExp _paymentReturnPath = RegExp(r'^/[a-z0-9-]+/order/payment-return$');

class PaymentWebViewScreen extends StatefulWidget {
  final String paymentUrl;
  final String orderId;
  final String cafeSlug;

  const PaymentWebViewScreen({
    super.key,
    required this.paymentUrl,
    required this.orderId,
    required this.cafeSlug,
  });

  @override
  State<PaymentWebViewScreen> createState() => _PaymentWebViewScreenState();
}

class _PaymentWebViewScreenState extends State<PaymentWebViewScreen> {
  late final WebViewController _controller;
  bool _handled = false;
  bool _loading = true;
  String? _loadError;

  @override
  void initState() {
    super.initState();
    _controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setNavigationDelegate(
        NavigationDelegate(
          onNavigationRequest: _onNavigationRequest,
          onPageStarted: (_) {
            if (mounted) setState(() => _loading = true);
          },
          onPageFinished: (_) {
            if (mounted) setState(() => _loading = false);
          },
          onWebResourceError: (error) {
            if (mounted) {
              setState(() {
                _loading = false;
                _loadError = 'Could not load payment page: ${error.description}';
              });
            }
          },
        ),
      )
      ..loadRequest(Uri.parse(widget.paymentUrl));
  }

  NavigationDecision _onNavigationRequest(NavigationRequest request) {
    if (_handled) return NavigationDecision.prevent;

    final uri = Uri.tryParse(request.url);
    if (uri != null && _paymentReturnPath.hasMatch(uri.path)) {
      _handled = true;
      final txn = uri.queryParameters['txn'];
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (!mounted) return;
        Navigator.of(context).pushReplacement(
          MaterialPageRoute(
            builder: (_) => PaymentProcessingScreen(
              orderId: widget.orderId,
              cafeSlug: widget.cafeSlug,
              merchantTransactionId: txn,
            ),
          ),
        );
      });
      return NavigationDecision.prevent;
    }
    return NavigationDecision.navigate;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: CustomerColors.background,
      appBar: AppBar(
        backgroundColor: CustomerColors.headerBackground,
        foregroundColor: CustomerColors.foreground,
        title: Text('Complete Payment', style: CustomerText.display(fontSize: 16)),
        shape: const Border(bottom: BorderSide(color: CustomerColors.border, width: 2)),
      ),
      body: Stack(
        children: [
          WebViewWidget(controller: _controller),
          if (_loading)
            const Positioned(
              top: 0,
              left: 0,
              right: 0,
              child: LinearProgressIndicator(
                color: CustomerColors.accent,
                backgroundColor: CustomerColors.surface,
              ),
            ),
          if (_loadError != null)
            Center(
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Text(
                  _loadError!,
                  textAlign: TextAlign.center,
                  style: CustomerText.mono(color: CustomerColors.danger),
                ),
              ),
            ),
        ],
      ),
    );
  }
}
