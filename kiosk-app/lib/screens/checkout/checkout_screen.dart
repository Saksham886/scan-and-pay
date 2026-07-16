import 'package:flutter/material.dart';
import 'package:flutter/services.dart' show FilteringTextInputFormatter;
import 'package:provider/provider.dart';

import '../../models/order.dart';
import '../../services/order_service.dart';
import '../../state/cart_provider.dart';
import '../../state/kiosk_config_provider.dart';
import '../../utils/validation.dart';
import '../../widgets/price_text.dart';
import '../../widgets/primary_button.dart';
import '../order_status/order_status_screen.dart';
import '../payment/payment_webview_screen.dart';

class CheckoutScreen extends StatefulWidget {
  const CheckoutScreen({super.key});

  @override
  State<CheckoutScreen> createState() => _CheckoutScreenState();
}

class _CheckoutScreenState extends State<CheckoutScreen> {
  final _nameController = TextEditingController();
  final _phoneController = TextEditingController();
  final _emailController = TextEditingController();
  final _notesController = TextEditingController();
  final _orderService = OrderService();

  String? _nameError;
  String? _phoneError;
  String? _emailError;
  String? _submitError;
  bool _loading = false;

  @override
  void dispose() {
    _nameController.dispose();
    _phoneController.dispose();
    _emailController.dispose();
    _notesController.dispose();
    super.dispose();
  }

  bool _validate() {
    final nameResult = validateName(_nameController.text);
    final phoneResult = validatePhone(_phoneController.text);
    final emailResult = validateEmail(_emailController.text);
    setState(() {
      _nameError = nameResult.valid ? null : nameResult.error;
      _phoneError = phoneResult.valid ? null : phoneResult.error;
      _emailError = emailResult.valid ? null : emailResult.error;
    });
    return nameResult.valid && phoneResult.valid && emailResult.valid;
  }

  Future<void> _submit() async {
    setState(() => _submitError = null);
    if (!_validate()) return;

    final cart = context.read<CartProvider>();
    final cafeSlug = context.read<KioskConfigProvider>().cafeSlug;
    if (cafeSlug == null || cart.isEmpty) return;

    setState(() => _loading = true);

    final request = CreateOrderRequest(
      cafeSlug: cafeSlug,
      items: cart.items
          .map((i) => {'menuItemId': i.menuItemId, 'quantity': i.quantity})
          .toList(),
      customerName: _nameController.text.trim(),
      customerPhone: normalizePhone(_phoneController.text),
      customerEmail: _emailController.text.trim().toLowerCase(),
      notes: _notesController.text.trim().isEmpty
          ? null
          : _notesController.text.trim(),
      idempotencyKey: cart.getOrCreateIdempotencyKey(),
    );

    try {
      final result = await _orderService.createOrder(request);
      if (!mounted) return;

      if (!result.success || result.data == null) {
        if (result.statusCode == 422 || result.statusCode == 409) {
          cart.invalidateIdempotencyKey();
        }
        setState(() {
          _submitError = result.error ?? 'Failed to create order';
          _loading = false;
        });
        return;
      }

      final order = result.data!;
      setState(() => _loading = false);

      if (order.paymentRedirectUrl.isNotEmpty) {
        Navigator.of(context).push(
          MaterialPageRoute(
            builder: (_) => PaymentWebViewScreen(
              paymentUrl: order.paymentRedirectUrl,
              orderId: order.orderId,
              cafeSlug: cafeSlug,
            ),
          ),
        );
      } else {
        Navigator.of(context).pushAndRemoveUntil(
          MaterialPageRoute(
            builder: (_) => OrderStatusScreen(orderId: order.orderId),
          ),
          (route) => route.isFirst,
        );
      }
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _submitError = 'Network error. Please try again.';
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final cart = context.watch<CartProvider>();

    return Scaffold(
      appBar: AppBar(title: const Text('Checkout')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Order Summary', style: Theme.of(context).textTheme.titleMedium),
                  const SizedBox(height: 12),
                  for (final item in cart.items)
                    Padding(
                      padding: const EdgeInsets.symmetric(vertical: 2),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Expanded(child: Text('${item.name} x${item.quantity}')),
                          PriceText(item.subtotalPaise),
                        ],
                      ),
                    ),
                  const Divider(),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text('Total', style: Theme.of(context).textTheme.titleMedium),
                      PriceText(
                        cart.totalPaise,
                        short: false,
                        style: Theme.of(context)
                            .textTheme
                            .titleMedium
                            ?.copyWith(fontWeight: FontWeight.bold),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
          TextField(
            controller: _nameController,
            textCapitalization: TextCapitalization.words,
            decoration: InputDecoration(labelText: 'Name', errorText: _nameError),
          ),
          const SizedBox(height: 16),
          TextField(
            controller: _phoneController,
            keyboardType: TextInputType.phone,
            maxLength: 10,
            inputFormatters: [FilteringTextInputFormatter.digitsOnly],
            decoration: InputDecoration(
              labelText: 'Mobile Number',
              errorText: _phoneError,
              counterText: '',
            ),
          ),
          const SizedBox(height: 16),
          TextField(
            controller: _emailController,
            keyboardType: TextInputType.emailAddress,
            decoration: InputDecoration(labelText: 'Email', errorText: _emailError),
          ),
          const SizedBox(height: 16),
          TextField(
            controller: _notesController,
            maxLength: 500,
            maxLines: 2,
            decoration: const InputDecoration(labelText: 'Special Instructions (optional)'),
          ),
        ],
      ),
      bottomNavigationBar: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              if (_submitError != null) ...[
                Text(_submitError!, style: const TextStyle(color: Colors.redAccent)),
                const SizedBox(height: 8),
              ],
              PrimaryButton(
                label: 'Pay ${_totalLabel(cart.totalPaise)}',
                loading: _loading,
                onPressed: _submit,
              ),
            ],
          ),
        ),
      ),
    );
  }

  String _totalLabel(int paise) => '₹${(paise / 100).toStringAsFixed(2)}';
}
