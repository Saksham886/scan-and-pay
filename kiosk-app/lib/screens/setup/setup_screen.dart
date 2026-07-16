import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../config/customer_theme.dart';
import '../../services/menu_service.dart';
import '../../state/kiosk_config_provider.dart';
import '../../widgets/primary_button.dart';
import '../menu/menu_screen.dart';

class SetupScreen extends StatefulWidget {
  const SetupScreen({super.key});

  @override
  State<SetupScreen> createState() => _SetupScreenState();
}

class _SetupScreenState extends State<SetupScreen> {
  final _controller = TextEditingController();
  final _menuService = MenuService();
  bool _loading = false;
  String? _error;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final slug = _controller.text.trim().toLowerCase();
    if (slug.isEmpty) {
      setState(() => _error = 'Enter a cafe slug');
      return;
    }
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final result = await _menuService.getMenu(slug);
      if (!mounted) return;
      if (result.success && result.data != null) {
        await context.read<KioskConfigProvider>().setCafe(
              slug: slug,
              name: result.data!.cafe.name,
            );
        if (!mounted) return;
        Navigator.of(context).pushAndRemoveUntil(
          MaterialPageRoute(builder: (_) => const MenuScreen()),
          (route) => false,
        );
      } else {
        setState(() {
          _error = result.statusCode == 404
              ? "No cafe found with slug \"$slug\""
              : (result.error ?? 'Could not reach the cafe. Check the slug and try again.');
        });
      }
    } catch (_) {
      if (!mounted) return;
      setState(() => _error = 'Network error. Check the connection and try again.');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final canPop = Navigator.of(context).canPop();
    return Scaffold(
      backgroundColor: CustomerColors.background,
      body: SafeArea(
        child: Column(
          children: [
            if (canPop)
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
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
                    Text('Reconfigure Kiosk', style: CustomerText.display(fontSize: 16)),
                  ],
                ),
              ),
            Expanded(
              child: LayoutBuilder(
                builder: (context, constraints) {
                  return SingleChildScrollView(
                    padding: const EdgeInsets.all(32),
                    child: ConstrainedBox(
                      constraints: BoxConstraints(minHeight: constraints.maxHeight - 64),
                      child: Center(
                        child: ConstrainedBox(
                          constraints: const BoxConstraints(maxWidth: 440),
                          child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Container(
                          width: 72,
                          height: 72,
                          alignment: Alignment.center,
                          decoration: BoxDecoration(border: Border.all(color: CustomerColors.primary, width: 2)),
                          child: const Icon(Icons.storefront_outlined, size: 34, color: CustomerColors.primary),
                        ),
                        const SizedBox(height: 20),
                        Text('KIOSK SETUP', style: CustomerText.display(fontSize: 24)),
                        const SizedBox(height: 8),
                        Text(
                          'Enter the cafe slug this kiosk should serve.',
                          textAlign: TextAlign.center,
                          style: CustomerText.mono(fontSize: 13, color: CustomerColors.muted),
                        ),
                        const SizedBox(height: 32),
                        Container(
                          decoration: BoxDecoration(border: Border.all(color: CustomerColors.border, width: 2)),
                          child: TextField(
                            controller: _controller,
                            autocorrect: false,
                            textInputAction: TextInputAction.done,
                            onSubmitted: (_) => _submit(),
                            style: CustomerText.mono(fontSize: 15, color: CustomerColors.foreground),
                            decoration: InputDecoration(
                              filled: true,
                              fillColor: CustomerColors.surface,
                              labelText: 'CAFE SLUG',
                              labelStyle: CustomerText.mono(fontSize: 12, color: CustomerColors.muted),
                              hintText: 'e.g. brew-and-bake',
                              hintStyle: CustomerText.mono(fontSize: 14, color: CustomerColors.border),
                              contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 16),
                              border: InputBorder.none,
                            ),
                          ),
                        ),
                        if (_error != null) ...[
                          const SizedBox(height: 14),
                          Text(
                            _error!,
                            style: CustomerText.mono(fontSize: 13, color: CustomerColors.danger),
                            textAlign: TextAlign.center,
                          ),
                        ],
                        const SizedBox(height: 24),
                        PrimaryButton(label: 'Continue', loading: _loading, onPressed: _submit),
                      ],
                          ),
                        ),
                      ),
                    ),
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }
}
