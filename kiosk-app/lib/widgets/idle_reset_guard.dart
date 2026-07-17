import 'dart:async';

import 'package:flutter/material.dart';

/// Resets a shared kiosk back to a safe state after a period of no touch
/// activity. Without this, a customer who fills in their name/phone/email
/// at checkout and then walks away leaves that data on screen for whoever
/// picks up the kiosk next.
///
/// Wrap a screen's body with this and provide [onIdle] to run whatever
/// cleanup is appropriate (clearing the cart, navigating back to the menu).
/// Any pointer activity anywhere in [child] resets the timer.
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

class _IdleResetGuardState extends State<IdleResetGuard> {
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _restart();
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  void _restart() {
    _timer?.cancel();
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
