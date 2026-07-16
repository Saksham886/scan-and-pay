import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'config/app_theme.dart';
import 'screens/menu/menu_screen.dart';
import 'screens/setup/setup_screen.dart';
import 'state/cart_provider.dart';
import 'state/kiosk_config_provider.dart';
import 'state/menu_provider.dart';
import 'widgets/loading_view.dart';

void main() {
  runApp(const KioskApp());
}

class KioskApp extends StatelessWidget {
  const KioskApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => KioskConfigProvider()..load()),
        ChangeNotifierProvider(create: (_) => CartProvider()),
        ChangeNotifierProvider(create: (_) => MenuProvider()),
      ],
      child: MaterialApp(
        title: 'Kiosk Ordering',
        debugShowCheckedModeBanner: false,
        theme: kioskTheme,
        home: const _RootRouter(),
      ),
    );
  }
}

class _RootRouter extends StatelessWidget {
  const _RootRouter();

  @override
  Widget build(BuildContext context) {
    final config = context.watch<KioskConfigProvider>();
    if (!config.isLoaded) {
      return const Scaffold(body: LoadingView());
    }
    return config.isConfigured ? const MenuScreen() : const SetupScreen();
  }
}
