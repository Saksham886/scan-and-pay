import 'dart:async';

import 'package:flutter/material.dart';

import '../../config/constants.dart';
import '../../config/customer_theme.dart';
import '../../services/feedback_service.dart';
import '../../widgets/neo_pressable.dart';
import '../../widgets/primary_button.dart';

/// One answer option: what the customer reads, and the enum name the API
/// stores.
class _Option {
  final String value;
  final String label;

  const _Option(this.value, this.label);
}

/// One survey question. [key] matches the field name in the POST body so the
/// answers map straight onto the request.
class _Question {
  final String key;
  final String prompt;
  final List<_Option> options;

  const _Question({required this.key, required this.prompt, required this.options});
}

const _questions = <_Question>[
  _Question(
    key: 'mealSession',
    prompt: 'Meal Session',
    options: [
      _Option('BREAKFAST', 'Breakfast'),
      _Option('LUNCH', 'Lunch'),
      _Option('SNACKS', 'Snacks'),
    ],
  ),
  _Question(
    key: 'foodQuality',
    prompt: 'How would you rate the taste and quality of the food?',
    options: [
      _Option('EXCELLENT', 'Excellent'),
      _Option('GOOD', 'Good'),
      _Option('AVERAGE', 'Average'),
      _Option('NEEDS_IMPROVEMENT', 'Needs Improvement'),
    ],
  ),
  _Question(
    key: 'cleanliness',
    prompt: 'How clean and hygienic is the cafeteria seating and serving area?',
    options: [
      _Option('VERY_CLEAN', 'Very Clean'),
      _Option('MOSTLY_CLEAN', 'Mostly Clean'),
      _Option('OFTEN_DIRTY', 'Often Dirty'),
    ],
  ),
  _Question(
    key: 'menuVariety',
    prompt: 'How do you feel about the menu variety and options?',
    options: [
      _Option('GREAT', 'Great'),
      _Option('DECENT', 'Decent'),
      _Option('NOT_ENOUGH_VARIETY', 'Not Enough Variety'),
    ],
  ),
  _Question(
    key: 'overallExperience',
    prompt: 'How would you rate your overall experience at the cafeteria?',
    options: [
      _Option('EXCELLENT', 'Excellent'),
      _Option('GOOD', 'Good'),
      _Option('POOR', 'Poor'),
    ],
  ),
];

/// General "how was your experience" feedback about the cafe, reached from
/// the welcome screen - not tied to any order. Distinct from [FeedbackScreen],
/// which rates a specific order right after checkout.
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
  final _nameController = TextEditingController();
  Timer? _resetTimer;
  Timer? _countdownTimer;

  final Map<String, String> _answers = {};
  bool _submitting = false;
  bool _submitted = false;
  String? _error;
  int _countdown = kFeedbackAutoReset.inSeconds;

  @override
  void initState() {
    super.initState();
    // The submit button unlocks only once the name and every question are
    // filled in, so keystrokes have to drive a rebuild.
    _nameController.addListener(() => setState(() {}));
  }

  @override
  void dispose() {
    _nameController.dispose();
    _resetTimer?.cancel();
    _countdownTimer?.cancel();
    super.dispose();
  }

  bool get _complete =>
      _nameController.text.trim().isNotEmpty &&
      _questions.every((q) => _answers.containsKey(q.key));

  Future<void> _submit() async {
    if (!_complete || _submitting) return;
    setState(() {
      _submitting = true;
      _error = null;
    });

    try {
      final result = await _feedbackService.submitCafeSurvey(
        cafeSlug: widget.cafeSlug,
        customerName: _nameController.text.trim(),
        mealSession: _answers['mealSession']!,
        foodQuality: _answers['foodQuality']!,
        cleanliness: _answers['cleanliness']!,
        menuVariety: _answers['menuVariety']!,
        overallExperience: _answers['overallExperience']!,
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
                      nameController: _nameController,
                      answers: _answers,
                      onAnswer: (key, value) => setState(() => _answers[key] = value),
                      error: _error,
                      submitting: _submitting,
                      complete: _complete,
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
  final TextEditingController nameController;
  final Map<String, String> answers;
  final void Function(String key, String value) onAnswer;
  final String? error;
  final bool submitting;
  final bool complete;
  final VoidCallback onSubmit;

  const _FeedbackForm({
    required this.nameController,
    required this.answers,
    required this.onAnswer,
    required this.error,
    required this.submitting,
    required this.complete,
    required this.onSubmit,
  });

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 520),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            mainAxisSize: MainAxisSize.min,
            children: [
              const SizedBox(height: 8),
              Text(
                'HOW WAS YOUR EXPERIENCE?',
                textAlign: TextAlign.center,
                style: CustomerText.display(fontSize: 20),
              ),
              const SizedBox(height: 8),
              Text(
                'A few quick questions - it takes under a minute.',
                textAlign: TextAlign.center,
                style: CustomerText.mono(fontSize: 12, color: CustomerColors.muted),
              ),
              const SizedBox(height: 28),
              const _Prompt(text: 'Name', required: true),
              const SizedBox(height: 10),
              Container(
                decoration: BoxDecoration(
                  color: CustomerColors.surface,
                  border: Border.all(color: CustomerColors.border, width: 2),
                ),
                child: TextField(
                  controller: nameController,
                  maxLength: 80,
                  textCapitalization: TextCapitalization.words,
                  style: CustomerText.mono(fontSize: 15, color: CustomerColors.foreground),
                  decoration: InputDecoration(
                    filled: true,
                    fillColor: Colors.transparent,
                    hintText: 'Your name',
                    hintStyle: CustomerText.mono(fontSize: 15, color: CustomerColors.border),
                    counterText: '',
                    contentPadding: const EdgeInsets.all(14),
                    border: InputBorder.none,
                  ),
                ),
              ),
              for (final question in _questions) ...[
                const SizedBox(height: 26),
                _Prompt(text: question.prompt, required: true),
                const SizedBox(height: 10),
                for (final option in question.options)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 10),
                    child: _OptionTile(
                      label: option.label,
                      selected: answers[question.key] == option.value,
                      onTap: () => onAnswer(question.key, option.value),
                    ),
                  ),
              ],
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
                onPressed: complete ? onSubmit : null,
              ),
              if (!complete) ...[
                const SizedBox(height: 10),
                Text(
                  'Please answer every question to submit.',
                  textAlign: TextAlign.center,
                  style: CustomerText.mono(fontSize: 12, color: CustomerColors.muted),
                ),
              ],
              const SizedBox(height: 16),
            ],
          ),
        ),
      ),
    );
  }
}

class _Prompt extends StatelessWidget {
  final String text;
  final bool required;

  const _Prompt({required this.text, this.required = false});

  @override
  Widget build(BuildContext context) {
    return RichText(
      text: TextSpan(
        text: text,
        style: CustomerText.mono(
          fontSize: 14,
          fontWeight: FontWeight.w700,
          color: CustomerColors.foreground,
        ),
        children: required
            ? [
                TextSpan(
                  text: ' *',
                  style: CustomerText.mono(fontSize: 14, color: CustomerColors.danger),
                ),
              ]
            : null,
      ),
    );
  }
}

class _OptionTile extends StatelessWidget {
  final String label;
  final bool selected;
  final VoidCallback onTap;

  const _OptionTile({required this.label, required this.selected, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return NeoPressable(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 16),
        decoration: BoxDecoration(
          color: selected ? CustomerColors.accent : CustomerColors.surface,
          border: Border.all(
            color: selected ? CustomerColors.black : CustomerColors.border,
            width: 2,
          ),
          boxShadow: selected ? neoShadow(offset: neoShadowSmOffset) : null,
        ),
        child: Row(
          children: [
            Icon(
              selected ? Icons.radio_button_checked : Icons.radio_button_unchecked,
              size: 20,
              color: selected ? CustomerColors.black : CustomerColors.border,
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                label,
                style: CustomerText.mono(
                  fontSize: 15,
                  fontWeight: selected ? FontWeight.w700 : FontWeight.w500,
                  color: selected ? CustomerColors.black : CustomerColors.foreground,
                ),
              ),
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
