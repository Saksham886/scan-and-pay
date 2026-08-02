import 'dart:async';

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../config/constants.dart';
import '../../config/customer_theme.dart';
import '../../models/cafe.dart';
import '../../services/menu_service.dart';
import '../../state/kiosk_config_provider.dart';
import '../../widgets/error_view.dart';
import '../../widgets/loading_view.dart';
import '../../widgets/neo_pressable.dart';
import '../feedback/cafe_feedback_screen.dart';
import '../menu/menu_screen.dart';
import '../setup/setup_screen.dart';

/// Kiosk landing page shown before ordering starts: cafe name/hours/address
/// plus "Start Ordering" and "Feedback" - mirrors the web app's
/// `/[cafeSlug]` home screen (see src/frontend/components/customer/home-screen.tsx).
class WelcomeScreen extends StatefulWidget {
  const WelcomeScreen({super.key});

  @override
  State<WelcomeScreen> createState() => _WelcomeScreenState();
}

class _WelcomeScreenState extends State<WelcomeScreen> {
  final _menuService = MenuService();
  Timer? _holdTimer;
  Timer? _refreshTimer;

  CafeMeta? _meta;
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  @override
  void dispose() {
    _holdTimer?.cancel();
    _refreshTimer?.cancel();
    super.dispose();
  }

  Future<void> _load() async {
    final slug = context.read<KioskConfigProvider>().cafeSlug;
    if (slug == null) return;
    setState(() {
      _loading = true;
      _error = null;
    });
    await _fetch(slug);
    _startAutoRefresh(slug);
  }

  /// Keeps "Start Ordering" and the cafe hero in sync with the menu-schedule
  /// clock (see menu-schedule.ts) and any owner edits, the same way
  /// [MenuProvider] polls the menu screen - without this, a kiosk sitting
  /// idle on the welcome screen across e.g. the 11:30am lunch cutover would
  /// keep showing stale state until someone reopened the app.
  void _startAutoRefresh(String slug) {
    _refreshTimer?.cancel();
    _refreshTimer = Timer.periodic(kMenuRefreshInterval, (_) => _fetch(slug));
  }

  /// Unlike [_load], never toggles the full-screen loading state - this runs
  /// silently in the background so a periodic refresh doesn't flash the
  /// welcome screen back to a spinner every 60 seconds.
  Future<void> _fetch(String slug) async {
    try {
      final result = await _menuService.getCafeMeta(slug);
      if (!mounted) return;
      if (result.success && result.data != null) {
        setState(() {
          _meta = result.data;
          _loading = false;
          _error = null;
        });
      } else if (_meta == null) {
        setState(() {
          _error = result.error ?? 'Failed to load cafe';
          _loading = false;
        });
      }
    } catch (_) {
      if (!mounted) return;
      if (_meta == null) {
        setState(() {
          _error = 'Network error. Check the connection and try again.';
          _loading = false;
        });
      }
    }
  }

  void _startOrdering() {
    Navigator.of(context).push(MaterialPageRoute(builder: (_) => const MenuScreen()));
  }

  void _openFeedback() {
    final meta = _meta;
    if (meta == null) return;
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => CafeFeedbackScreen(cafeSlug: meta.cafe.slug, cafeName: meta.cafe.name),
      ),
    );
  }

  void _startHold() {
    _holdTimer = Timer(const Duration(seconds: 3), () {
      if (!mounted) return;
      Navigator.of(context).push(MaterialPageRoute(builder: (_) => const SetupScreen()));
    });
  }

  void _cancelHold() => _holdTimer?.cancel();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: CustomerColors.background,
      body: SafeArea(
        child: _loading
            ? const LoadingView(message: 'Loading...')
            : _error != null
                ? ErrorView(message: _error!, onRetry: _load)
                : _WelcomeContent(
                    meta: _meta!,
                    onStartOrdering: _startOrdering,
                    onFeedback: _openFeedback,
                    onHold: _startHold,
                    onHoldCancel: _cancelHold,
                  ),
      ),
    );
  }
}

class _WelcomeContent extends StatelessWidget {
  final CafeMeta meta;
  final VoidCallback onStartOrdering;
  final VoidCallback onFeedback;
  final VoidCallback onHold;
  final VoidCallback onHoldCancel;

  const _WelcomeContent({
    required this.meta,
    required this.onStartOrdering,
    required this.onFeedback,
    required this.onHold,
    required this.onHoldCancel,
  });

  @override
  Widget build(BuildContext context) {
    final cafe = meta.cafe;
    final canOrder = meta.activeMenu != null;

    return Column(
      children: [
        Container(
          width: double.infinity,
          decoration: const BoxDecoration(color: CustomerColors.headerBackground),
          padding: const EdgeInsets.fromLTRB(24, 32, 24, 28),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    width: 6,
                    height: 6,
                    decoration: const BoxDecoration(color: CustomerColors.accent, shape: BoxShape.circle),
                  ),
                  const SizedBox(width: 8),
                  Text(
                    'WELCOME',
                    style: CustomerText.mono(
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                      letterSpacing: 2,
                      color: CustomerColors.accent.withValues(alpha: 0.8),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              GestureDetector(
                onTapDown: (_) => onHold(),
                onTapUp: (_) => onHoldCancel(),
                onTapCancel: onHoldCancel,
                child: Text(
                  cafe.name.toUpperCase(),
                  style: CustomerText.display(fontSize: 34, fontWeight: FontWeight.w800, letterSpacing: -1),
                ),
              ),
              if (cafe.address != null || (cafe.openingTime != null && cafe.closingTime != null)) ...[
                const SizedBox(height: 14),
                Wrap(
                  spacing: 20,
                  runSpacing: 6,
                  children: [
                    if (cafe.address != null)
                      _HeroDetail(icon: Icons.place_outlined, text: cafe.address!),
                    if (cafe.openingTime != null && cafe.closingTime != null)
                      _HeroDetail(
                        icon: Icons.access_time,
                        text: '${cafe.openingTime} – ${cafe.closingTime}',
                      ),
                  ],
                ),
              ],
            ],
          ),
        ),
        Expanded(
          child: Center(
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 420),
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    if (canOrder)
                      SizedBox(
                        width: double.infinity,
                        child: NeoPressable(
                          onTap: onStartOrdering,
                          child: Container(
                            padding: const EdgeInsets.symmetric(vertical: 20, horizontal: 24),
                            decoration: BoxDecoration(
                              color: CustomerColors.accent,
                              border: Border.all(color: CustomerColors.black, width: 2),
                              borderRadius: BorderRadius.circular(999),
                              boxShadow: neoShadow(),
                            ),
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    const Icon(Icons.restaurant_outlined, size: 20, color: CustomerColors.black),
                                    const SizedBox(width: 10),
                                    Text(
                                      'START ORDERING',
                                      style: CustomerText.mono(
                                        fontSize: 15,
                                        fontWeight: FontWeight.w700,
                                        color: CustomerColors.black,
                                        letterSpacing: 1,
                                      ),
                                    ),
                                  ],
                                ),
                                const Icon(Icons.arrow_forward, size: 20, color: CustomerColors.black),
                              ],
                            ),
                          ),
                        ),
                      )
                    else
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.symmetric(vertical: 20, horizontal: 24),
                        decoration: BoxDecoration(
                          color: CustomerColors.surface,
                          border: Border.all(color: CustomerColors.border, width: 2),
                        ),
                        child: Column(
                          children: [
                            Text(
                              'NOT ACCEPTING ORDERS RIGHT NOW',
                              textAlign: TextAlign.center,
                              style: CustomerText.display(fontSize: 15),
                            ),
                            const SizedBox(height: 6),
                            Text(
                              'Please check back later',
                              textAlign: TextAlign.center,
                              style: CustomerText.mono(fontSize: 13, color: CustomerColors.muted),
                            ),
                          ],
                        ),
                      ),
                    const SizedBox(height: 16),
                    SizedBox(
                      width: double.infinity,
                      child: NeoPressable(
                        onTap: onFeedback,
                        child: Container(
                          padding: const EdgeInsets.symmetric(vertical: 20, horizontal: 24),
                          decoration: BoxDecoration(
                            border: Border.all(color: CustomerColors.border, width: 2),
                            borderRadius: BorderRadius.circular(999),
                          ),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  const Icon(Icons.star_border, size: 20, color: CustomerColors.primary),
                                  const SizedBox(width: 10),
                                  Text(
                                    'FEEDBACK',
                                    style: CustomerText.mono(
                                      fontSize: 15,
                                      fontWeight: FontWeight.w700,
                                      color: CustomerColors.foreground,
                                      letterSpacing: 1,
                                    ),
                                  ),
                                ],
                              ),
                              const Icon(Icons.arrow_forward, size: 20, color: CustomerColors.foreground),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ],
    );
  }
}

class _HeroDetail extends StatelessWidget {
  final IconData icon;
  final String text;

  const _HeroDetail({required this.icon, required this.text});

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: 13, color: CustomerColors.primary),
        const SizedBox(width: 5),
        Text(text, style: CustomerText.mono(fontSize: 12, color: CustomerColors.muted)),
      ],
    );
  }
}
