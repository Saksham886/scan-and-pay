import 'dart:async';

import 'package:flutter/material.dart';

import '../../config/constants.dart';
import '../../config/customer_theme.dart';
import '../../services/feedback_service.dart';
import '../../widgets/neo_pressable.dart';
import '../../widgets/primary_button.dart';

/// General "how was your experience" feedback about the cafe, reached from
/// the welcome screen - not tied to any order. Mirrors the web app's
/// `/[cafeSlug]/feedback` page. Distinct from [FeedbackScreen], which rates
/// a specific order right after checkout.
class CafeFeedbackScreen extends StatefulWidget {
  final String cafeSlug;
  final String cafeName;

  const CafeFeedbackScreen({
    super.key,
    required this.cafeSlug,
    required this.cafeName,
  });

  @override
  State<CafeFeedbackScreen> createState() => _CafeFeedbackScreenState();
}

class _CafeFeedbackScreenState extends State<CafeFeedbackScreen> {
  final _feedbackService = FeedbackService();
  final _commentController = TextEditingController();
  Timer? _resetTimer;
  Timer? _countdownTimer;

  int _rating = 0;
  bool _submitting = false;
  bool _submitted = false;
  String? _error;
  int _countdown = kFeedbackAutoReset.inSeconds;

  @override
  void dispose() {
    _commentController.dispose();
    _resetTimer?.cancel();
    _countdownTimer?.cancel();
    super.dispose();
  }

  Future<void> _submit() async {
    if (_rating == 0 || _submitting) return;
    setState(() {
      _submitting = true;
      _error = null;
    });

    try {
      final result = await _feedbackService.submitCafeFeedback(
        cafeSlug: widget.cafeSlug,
        rating: _rating,
        comment: _commentController.text.trim(),
      );
      if (!mounted) return;
      if (result.success) {
        setState(() {
          _submitting = false;
          _submitted = true;
        });
        _scheduleReset();
      } else {
        setState(() {
          _submitting = false;
          _error = result.error ?? 'Failed to submit feedback';
        });
      }
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _submitting = false;
        _error = 'Network error. Please try again.';
      });
    }
  }

  void _scheduleReset() {
    _resetTimer?.cancel();
    _countdownTimer?.cancel();
    _countdown = kFeedbackAutoReset.inSeconds;
    _resetTimer = Timer(kFeedbackAutoReset, _backToWelcome);
    _countdownTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (!mounted || _countdown <= 1) {
        timer.cancel();
        return;
      }
      setState(() => _countdown -= 1);
    });
  }

  void _backToWelcome() {
    if (!mounted) return;
    Navigator.of(context).popUntil((route) => route.isFirst);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: CustomerColors.background,
      body: SafeArea(
        child: Column(
          children: [
            _Header(cafeName: widget.cafeName, onBack: _backToWelcome),
            Expanded(
              child: _submitted
                  ? _ThankYou(countdown: _countdown, onBack: _backToWelcome)
                  : _FeedbackForm(
                      rating: _rating,
                      onSelectRating: (v) => setState(() => _rating = v),
                      commentController: _commentController,
                      error: _error,
                      submitting: _submitting,
                      onSubmit: _submit,
                    ),
            ),
          ],
        ),
      ),
    );
  }
}

class _Header extends StatelessWidget {
  final String cafeName;
  final VoidCallback onBack;

  const _Header({required this.cafeName, required this.onBack});

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        color: CustomerColors.headerBackground,
        border: Border(bottom: BorderSide(color: CustomerColors.border, width: 2)),
      ),
      padding: const EdgeInsets.fromLTRB(16, 14, 16, 14),
      child: Row(
        children: [
          NeoPressable(
            onTap: onBack,
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
                Text('FEEDBACK', style: CustomerText.display(fontSize: 16)),
                Text(cafeName, style: CustomerText.mono(fontSize: 12, color: CustomerColors.muted)),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _FeedbackForm extends StatelessWidget {
  final int rating;
  final ValueChanged<int> onSelectRating;
  final TextEditingController commentController;
  final String? error;
  final bool submitting;
  final VoidCallback onSubmit;

  const _FeedbackForm({
    required this.rating,
    required this.onSelectRating,
    required this.commentController,
    required this.error,
    required this.submitting,
    required this.onSubmit,
  });

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 440),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const SizedBox(height: 16),
            Text(
              'HOW WAS YOUR EXPERIENCE?',
              textAlign: TextAlign.center,
              style: CustomerText.display(fontSize: 20),
            ),
            const SizedBox(height: 28),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                for (var i = 1; i <= 5; i++)
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 6),
                    child: NeoPressable(
                      onTap: () => onSelectRating(i),
                      child: Icon(
                        i <= rating ? Icons.star : Icons.star_border,
                        size: 44,
                        color: i <= rating ? CustomerColors.accent : CustomerColors.border,
                      ),
                    ),
                  ),
              ],
            ),
            const SizedBox(height: 28),
            Container(
              decoration: BoxDecoration(
                color: CustomerColors.surface,
                border: Border.all(color: CustomerColors.border, width: 2),
              ),
              child: TextField(
                controller: commentController,
                maxLines: 4,
                maxLength: 1000,
                style: CustomerText.mono(fontSize: 14, color: CustomerColors.foreground),
                decoration: InputDecoration(
                  filled: true,
                  fillColor: Colors.transparent,
                  hintText: 'Tell us more (optional)...',
                  hintStyle: CustomerText.mono(fontSize: 14, color: CustomerColors.border),
                  counterStyle: CustomerText.mono(fontSize: 11, color: CustomerColors.border),
                  contentPadding: const EdgeInsets.all(14),
                  border: InputBorder.none,
                ),
              ),
            ),
            if (error != null) ...[
              const SizedBox(height: 14),
              Text(
                error!,
                textAlign: TextAlign.center,
                style: CustomerText.mono(fontSize: 13, color: CustomerColors.danger),
              ),
            ],
            const SizedBox(height: 20),
            PrimaryButton(
              label: submitting ? 'Submitting...' : 'Submit Feedback',
              loading: submitting,
              onPressed: rating == 0 ? null : onSubmit,
            ),
          ],
        ),
      ),
    );
  }
}

class _ThankYou extends StatelessWidget {
  final int countdown;
  final VoidCallback onBack;

  const _ThankYou({required this.countdown, required this.onBack});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 72,
              height: 72,
              alignment: Alignment.center,
              decoration: BoxDecoration(
                border: Border.all(color: CustomerColors.accent.withValues(alpha: 0.6), width: 2),
              ),
              child: const Icon(Icons.check_circle_outline, size: 34, color: CustomerColors.accent),
            ),
            const SizedBox(height: 20),
            Text('THANK YOU!', textAlign: TextAlign.center, style: CustomerText.display(fontSize: 22)),
            const SizedBox(height: 8),
            Text(
              'Your feedback helps us improve.',
              textAlign: TextAlign.center,
              style: CustomerText.mono(fontSize: 13, color: CustomerColors.muted),
            ),
            const SizedBox(height: 12),
            Text(
              'Back to home in ${countdown}s',
              textAlign: TextAlign.center,
              style: CustomerText.mono(fontSize: 12, color: CustomerColors.border),
            ),
            const SizedBox(height: 24),
            SizedBox(
              width: 220,
              child: PrimaryButton(label: 'Back to Home', onPressed: onBack),
            ),
          ],
        ),
      ),
    );
  }
}
