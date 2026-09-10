import 'package:flutter/material.dart';
import 'persona_store.dart';

const Map<String, String> kInterestLabels = {
  'health': 'Air quality & health',
  'fitness': 'Fitness & running',
  'beach': 'Beach & coast',
  'commuter': 'Daily commute',
  'parent': 'School run / kids',
  'agriculture': 'Farming',
  'travel': 'Travel',
  'events': 'Outdoor events',
};

// Three-tap onboarding (plan section 6): interest chips -> location ->
// optional commute route, fully skippable. Location/commute route are
// stubbed here (no maps SDK wired into this scaffold) - what matters for the
// demo and for the ranker is the affinity vector from the chip selection.
class OnboardingScreen extends StatefulWidget {
  final VoidCallback onDone;
  const OnboardingScreen({super.key, required this.onDone});

  @override
  State<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends State<OnboardingScreen> {
  final Set<String> _selected = {};
  final _store = PersonaStore();

  Future<void> _finish() async {
    final vector = _store.vectorFromSelection(_selected);
    await _store.saveAffinity(vector);
    widget.onDone();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('What do you care about?')),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Pick as many as you like. Your homepage reorders around these - '
              'safety warnings always show regardless.',
              style: TextStyle(color: Colors.black54),
            ),
            const SizedBox(height: 16),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: kInterestLabels.entries.map((entry) {
                final selected = _selected.contains(entry.key);
                return FilterChip(
                  label: Text(entry.value),
                  selected: selected,
                  onSelected: (v) => setState(() {
                    if (v) {
                      _selected.add(entry.key);
                    } else {
                      _selected.remove(entry.key);
                    }
                  }),
                );
              }).toList(),
            ),
            const Spacer(),
            Row(
              children: [
                TextButton(
                  onPressed: widget.onDone,
                  child: const Text('Skip'),
                ),
                const Spacer(),
                FilledButton(
                  onPressed: _finish,
                  child: const Text('Continue'),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
