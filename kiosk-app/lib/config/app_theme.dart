import 'package:flutter/material.dart';

final ThemeData kioskTheme = ThemeData(
  useMaterial3: true,
  colorScheme: ColorScheme.fromSeed(
    seedColor: const Color(0xFFCDF200),
    brightness: Brightness.dark,
  ),
  scaffoldBackgroundColor: const Color(0xFF111222),
  textTheme: const TextTheme(
    bodyMedium: TextStyle(fontSize: 18),
    bodyLarge: TextStyle(fontSize: 20),
  ),
  elevatedButtonTheme: ElevatedButtonThemeData(
    style: ElevatedButton.styleFrom(
      minimumSize: const Size(88, 64),
      textStyle: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
    ),
  ),
  filledButtonTheme: FilledButtonThemeData(
    style: FilledButton.styleFrom(
      minimumSize: const Size(88, 64),
      textStyle: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
    ),
  ),
  inputDecorationTheme: const InputDecorationTheme(
    border: OutlineInputBorder(),
    contentPadding: EdgeInsets.symmetric(horizontal: 16, vertical: 20),
  ),
);
