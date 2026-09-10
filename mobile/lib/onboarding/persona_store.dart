import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';

// Multi-label affinity vector (plan section 6: "a parent who runs and
// gardens is one user, not three"). Stored on-device only - never sent to
// the backend, which only ever returns unranked cards.
const List<String> kInterestTags = [
  'health',
  'fitness',
  'beach',
  'commuter',
  'parent',
  'agriculture',
  'travel',
  'events',
];

class PersonaStore {
  static const _affinityKey = 'persona_affinity_vector';
  static const _onboardedKey = 'persona_onboarded';
  static const _engagementKey = 'persona_engagement';
  static const _fatigueKey = 'persona_fatigue';

  Future<bool> isOnboarded() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getBool(_onboardedKey) ?? false;
  }

  Future<void> saveAffinity(Map<String, double> vector) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_affinityKey, jsonEncode(vector));
    await prefs.setBool(_onboardedKey, true);
  }

  Future<Map<String, double>> loadAffinity() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_affinityKey);
    if (raw == null) {
      // Skip path default: flat low-affinity vector rather than an empty one,
      // so cold-start ranking still has something to work with.
      return {for (final tag in kInterestTags) tag: 0.2};
    }
    final decoded = jsonDecode(raw) as Map<String, dynamic>;
    return decoded.map((k, v) => MapEntry(k, (v as num).toDouble()));
  }

  // Selected chips get high affinity, everything else stays low but non-zero
  // so an unselected persona's safety-relevant cards can still surface.
  Map<String, double> vectorFromSelection(Set<String> selected) {
    return {for (final tag in kInterestTags) tag: selected.contains(tag) ? 0.9 : 0.15};
  }

  Future<void> saveEngagement(Map<String, double> engagement) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_engagementKey, jsonEncode(engagement));
  }

  Future<Map<String, double>> loadEngagement() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_engagementKey);
    if (raw == null) return {};
    final decoded = jsonDecode(raw) as Map<String, dynamic>;
    return decoded.map((k, v) => MapEntry(k, (v as num).toDouble()));
  }

  Future<void> recordShown(String cardId, {required bool ignored}) async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_fatigueKey);
    final decoded = raw == null ? <String, dynamic>{} : jsonDecode(raw) as Map<String, dynamic>;
    final current = decoded[cardId] as Map<String, dynamic>? ?? {'shown': 0, 'ignored': 0};
    current['shown'] = (current['shown'] as int) + 1;
    if (ignored) current['ignored'] = (current['ignored'] as int) + 1;
    decoded[cardId] = current;
    await prefs.setString(_fatigueKey, jsonEncode(decoded));
  }

  Future<Map<String, Map<String, int>>> loadFatigue() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_fatigueKey);
    if (raw == null) return {};
    final decoded = jsonDecode(raw) as Map<String, dynamic>;
    return decoded.map((k, v) {
      final m = v as Map<String, dynamic>;
      return MapEntry(k, {'shown': m['shown'] as int, 'ignored': m['ignored'] as int});
    });
  }
}
