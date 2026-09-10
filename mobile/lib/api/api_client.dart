import 'dart:convert';
import 'package:http/http.dart' as http;
import '../models/home_response.dart';

// Talks to the backend/ spine in this repo (see docs/plan.md section 9 for
// the contract). Base URL defaults to the Android emulator's host-loopback
// alias; override per platform when running against a real device.
class ApiClient {
  final String baseUrl;
  final Duration timeout;

  ApiClient({this.baseUrl = 'http://10.0.2.2:3000', this.timeout = const Duration(seconds: 5)});

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
