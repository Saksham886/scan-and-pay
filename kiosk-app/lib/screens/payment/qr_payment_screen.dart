import 'dart:async';

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../config/constants.dart';
import '../../config/customer_theme.dart';
import '../../services/order_service.dart';
import '../../state/cart_provider.dart';
import '../../utils/currency.dart';
import '../../widgets/primary_button.dart';
import '../menu/menu_screen.dart';
import '../order_status/order_status_screen.dart';

enum _Phase { waiting, success, failed }

/// Native single-QR payment screen for the kiosk.
///
/// Instead of opening Razorpay Standard Checkout in a WebView — with its
/// merchant-confirm step, mandatory phone field, and a QR that regenerates when
/// the customer switches UPI method — the server mints one fixed-amount,
/// single-use UPI QR (RAZORPAY_USE_QR). This screen renders that QR from its
/// hosted image URL and polls the server, which actively reconciles the QR
/// against Razorpay, until the order is paid, failed, or the wait times out.
///
/// Deliberately does NOT use IdleResetGuard: while paying, the customer is
/// touching their own phone, not the kiosk, so a touch-idle timer would reset
/// the screen mid-payment. Abandonment is bounded instead by [kQrPaymentTimeout]
/// and the failed-state auto-return countdown.
class QrPaymentScreen extends StatefulWidget {
  final String orderId;
  final String cafeSlug;
  final String merchantTxnId;
  final String qrImageUrl;
  final int amountPaise;
  final String orderNumber;

  const QrPaymentScreen({
    super.key,
    required this.orderId,
    required this.cafeSlug,
    required this.merchantTxnId,
    required this.qrImageUrl,
    required this.amountPaise,
    required this.orderNumber,
  });

  @override
  State<QrPaymentScreen> createState() => _QrPaymentScreenState();
}

class _QrPaymentScreenState extends State<QrPaymentScreen> {
  final _orderService = OrderService();

  _Phase _phase = _Phase.waiting;
  Timer? _pollTimer;
  Timer? _countdownTimer;
  bool _polling = false;
  int _elapsedSeconds = 0;
  int _imageAttempt = 0;
  int _countdown = kPaymentFailureCountdown.inSeconds;

  @override
  void initState() {
    super.initState();
    _pollTimer = Timer.periodic(kQrPollInterval, (_) => _pollOnce());
  }

  @override
  void dispose() {
    _pollTimer?.cancel();
    _countdownTimer?.cancel();
    super.dispose();
  }

  Future<void> _pollOnce() async {
    // Skip if a previous poll is still in flight (a slow reconcile shouldn't
    // stack up requests) or we've already left the waiting phase.
    if (_polling || !mounted || _phase != _Phase.waiting) return;
    _polling = true;
    try {
      _elapsedSeconds += kQrPollInterval.inSeconds;

      final result = await _orderService.reconcileForStatus(
        orderId: widget.orderId,
        merchantTransactionId: widget.merchantTxnId,
      );
      if (!mounted || _phase != _Phase.waiting) return;

      final status = result.data?.status;
      if (status != null && status.isPaidOrBeyond) {
        _onSuccess();
        return;
      }
      if (status != null && status.isFailedOrCancelled) {
        _onFailure();
        return;
      }

      // Pending (202), transient (429/5xx/timeout), or a network error all mean
      // "keep waiting" — never a failure while the payment could still be in
      // flight. Only the overall ceiling ends the wait, by which point the
      // webhook has almost certainly settled the order.
      if (_elapsedSeconds >= kQrPaymentTimeout.inSeconds) {
        _onFailure();
      }
    } finally {
      _polling = false;
    }
  }

  void _onSuccess() {
    _pollTimer?.cancel();
    if (!mounted) return;
    context.read<CartProvider>().clear();
    setState(() => _phase = _Phase.success);
    Future.delayed(const Duration(milliseconds: 1200), () {
      if (!mounted) return;
      Navigator.of(context).pushAndRemoveUntil(
        MaterialPageRoute(
          builder: (_) => OrderStatusScreen(orderId: widget.orderId),
        ),
        (route) => route.isFirst,
      );
    });
  }

  void _onFailure() {
    _pollTimer?.cancel();
    if (!mounted) return;
    setState(() => _phase = _Phase.failed);
    _countdownTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (!mounted) {
        timer.cancel();
        return;
      }
      if (_countdown <= 1) {
        timer.cancel();
        _backToMenu();
        return;
      }
      setState(() => _countdown -= 1);
    });
  }

  void _backToMenu() {
    _pollTimer?.cancel();
    _countdownTimer?.cancel();
    if (!mounted) return;
    context.read<CartProvider>().clear();
    Navigator.of(context).pushAndRemoveUntil(
      MaterialPageRoute(builder: (_) => const MenuScreen()),
      (route) => false,
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: CustomerColors.background,
      body: SafeArea(
        child: Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: _buildContent(),
          ),
        ),
      ),
    );
  }

  Widget _buildContent() {
    switch (_phase) {
      case _Phase.waiting:
        return _buildWaiting();
      case _Phase.success:
        return _buildSuccess();
      case _Phase.failed:
        return _buildFailed();
    }
  }

  Widget _buildWaiting() {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Text('SCAN & PAY', style: CustomerText.display(fontSize: 22)),
        const SizedBox(height: 8),
        Text(
          'Scan with any UPI app on your phone',
          textAlign: TextAlign.center,
          style: CustomerText.mono(fontSize: 13, color: CustomerColors.muted),
        ),
        const SizedBox(height: 20),
        // QR sits on a solid white card for reliable scanning regardless of the
        // dark theme behind it.
        Container(
          width: 280,
          height: 280,
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: Colors.white,
            border: Border.all(color: CustomerColors.border, width: 2),
          ),
          child: Image.network(
            widget.qrImageUrl,
            key: ValueKey(_imageAttempt),
            fit: BoxFit.contain,
            gaplessPlayback: true,
            loadingBuilder: (context, child, progress) {
              if (progress == null) return child;
              return const Center(
                child: CircularProgressIndicator(
                  strokeWidth: 3,
                  color: CustomerColors.primaryDark,
                ),
              );
            },
            errorBuilder: (context, error, stack) {
              return Center(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.wifi_off, size: 28, color: CustomerColors.black),
                    const SizedBox(height: 8),
                    Text(
                      "Couldn't load QR",
                      style: CustomerText.mono(fontSize: 12, color: CustomerColors.black),
                    ),
                    const SizedBox(height: 8),
                    TextButton(
                      onPressed: () => setState(() => _imageAttempt += 1),
                      child: Text(
                        'Reload',
                        style: CustomerText.mono(
                          fontSize: 13,
                          color: CustomerColors.primaryDark,
                        ),
                      ),
                    ),
                  ],
                ),
              );
            },
          ),
        ),
        const SizedBox(height: 20),
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(
              'Order #${widget.orderNumber}',
              style: CustomerText.mono(fontSize: 13, color: CustomerColors.muted),
            ),
            const SizedBox(width: 12),
            Container(width: 1, height: 14, color: CustomerColors.border),
            const SizedBox(width: 12),
            Text(
              paiseToCurrencyShort(widget.amountPaise),
              style: CustomerText.display(fontSize: 18, color: CustomerColors.accent),
            ),
          ],
        ),
        const SizedBox(height: 20),
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const SizedBox(
              width: 14,
              height: 14,
              child: CircularProgressIndicator(
                strokeWidth: 2,
                color: CustomerColors.primary,
              ),
            ),
            const SizedBox(width: 10),
            Text(
              'Waiting for payment…',
              style: CustomerText.mono(fontSize: 12, color: CustomerColors.muted),
            ),
          ],
        ),
        const SizedBox(height: 16),
        TextButton(
          onPressed: _backToMenu,
          child: Text(
            'Cancel',
            style: CustomerText.mono(fontSize: 13, color: CustomerColors.muted),
          ),
        ),
      ],
    );
  }

  Widget _buildSuccess() {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 64,
          height: 64,
          alignment: Alignment.center,
          decoration: BoxDecoration(
            border: Border.all(
              color: CustomerColors.accent.withValues(alpha: 0.6),
              width: 2,
            ),
          ),
          child: const Icon(Icons.check_circle_outline, size: 32, color: CustomerColors.accent),
        ),
        const SizedBox(height: 20),
        Text('PAYMENT SUCCESSFUL!', style: CustomerText.display(fontSize: 18)),
      ],
    );
  }

  Widget _buildFailed() {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 64,
          height: 64,
          alignment: Alignment.center,
          decoration: BoxDecoration(
            border: Border.all(
              color: CustomerColors.danger.withValues(alpha: 0.6),
              width: 2,
            ),
          ),
          child: const Icon(Icons.cancel_outlined, size: 32, color: CustomerColors.danger),
        ),
        const SizedBox(height: 20),
        Text('PAYMENT NOT RECEIVED', style: CustomerText.display(fontSize: 18)),
        const SizedBox(height: 8),
        Text(
          'We didn\'t detect a completed payment. If any amount was deducted it '
          'will be refunded within 5-7 business days.',
          textAlign: TextAlign.center,
          style: CustomerText.mono(fontSize: 13, color: CustomerColors.muted),
        ),
        const SizedBox(height: 8),
        Text(
          'Returning to menu in ${_countdown}s',
          style: CustomerText.mono(fontSize: 12, color: CustomerColors.muted),
        ),
        const SizedBox(height: 20),
        PrimaryButton(label: 'Back to Menu Now', onPressed: _backToMenu),
      ],
    );
  }
}
