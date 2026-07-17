import 'dart:async';

import 'package:flutter/material.dart';

/// Registered on [MaterialApp.navigatorObservers] so [IdleResetGuard]
/// instances can tell when another screen has been pushed on top of them
/// (e.g. the PhonePe payment WebView on top of Checkout) and pause their
/// idle timer accordingly. Touches on that other screen never reach the
/// covered screen's [Listener], so without this the guard would wrongly
/// treat "busy filling in card details on the screen above" as "idle" and
/// reset the whole kiosk mid-payment.
final RouteObserver<ModalRoute<void>> kioskRouteObserver =
    RouteObserver<ModalRoute<void>>();

/// Resets a shared kiosk back to a safe state after a period of no touch
/// activity. Without this, a customer who fills in their name/phone/email
/// at checkout and then walks away leaves that data on screen for whoever
/// picks up the kiosk next.
///
/// Wrap a screen's body with this and provide [onIdle] to run whatever
/// cleanup is appropriate (clearing the cart, navigating back to the menu).
/// Any pointer activity anywhere in [child] resets the timer. The timer is
/// paused whenever another route is pushed on top of this screen.
class IdleResetGuard extends StatefulWidget {
  final Duration timeout;
  final VoidCallback onIdle;
  final Widget child;

  const IdleResetGuard({
    super.key,
    required this.timeout,
    required this.onIdle,
    required this.child,
  });

  @override
  State<IdleResetGuard> createState() => _IdleResetGuardState();
}

class _IdleResetGuardState extends State<IdleResetGuard> with RouteAware {
  Timer? _timer;
  bool _isTopRoute = true;

  @override
  void initState() {
    super.initState();
    _restart();
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final route = ModalRoute.of(context);
    if (route != null) {
      kioskRouteObserver.subscribe(this, route);
    }
  }

  @override
  void dispose() {
    _timer?.cancel();
    kioskRouteObserver.unsubscribe(this);
    super.dispose();
  }

  @override
  void didPushNext() {
    // Another screen is now on top - stop counting idle time against this
    // one until it's visible again.
    _isTopRoute = false;
    _timer?.cancel();
  }

  @override
  void didPopNext() {
    // Back on top - resume watching for inactivity.
    _isTopRoute = true;
    _restart();
  }

  void _restart() {
    _timer?.cancel();
    if (!_isTopRoute) return;
    _timer = Timer(widget.timeout, widget.onIdle);
  }

  @override
  Widget build(BuildContext context) {
    return Listener(
      behavior: HitTestBehavior.translucent,
      onPointerDown: (_) => _restart(),
      onPointerMove: (_) => _restart(),
      child: widget.child,
    );
  }
}
