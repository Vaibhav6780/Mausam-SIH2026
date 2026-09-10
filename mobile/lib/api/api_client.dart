import 'dart:convert';
import 'package:http/http.dart' as http;
import '../models/home_response.dart';

// Talks to the backend/ spine in this repo (see docs/plan.md section 9 for
// the contract). Defaults to the deployed Render backend so a phone install
// works over any network without extra setup. For local dev against
// `npm start` in backend/, pass baseUrl explicitly: 'http://localhost:3000'
// for web/desktop, or 'http://10.0.2.2:3000' for the Android emulator.
const String kDeployedBaseUrl = 'https://mausam-sih2026.onrender.com';

class ApiClient {
  final String baseUrl;
  final Duration timeout;

  // Render's free tier spins down on inactivity and can take 30-50s to wake
  // on a cold request - timeout generously rather than surfacing a false
  // "offline" state on the first tap after idling.
  ApiClient({this.baseUrl = kDeployedBaseUrl, this.timeout = const Duration(seconds: 45)});

  Future<HomeResponse> fetchHome({required String account}) async {
    final uri = Uri.parse('$baseUrl/v1/home').replace(queryParameters: {'account': account});
    final res = await http.get(uri).timeout(timeout);
    if (res.statusCode != 200) {
      throw Exception('GET /v1/home failed: ${res.statusCode}');
    }
    return HomeResponse.fromJson(jsonDecode(res.body) as Map<String, dynamic>);
  }

  Future<void> setScenario(String scenario) async {
    final uri = Uri.parse('$baseUrl/v1/scenario');
    await http
        .post(uri, headers: {'Content-Type': 'application/json'}, body: jsonEncode({'scenario': scenario}))
        .timeout(timeout);
  }

  Future<void> recordTap({required String account, required String cardId, required bool tapped}) async {
    final uri = Uri.parse('$baseUrl/v1/tap');
    await http
        .post(
          uri,
          headers: {'Content-Type': 'application/json'},
          body: jsonEncode({'account': account, 'cardId': cardId, 'tapped': tapped}),
        )
        .timeout(timeout);
  }

  Future<Map<String, dynamic>> fetchScenarios() async {
    final uri = Uri.parse('$baseUrl/v1/scenarios');
    final res = await http.get(uri).timeout(timeout);
    return jsonDecode(res.body) as Map<String, dynamic>;
  }
}
