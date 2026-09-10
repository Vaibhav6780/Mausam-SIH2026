import 'package:flutter/material.dart';
import 'onboarding/onboarding_screen.dart';
import 'onboarding/persona_store.dart';
import 'screens/home_screen.dart';

void main() {
  runApp(const MausamHomeApp());
}

class MausamHomeApp extends StatelessWidget {
  const MausamHomeApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Mausam Home',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(colorSchemeSeed: const Color(0xFF3A6FD8), useMaterial3: true),
      home: const _RootGate(),
    );
  }
}

// Routes to onboarding on first launch, home screen thereafter - the "three
// taps max, fully skippable" flow from plan section 6.
class _RootGate extends StatefulWidget {
  const _RootGate();

  @override
  State<_RootGate> createState() => _RootGateState();
}

class _RootGateState extends State<_RootGate> {
  final _persona = PersonaStore();
  bool? _onboarded;

  @override
  void initState() {
    super.initState();
    _persona.isOnboarded().then((v) => setState(() => _onboarded = v));
  }

  @override
  Widget build(BuildContext context) {
    if (_onboarded == null) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }
    if (_onboarded == false) {
      return OnboardingScreen(onDone: () => setState(() => _onboarded = true));
    }
    return const HomeScreen();
  }
}
