import 'package:flutter/material.dart';

// Colour bands consistent with web/index.html so the two clients read as one
// system in demo screenshots.
Color severityColor(String band) {
  final b = band.toLowerCase();
  if (['severe', 'very poor', 'unsafe', 'red', 'active'].contains(b)) return const Color(0xFFD8432F);
  if (['poor', 'caution', 'orange'].contains(b)) return const Color(0xFFE08A1F);
  if (['moderate', 'yellow', 'fair'].contains(b)) return const Color(0xFFD8B310);
  return const Color(0xFF2FAE63);
}

Color severityForeground(String band) {
  final b = band.toLowerCase();
  if (['moderate', 'yellow', 'fair', 'good', 'satisfactory', 'safe', 'low', 'favourable', 'green'].contains(b)) {
    return const Color(0xFF0B1220);
  }
  return Colors.white;
}
