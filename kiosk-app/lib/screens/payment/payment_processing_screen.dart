import 'dart:async';

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../config/constants.dart';
import '../../config/customer_theme.dart';
import '../../services/order_service.dart';
import '../../state/cart_provider.dart';
import '../../widgets/primary_button.dart';
import '../menu/menu_screen.dart';
import '../order_status/order_status_screen.dart';

enum _Phase { verifying, success, failed }

class PaymentProcessingScreen extends StatefulWidget {
  final String orderId;
  final String cafeSlug;
  final String? merchantTransactionId;

  const PaymentProcessingScreen({
    super.key,
    required this.orderId,
    required this.cafeSlug,
    this.merchantTransactionId,
  });

  @override
  State<PaymentProcessingScreen> createState() => _PaymentProcessingScreenState();
}

class _PaymentProcessingScreenState extends State<PaymentProcessingScreen> {
  final _orderService = OrderService();
  _Phase _phase = _Phase.verifying;
  int _countdown = kPaymentFailureCountdown.inSeconds;
  Timer? _countdownTimer;

  @override
  void initState() {
    super.initState();
    _run();
  }

  @override
  void dispose() {
    _countdownTimer?.cancel();
    super.dispose();
  }

  Future<void> _run() async {
    if (widget.merchantTransactionId != null) {
      await _orderService.reconcile(
        orderId: widget.orderId,
        merchantTransactionId: widget.merchantTransactionId!,
      );
    }
    await _poll(0);
  }

  Future<void> _poll(int attempt) async {
    if (!mounted) return;
    if (attempt > kPostPaymentMaxAttempts) {
      _onFailure();
      return;
    }

    try {
      final result = await _orderService.getOrderStatus(widget.orderId);
      if (!mounted) return;

      if (result.isTransientError) {
        await Future.delayed(kTransientErrorExtraDelay);
        return _poll(attempt + 1);
      }

      if (!result.success || result.data == null) {
        _onFailure();
        return;
      }

      final status = result.data!.status;
      if (status.isPaidOrBeyond) {
        _onSuccess();
        return;
      }
      if (status.isFailedOrCancelled) {
        _onFailure();
        return;
      }

      await Future.delayed(kPostPaymentPollInterval);
      return _poll(attempt + 1);
    } catch (_) {
      // A thrown request error (socket drop / DNS blip on office wifi) is not a
      // failed payment — the money may already be in flight and the webhook
      // will settle it. Treat it like a transient status: wait and keep
      // polling, bounded by kPostPaymentMaxAttempts, rather than declaring
      // failure the moment the network hiccups.
      if (!mounted) return;
      await Future.delayed(kTransientErrorExtraDelay);
      return _poll(attempt + 1);
    }
  }

  void _onSuccess() {
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
    Navigator.of(context).pushAndRemoveUntil(
      MaterialPageRoute(builder: (_) => const MenuScreen()),
      (route) => false,
    );
  }

  void _retryPayment() {
    _countdownTimer?.cancel();
    // Same idempotencyKey is still held by CartProvider (cart hasn't
    // changed), so re-running checkout resolves this order via the
    // empty-paymentRedirectUrl replay path instead of double-charging.
    Navigator.of(context).popUntil((route) => route.isFirst);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: CustomerColors.background,
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: _buildContent(),
        ),
      ),
    );
  }

  Widget _buildContent() {
    switch (_phase) {
      case _Phase.verifying:
        return Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 64,
              height: 64,
              alignment: Alignment.center,
              decoration: BoxDecoration(border: Border.all(color: CustomerColors.primary.withValues(alpha: 0.6), width: 2)),
              child: const CircularProgressIndicator(strokeWidth: 3, color: CustomerColors.primary),
            ),
            const SizedBox(height: 20),
            Text('VERIFYING PAYMENT...', style: CustomerText.display(fontSize: 18)),
            const SizedBox(height: 8),
            Text(
              'Please wait while we confirm your payment',
              style: CustomerText.mono(fontSize: 13, color: CustomerColors.muted),
            ),
          ],
        );
      case _Phase.success:
        return Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 64,
              height: 64,
              alignment: Alignment.center,
              decoration: BoxDecoration(border: Border.all(color: CustomerColors.accent.withValues(alpha: 0.6), width: 2)),
              child: const Icon(Icons.check_circle_outline, size: 32, color: CustomerColors.accent),
            ),
            const SizedBox(height: 20),
            Text('PAYMENT SUCCESSFUL!', style: CustomerText.display(fontSize: 18)),
          ],
        );
      case _Phase.failed:
        return Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 64,
              height: 64,
              alignment: Alignment.center,
              decoration: BoxDecoration(border: Border.all(color: CustomerColors.danger.withValues(alpha: 0.6), width: 2)),
              child: const Icon(Icons.cancel_outlined, size: 32, color: CustomerColors.danger),
            ),
            const SizedBox(height: 20),
            Text('PAYMENT FAILED', style: CustomerText.display(fontSize: 18)),
            const SizedBox(height: 8),
            Text(
              'If any amount was deducted it will be refunded within 5-7 business days.',
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
            const SizedBox(height: 12),
            TextButton(
              onPressed: _retryPayment,
              child: Text('Retry Payment', style: CustomerText.mono(fontSize: 13, color: CustomerColors.primary)),
            ),
          ],
        );
    }
  }
}
