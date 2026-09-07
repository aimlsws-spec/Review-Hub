import 'package:flutter/material.dart';

/// Mirrors the `primary` and `brand` palettes defined in both web portals'
/// `tailwind.config.js`, so the mobile app reads as the same product.
class AppColors {
  AppColors._();

  // Primary (blue)
  static const Color primary50 = Color(0xFFEFF6FF);
  static const Color primary100 = Color(0xFFDBEAFE);
  static const Color primary200 = Color(0xFFBFDBFE);
  static const Color primary300 = Color(0xFF93C5FD);
  static const Color primary400 = Color(0xFF60A5FA);
  static const Color primary500 = Color(0xFF3B82F6);
  static const Color primary600 = Color(0xFF2563EB);
  static const Color primary700 = Color(0xFF1D4ED8);
  static const Color primary800 = Color(0xFF1E40AF);
  static const Color primary900 = Color(0xFF1E3A8A);

  // Brand (purple/magenta accent)
  static const Color brand500 = Color(0xFFD946EF);
  static const Color brand600 = Color(0xFFC026D3);

  // Orange/navy — the exact fills used in Viralkarlogo.svg, for the auth
  // journey (splash, onboarding, login/signup/OTP) only. Kept separate from
  // `primary` (blue), which the rest of the app keeps, mirroring how the web
  // portals use orange only on their login pages.
  static const Color orange50 = Color(0xFFFFF7ED);
  static const Color orange100 = Color(0xFFFFEDD5);
  static const Color orange300 = Color(0xFFFDBA74);
  static const Color orange500 = Color(0xFFF18E31);
  static const Color orange700 = Color(0xFFE4771A);
  static const Color navy900 = Color(0xFF173559);

  static const List<Color> authGradient = [orange500, orange700];

  // Semantic
  static const Color success = Color(0xFF16A34A);
  static const Color warning = Color(0xFFEAB308);
  static const Color danger = Color(0xFFDC2626);
  static const Color info = Color(0xFF3B82F6);

  // Neutrals
  static const Color slate50 = Color(0xFFF8FAFC);
  static const Color slate100 = Color(0xFFF1F5F9);
  static const Color slate200 = Color(0xFFE2E8F0);
  static const Color slate300 = Color(0xFFCBD5E1);
  static const Color slate400 = Color(0xFF94A3B8);
  static const Color slate500 = Color(0xFF64748B);
  static const Color slate600 = Color(0xFF475569);
  static const Color slate700 = Color(0xFF334155);
  static const Color slate800 = Color(0xFF1E293B);
  static const Color slate900 = Color(0xFF0F172A);

  static const Color white = Color(0xFFFFFFFF);
}
