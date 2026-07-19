import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

/// Exact palette lifted from `.customer-app` in src/app/globals.css
/// (the "Voltage Mono" design system used by the customer web frontend).
class CustomerColors {
  CustomerColors._();

  static const background = Color(0xFF111222);
  static const headerBackground = Color(0xFF0C0D1D);
  static const foreground = Color(0xFFE2E0F8);
  static const primary = Color(0xFFA078FF);
  static const primaryLight = Color(0xFFD0BCFF);
  static const primaryDark = Color(0xFF6D3BD7);
  static const accent = Color(0xFFCDF200);
  static const surface = Color(0xFF1E1E2F);
  static const surfaceHover = Color(0xFF28283A);
  static const border = Color(0xFF494454);
  static const muted = Color(0xFFCBC3D7);
  static const danger = Color(0xFFFFB4AB);
  static const vegGreen = Color(0xFF4ADE80);
  static const nonVegRed = Color(0xFFF87171);
  static const black = Color(0xFF000000);
}

/// Font helpers matching --font-display (Bricolage Grotesque) and
/// --font-jb-mono (JetBrains Mono) from the web app.
class CustomerText {
  CustomerText._();

  static TextStyle display({
    double fontSize = 16,
    FontWeight fontWeight = FontWeight.w800,
    Color color = CustomerColors.foreground,
    double letterSpacing = -0.5,
    double? height,
  }) {
    return GoogleFonts.bricolageGrotesque(
      fontSize: fontSize,
      fontWeight: fontWeight,
      color: color,
      letterSpacing: letterSpacing,
      height: height,
    );
  }

  static TextStyle mono({
    double fontSize = 13,
    FontWeight fontWeight = FontWeight.w400,
    Color color = CustomerColors.foreground,
    double letterSpacing = 0,
    double? height,
  }) {
    return GoogleFonts.jetBrainsMono(
      fontSize: fontSize,
      fontWeight: fontWeight,
      color: color,
      letterSpacing: letterSpacing,
      height: height,
    );
  }
}

/// Hard, offset drop shadow ("neo-shadow" / "neo-shadow-sm") used throughout
/// the customer web UI's neo-brutalist styling.
List<BoxShadow> neoShadow({double offset = 4}) => [
      BoxShadow(
        color: CustomerColors.black,
        offset: Offset(offset, offset),
        blurRadius: 0,
        spreadRadius: 0,
      ),
    ];

const neoShadowSmOffset = 2.0;

BoxDecoration squareCardDecoration({
  Color background = CustomerColors.surface,
  Color borderColor = CustomerColors.border,
  double borderWidth = 2,
  List<BoxShadow>? shadow,
}) {
  return BoxDecoration(
    color: background,
    border: Border.all(color: borderColor, width: borderWidth),
    boxShadow: shadow,
  );
}

final ThemeData kioskTheme = ThemeData(
  useMaterial3: true,
  brightness: Brightness.dark,
  scaffoldBackgroundColor: CustomerColors.background,
  colorScheme: const ColorScheme.dark(
    surface: CustomerColors.background,
    primary: CustomerColors.accent,
    secondary: CustomerColors.primary,
    error: CustomerColors.danger,
  ),
  textTheme: TextTheme(
    bodyMedium: CustomerText.mono(fontSize: 14, color: CustomerColors.muted),
    bodyLarge: CustomerText.mono(fontSize: 16, color: CustomerColors.foreground),
  ),
  splashFactory: NoSplash.splashFactory,
  highlightColor: Colors.transparent,
);
