import 'package:test/test.dart';
import 'package:mausam_home/models/home_response.dart';
import 'package:mausam_home/ranker/ranker.dart';

// NOTE: not run in this environment (no Flutter/Dart SDK installed here) -
// mirrors backend/test/safetyOverride.test.js's ranking assertions so the
// two ranker ports (backend/src/ranker/rank.js and lib/ranker/ranker.dart)
// stay behaviourally in sync. Run with `flutter test` once the SDK is
// available.

HomeCard _card(String id, String type, List<String> tags, String band) {
  return HomeCard(
    cardId: id,
    type: type,
    index: CardIndex(name: 'X', value: 1, band: band, confidence: 0.8),
    verdict: 'verdict',
    why: 'why',
    features: const [],
    affinityTags: tags,
    ttlSeconds: 3600,
    source: CardSource(name: 'Test'),
    modelled: false,
  );
}

void main() {
  test('two affinity vectors produce different orderings for the same cards', () {
    final cards = [
      _card('aqi', 'health_aqi', ['health'], 'Poor'),
      _card('run', 'fitness_run', ['fitness'], 'Fair'),
      _card('commute', 'commuter', ['commuter'], 'green'),
    ];

    final fitnessFirst = rankCards(
      cards: cards,
      affinityVector: {'health': 0.9, 'fitness': 0.95, 'commuter': 0.1},
      hourOfDay: 12,
    );
    final commuterFirst = rankCards(
      cards: cards,
      affinityVector: {'health': 0.1, 'fitness': 0.1, 'commuter': 0.95},
      hourOfDay: 8,
    );

    expect(
      fitnessFirst.map((r) => r.card.cardId).toList(),
      isNot(equals(commuterFirst.map((r) => r.card.cardId).toList())),
    );
  });

  test('fatigue penalty pushes a repeatedly-ignored card down', () {
    final cards = [
      _card('a', 'health_aqi', ['health'], 'Moderate'),
      _card('b', 'health_aqi', ['health'], 'Moderate'),
    ];
    final ranked = rankCards(
      cards: cards,
      affinityVector: {'health': 0.9},
      fatigue: {'a': const FatigueCounter(shown: 10, ignored: 9)},
    );
    expect(ranked.first.card.cardId, 'b');
  });
}
