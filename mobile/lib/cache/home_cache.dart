import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/home_response.dart';

// Stale-while-revalidate cache. Plan rule (section 3): "degrade gracefully -
// cached data + visible 'last updated N min ago', never a spinner." The repo
// structure calls for Isar/SQLite here; SharedPreferences is a deliberately
// simple stand-in that satisfies the same contract (persist last-good
// response, read it back when the network fails) without adding a native
// plugin dependency to an unbuildable-here scaffold.
class HomeCache {
  static const _dataKey = 'home_cache_data';
  static const _fetchedAtKey = 'home_cache_fetched_at';

  Future<void> save(HomeResponse response) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_dataKey, jsonEncode(response.toJson()));
    await prefs.setString(_fetchedAtKey, DateTime.now().toIso8601String());
  }

  Future<(HomeResponse, DateTime)?> load() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_dataKey);
    final fetchedAtRaw = prefs.getString(_fetchedAtKey);
    if (raw == null || fetchedAtRaw == null) return null;
    final response = HomeResponse.fromJson(jsonDecode(raw) as Map<String, dynamic>);
    final fetchedAt = DateTime.tryParse(fetchedAtRaw) ?? DateTime.now();
    return (response, fetchedAt);
  }
}
