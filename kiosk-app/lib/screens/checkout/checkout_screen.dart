import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';

import '../../config/customer_theme.dart';
import '../../models/cart_line_item.dart';
import '../../models/order.dart';
import '../../services/order_service.dart';
import '../../state/cart_provider.dart';
import '../../state/kiosk_config_provider.dart';
import '../../utils/currency.dart';
import '../../utils/validation.dart';
import '../../widgets/primary_button.dart';
import '../../widgets/veg_indicator.dart';
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
      notes: _notesController.text.trim().isEmpty ? null : _notesController.text.trim(),
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
          MaterialPageRoute(builder: (_) => OrderStatusScreen(orderId: order.orderId)),
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
    final cafeName = context.watch<KioskConfigProvider>().cafeName ?? '';

    return Scaffold(
      backgroundColor: CustomerColors.background,
      body: SafeArea(
        child: Column(
          children: [
            _Header(cafeName: cafeName),
            Expanded(
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  _OrderSummaryCard(items: cart.items, total: cart.totalPaise),
                  const SizedBox(height: 16),
                  _CustomerDetailsCard(
                    nameController: _nameController,
                    phoneController: _phoneController,
                    emailController: _emailController,
                    notesController: _notesController,
                    nameError: _nameError,
                    phoneError: _phoneError,
                    emailError: _emailError,
                  ),
                  if (_submitError != null) ...[
                    const SizedBox(height: 16),
                    Container(
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: CustomerColors.danger.withValues(alpha: 0.1),
                        border: Border.all(color: CustomerColors.danger.withValues(alpha: 0.4), width: 2),
                      ),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('!', style: CustomerText.mono(fontWeight: FontWeight.w700, color: CustomerColors.danger)),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              _submitError!,
                              style: CustomerText.mono(fontSize: 13, color: CustomerColors.danger),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                  const SizedBox(height: 16),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(Icons.verified_user_outlined, size: 14, color: CustomerColors.accent),
                      const SizedBox(width: 6),
                      Text(
                        'Secure payment via PhonePe',
                        style: CustomerText.mono(fontSize: 12, color: CustomerColors.muted),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            _PayBar(loading: _loading, total: cart.totalPaise, onPressed: _submit),
          ],
        ),
      ),
    );
  }
}

class _Header extends StatelessWidget {
  final String cafeName;

  const _Header({required this.cafeName});

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        color: CustomerColors.headerBackground,
        border: Border(bottom: BorderSide(color: CustomerColors.border, width: 2)),
      ),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      child: Row(
        children: [
          InkWell(
            onTap: () => Navigator.of(context).pop(),
            child: Container(
              width: 36,
              height: 36,
              alignment: Alignment.center,
              decoration: BoxDecoration(border: Border.all(color: CustomerColors.border, width: 2)),
              child: const Icon(Icons.arrow_back, size: 18, color: CustomerColors.muted),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('CHECKOUT', style: CustomerText.display(fontSize: 18)),
                if (cafeName.isNotEmpty)
                  Text(cafeName, style: CustomerText.mono(fontSize: 12, color: CustomerColors.muted)),
              ],
            ),
          ),
          const Icon(Icons.verified_user_outlined, size: 16, color: CustomerColors.accent),
        ],
      ),
    );
  }
}

class _OrderSummaryCard extends StatelessWidget {
  final List<CartLineItem> items;
  final int total;

  const _OrderSummaryCard({required this.items, required this.total});

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(color: CustomerColors.surface, border: Border.all(color: CustomerColors.border, width: 2)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
            decoration: const BoxDecoration(
              color: CustomerColors.surfaceHover,
              border: Border(bottom: BorderSide(color: CustomerColors.border, width: 2)),
            ),
            child: Row(
              children: [
                const Icon(Icons.receipt_long_outlined, size: 15, color: CustomerColors.primary),
                const SizedBox(width: 8),
                Text(
                  'ORDER SUMMARY',
                  style: CustomerText.mono(fontSize: 13, fontWeight: FontWeight.w700, letterSpacing: 1),
                ),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(14),
            child: Column(
              children: [
                for (final item in items) ...[
                  Padding(
                    padding: const EdgeInsets.symmetric(vertical: 4),
                    child: Row(
                      children: [
                        VegIndicator(isVeg: item.isVeg, size: 14),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            item.name,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: CustomerText.mono(fontSize: 13, color: CustomerColors.muted),
                          ),
                        ),
                        Text('x${item.quantity}', style: CustomerText.mono(fontSize: 13, color: CustomerColors.muted)),
                        const SizedBox(width: 10),
                        Text(
                          paiseToCurrencyShort(item.subtotalPaise),
                          style: CustomerText.mono(fontSize: 13, fontWeight: FontWeight.w700),
                        ),
                      ],
                    ),
                  ),
                ],
                const SizedBox(height: 8),
                DottedDivider(),
                const SizedBox(height: 10),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text('TOTAL', style: CustomerText.mono(fontWeight: FontWeight.w700)),
                    Text(paiseToCurrencyShort(total), style: CustomerText.display(fontSize: 20, color: CustomerColors.accent)),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class DottedDivider extends StatelessWidget {
  const DottedDivider({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(height: 2, color: CustomerColors.border);
  }
}

class _CustomerDetailsCard extends StatelessWidget {
  final TextEditingController nameController;
  final TextEditingController phoneController;
  final TextEditingController emailController;
  final TextEditingController notesController;
  final String? nameError;
  final String? phoneError;
  final String? emailError;

  const _CustomerDetailsCard({
    required this.nameController,
    required this.phoneController,
    required this.emailController,
    required this.notesController,
    required this.nameError,
    required this.phoneError,
    required this.emailError,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(color: CustomerColors.surface, border: Border.all(color: CustomerColors.border, width: 2)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
            decoration: const BoxDecoration(
              color: CustomerColors.surfaceHover,
              border: Border(bottom: BorderSide(color: CustomerColors.border, width: 2)),
            ),
            child: Row(
              children: [
                const Icon(Icons.person_outline, size: 15, color: CustomerColors.primary),
                const SizedBox(width: 8),
                Text('YOUR DETAILS', style: CustomerText.mono(fontSize: 13, fontWeight: FontWeight.w700, letterSpacing: 1)),
                const Spacer(),
                Text('* Required', style: CustomerText.mono(fontSize: 11, color: CustomerColors.muted)),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(14),
            child: Column(
              children: [
                _NeoField(
                  label: 'Name *',
                  controller: nameController,
                  hint: 'Your name for the order',
                  error: nameError,
                  textCapitalization: TextCapitalization.words,
                ),
                const SizedBox(height: 14),
                _NeoField(
                  label: 'Mobile Number *',
                  controller: phoneController,
                  hint: '10-digit mobile number',
                  error: phoneError,
                  keyboardType: TextInputType.phone,
                  maxLength: 10,
                  inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                ),
                Padding(
                  padding: const EdgeInsets.only(top: 4, bottom: 4),
                  child: Align(
                    alignment: Alignment.centerLeft,
                    child: Text(
                      "We'll send order updates to this number on WhatsApp.",
                      style: CustomerText.mono(fontSize: 11, color: CustomerColors.muted),
                    ),
                  ),
                ),
                const SizedBox(height: 10),
                _NeoField(
                  label: 'Email *',
                  controller: emailController,
                  hint: 'you@example.com',
                  error: emailError,
                  keyboardType: TextInputType.emailAddress,
                ),
                const SizedBox(height: 14),
                Align(
                  alignment: Alignment.centerLeft,
                  child: Text(
                    'SPECIAL INSTRUCTIONS',
                    style: CustomerText.mono(fontSize: 12, fontWeight: FontWeight.w700, letterSpacing: 1),
                  ),
                ),
                const SizedBox(height: 6),
                TextField(
                  controller: notesController,
                  maxLength: 500,
                  maxLines: 2,
                  style: CustomerText.mono(fontSize: 13, color: CustomerColors.foreground),
                  decoration: InputDecoration(
                    filled: true,
                    fillColor: CustomerColors.background,
                    hintText: 'Any special requests...',
                    hintStyle: CustomerText.mono(fontSize: 13, color: CustomerColors.border),
                    counterStyle: CustomerText.mono(fontSize: 10, color: CustomerColors.border),
                    contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                    border: const OutlineInputBorder(
                      borderRadius: BorderRadius.zero,
                      borderSide: BorderSide(color: CustomerColors.border, width: 2),
                    ),
                    enabledBorder: const OutlineInputBorder(
                      borderRadius: BorderRadius.zero,
                      borderSide: BorderSide(color: CustomerColors.border, width: 2),
                    ),
                    focusedBorder: const OutlineInputBorder(
                      borderRadius: BorderRadius.zero,
                      borderSide: BorderSide(color: CustomerColors.accent, width: 2),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _NeoField extends StatelessWidget {
  final String label;
  final TextEditingController controller;
  final String hint;
  final String? error;
  final TextInputType? keyboardType;
  final int? maxLength;
  final List<TextInputFormatter>? inputFormatters;
  final TextCapitalization textCapitalization;

  const _NeoField({
    required this.label,
    required this.controller,
    required this.hint,
    required this.error,
    this.keyboardType,
    this.maxLength,
    this.inputFormatters,
    this.textCapitalization = TextCapitalization.none,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: CustomerText.mono(fontSize: 12, fontWeight: FontWeight.w700, letterSpacing: 1)),
        const SizedBox(height: 6),
        TextField(
          controller: controller,
          keyboardType: keyboardType,
          maxLength: maxLength,
          inputFormatters: inputFormatters,
          textCapitalization: textCapitalization,
          style: CustomerText.mono(fontSize: 14, color: CustomerColors.foreground),
          decoration: InputDecoration(
            filled: true,
            fillColor: CustomerColors.background,
            hintText: hint,
            hintStyle: CustomerText.mono(fontSize: 13, color: CustomerColors.border),
            counterText: maxLength != null ? '' : null,
            errorText: error,
            errorStyle: CustomerText.mono(fontSize: 11, color: CustomerColors.danger),
            contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
            border: const OutlineInputBorder(
              borderRadius: BorderRadius.zero,
              borderSide: BorderSide(color: CustomerColors.border, width: 2),
            ),
            enabledBorder: const OutlineInputBorder(
              borderRadius: BorderRadius.zero,
              borderSide: BorderSide(color: CustomerColors.border, width: 2),
            ),
            focusedBorder: const OutlineInputBorder(
              borderRadius: BorderRadius.zero,
              borderSide: BorderSide(color: CustomerColors.accent, width: 2),
            ),
            errorBorder: const OutlineInputBorder(
              borderRadius: BorderRadius.zero,
              borderSide: BorderSide(color: CustomerColors.danger, width: 2),
            ),
          ),
        ),
      ],
    );
  }
}

class _PayBar extends StatelessWidget {
  final bool loading;
  final int total;
  final VoidCallback onPressed;

  const _PayBar({required this.loading, required this.total, required this.onPressed});

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        color: CustomerColors.headerBackground,
        border: Border(top: BorderSide(color: CustomerColors.border, width: 2)),
      ),
      padding: const EdgeInsets.all(16),
      child: PrimaryButton(
        label: 'Pay ${paiseToCurrencyShort(total)}',
        icon: Icons.arrow_forward,
        loading: loading,
        onPressed: onPressed,
      ),
    );
  }
}
