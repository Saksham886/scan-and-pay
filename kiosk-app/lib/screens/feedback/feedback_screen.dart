import 'dart:async';

import 'package:flutter/material.dart';

import '../../config/constants.dart';
import '../../config/customer_theme.dart';
import '../../services/order_service.dart';
import '../../widgets/neo_pressable.dart';
import '../../widgets/primary_button.dart';
import '../menu/menu_screen.dart';

/// Shown right after the receipt: a lightweight star rating ask so the
/// kiosk can collect feedback before freeing up for the next customer.
/// Submitting auto-resets to the menu after [kFeedbackAutoReset]; skipping
/// is always available via the "Back to Menu" button so one customer
/// declining doesn't block the next order.
class FeedbackScreen extends StatefulWidget {
  final String orderId;

  const FeedbackScreen({super.key, required this.orderId});

  @override
  State<FeedbackScreen> createState() => _FeedbackScreenState();
}

class _FeedbackScreenState extends State<FeedbackScreen> {
  final _orderService = OrderService();
  Timer? _resetTimer;
  Timer? _countdownTimer;

  int _rating = 0;
  bool _submitting = false;
  bool _submitted = false;
  int _countdown = kFeedbackAutoReset.inSeconds;

  @override
  void dispose() {
    _resetTimer?.cancel();
    _countdownTimer?.cancel();
    super.dispose();
  }

  void _selectRating(int value) {
    if (_submitted) return;
    setState(() => _rating = value);
  }

  Future<void> _submit() async {
    if (_rating == 0 || _submitting) return;
    setState(() => _submitting = true);

    try {
      await _orderService.submitFeedback(
        orderId: widget.orderId,
        rating: _rating,
      );
    } catch (_) {
      // Best-effort: a failed feedback submission shouldn't trap a shared
      // kiosk on this screen, so we still move on to the thank-you state.
    }

    if (!mounted) return;
    setState(() {
      _submitting = false;
      _submitted = true;
    });
    _scheduleReset();
  }

  void _scheduleReset() {
    _resetTimer?.cancel();
    _countdownTimer?.cancel();
    _countdown = kFeedbackAutoReset.inSeconds;
    _resetTimer = Timer(kFeedbackAutoReset, _backToMenu);
    _countdownTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (!mounted || _countdown <= 1) {
        timer.cancel();
        return;
      }
      setState(() => _countdown -= 1);
    });
  }

  void _backToMenu() {
    if (!mounted) return;
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
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Expanded(
                child: Center(
                  child: _submitted
                      ? _ThankYou(countdown: _countdown)
                      : _RatingPrompt(
                          rating: _rating,
                          onSelect: _selectRating,
                        ),
                ),
              ),
              if (!_submitted)
                // Always the neon/accent style (never the dark disabled fill);
                // _submit no-ops until a star is picked, so an unrated tap
                // simply does nothing.
                PrimaryButton(
                  label: 'Submit',
                  onPressed: _submit,
                  loading: _submitting,
                ),
              const SizedBox(height: 12),
              _SecondaryButton(label: 'Back to Menu', onPressed: _backToMenu),
            ],
          ),
        ),
      ),
    );
  }
}

class _RatingPrompt extends StatelessWidget {
  final int rating;
  final ValueChanged<int> onSelect;

  const _RatingPrompt({required this.rating, required this.onSelect});

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(
          'HOW WAS YOUR ORDER?',
          textAlign: TextAlign.center,
          style: CustomerText.display(fontSize: 22),
        ),
        const SizedBox(height: 8),
        Text(
          'Tap a star to rate your experience.',
          textAlign: TextAlign.center,
          style: CustomerText.mono(fontSize: 13, color: CustomerColors.muted),
        ),
        const SizedBox(height: 32),
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            for (var i = 1; i <= 5; i++)
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 6),
                child: NeoPressable(
                  onTap: () => onSelect(i),
                  child: Icon(
                    i <= rating ? Icons.star : Icons.star_border,
                    size: 48,
                    color: i <= rating
                        ? CustomerColors.accent
                        : CustomerColors.border,
                  ),
                ),
              ),
          ],
        ),
      ],
    );
  }
}

class _ThankYou extends StatelessWidget {
  final int countdown;

  const _ThankYou({required this.countdown});

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 72,
          height: 72,
          alignment: Alignment.center,
          decoration: BoxDecoration(
            border: Border.all(
              color: CustomerColors.accent.withValues(alpha: 0.6),
              width: 2,
            ),
          ),
          child: const Icon(
            Icons.favorite_border,
            size: 32,
            color: CustomerColors.accent,
          ),
        ),
        const SizedBox(height: 16),
        Text(
          'THANKS FOR THE FEEDBACK!',
          textAlign: TextAlign.center,
          style: CustomerText.display(fontSize: 20),
        ),
        const SizedBox(height: 12),
        Text(
          'Returning to menu in ${countdown}s',
          textAlign: TextAlign.center,
          style: CustomerText.mono(fontSize: 12, color: CustomerColors.muted),
        ),
      ],
    );
  }
}

class _SecondaryButton extends StatelessWidget {
  final String label;
  final VoidCallback onPressed;

  const _SecondaryButton({required this.label, required this.onPressed});

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: double.infinity,
      child: NeoPressable(
        onTap: onPressed,
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 14),
          alignment: Alignment.center,
          decoration: BoxDecoration(
            border: Border.all(color: CustomerColors.border, width: 2),
          ),
          child: Text(
            label.toUpperCase(),
            style: CustomerText.mono(
              fontSize: 13,
              fontWeight: FontWeight.w700,
              color: CustomerColors.muted,
              letterSpacing: 1,
            ),
          ),
        ),
      ),
    );
  }
}
