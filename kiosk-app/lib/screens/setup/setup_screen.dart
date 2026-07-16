import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

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
    return Scaffold(
      appBar: Navigator.of(context).canPop() ? AppBar(title: const Text('Reconfigure Kiosk')) : null,
      body: SafeArea(
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 480),
            child: Padding(
              padding: const EdgeInsets.all(32),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(Icons.storefront, size: 56),
                  const SizedBox(height: 16),
                  Text(
                    'Kiosk Setup',
                    style: Theme.of(context).textTheme.headlineMedium,
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Enter the cafe slug this kiosk should serve.',
                    textAlign: TextAlign.center,
                    style: Theme.of(context).textTheme.bodyMedium,
                  ),
                  const SizedBox(height: 32),
                  TextField(
                    controller: _controller,
                    autocorrect: false,
                    textInputAction: TextInputAction.done,
                    onSubmitted: (_) => _submit(),
                    decoration: const InputDecoration(
                      labelText: 'Cafe slug',
                      hintText: 'e.g. brew-and-bake',
                    ),
                  ),
                  if (_error != null) ...[
                    const SizedBox(height: 12),
                    Text(
                      _error!,
                      style: const TextStyle(color: Colors.redAccent),
                      textAlign: TextAlign.center,
                    ),
                  ],
                  const SizedBox(height: 24),
                  PrimaryButton(
                    label: 'Continue',
                    loading: _loading,
                    onPressed: _submit,
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
