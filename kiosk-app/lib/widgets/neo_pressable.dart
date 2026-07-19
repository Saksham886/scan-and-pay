import 'package:flutter/material.dart';

/// Reproduces the web app's neo-brutalist press interaction:
/// `active:translate-x-[Npx] active:translate-y-[Npx] active:shadow-none`.
/// Wrap any hard-shadowed control (pill buttons, cards) with this so a tap
/// slides it into its own shadow instead of using a ripple/opacity effect.
class NeoPressable extends StatefulWidget {
  final Widget child;
  final VoidCallback? onTap;
  final double travel;

  const NeoPressable({
    super.key,
    required this.child,
    required this.onTap,
    this.travel = 4,
  });

  @override
  State<NeoPressable> createState() => _NeoPressableState();
}

class _NeoPressableState extends State<NeoPressable> {
  bool _pressed = false;

  void _setPressed(bool value) {
    if (_pressed != value) setState(() => _pressed = value);
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTapDown: widget.onTap == null ? null : (_) => _setPressed(true),
      onTapUp: widget.onTap == null ? null : (_) => _setPressed(false),
      onTapCancel: widget.onTap == null ? null : () => _setPressed(false),
      onTap: widget.onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 75),
        transform: Matrix4.translationValues(
          _pressed ? widget.travel : 0,
          _pressed ? widget.travel : 0,
          0,
        ),
        child: widget.child,
      ),
    );
  }
}
