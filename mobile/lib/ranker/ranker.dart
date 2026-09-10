import '../models/home_response.dart';

// On-device ranker - Dart port of backend/src/ranker/rank.js, kept in sync
// deliberately. This is the whole reason a mobile client exists in this
// architecture (docs/plan.md section 3, rule 3): the persona vector,
// engagement history and fatigue counters computed here NEVER leave the
// phone. The backend only ever sends unranked `cards[]` + pinned
// `overrides[]`; this file does the actual personalization.

class RankWeights {
  final double affinity;
  final double severity;
  final double temporal;
  final double engagement;
  final double fatigue;

  const RankWeights({
    this.affinity = 0.4,
    this.severity = 0.35,
    this.temporal = 0.1,
    this.engagement = 0.2,
    this.fatigue = 0.25,
  });
}

double _bandSeverity(HomeCard card) {
  final band = card.index.band.toLowerCase();
  if (['severe', 'very poor', 'unsafe', 'red'].contains(band)) return 1;
  if (['poor', 'caution', 'orange'].contains(band)) return 0.7;
  if (['moderate', 'yellow'].contains(band)) return 0.4;
  return 0.15;
}

double _temporalFit(HomeCard card, int hourOfDay) {
  if (card.type == 'commuter' || card.type == 'parent_commute_window') {
    final inWindow = (hourOfDay >= 6 && hourOfDay <= 10) || (hourOfDay >= 15 && hourOfDay <= 19);
    return inWindow ? 1 : 0.3;
  }
  if (card.type == 'fitness_run') {
    return (hourOfDay <= 10 || hourOfDay >= 16) ? 0.8 : 0.4;
  }
  return 0.5;
}

class FatigueCounter {
  final int shown;
  final int ignored;
  const FatigueCounter({this.shown = 0, this.ignored = 0});
}

class RankedCard {
  final HomeCard card;
  final double score;
  RankedCard(this.card, this.score);
}

List<RankedCard> rankCards({
  required List<HomeCard> cards,
  required Map<String, double> affinityVector,
  Map<String, double> engagement = const {},
  Map<String, FatigueCounter> fatigue = const {},
  RankWeights weights = const RankWeights(),
  int? hourOfDay,
}) {
  final hour = hourOfDay ?? DateTime.now().hour;

  final scored = cards.map((card) {
    var affinity = 0.0;
    for (final tag in card.affinityTags) {
      final v = affinityVector[tag] ?? 0.0;
      if (v > affinity) affinity = v;
    }
    final severity = _bandSeverity(card);
    final temporal = _temporalFit(card, hour);
    final eng = engagement[card.cardId] ?? 0.5;
    final f = fatigue[card.cardId] ?? const FatigueCounter();
    final double fatiguePenalty =
        f.shown == 0 ? 0.0 : (f.ignored / f.shown).clamp(0.0, 1.0).toDouble();

    final double score = weights.affinity * affinity +
        weights.severity * severity +
        weights.temporal * temporal +
        weights.engagement * eng -
        weights.fatigue * fatiguePenalty;

    return RankedCard(card, score);
  }).toList();

  scored.sort((a, b) => b.score.compareTo(a.score));
  return scored;
}

// Thompson-sampling-style nudge: reward taps, decay on ignores. Same formula
// as the backend's updateEngagement, run here instead so the learned weights
// stay on-device.
Map<String, double> updateEngagement(Map<String, double> engagement, String cardId, bool tapped) {
  final prior = engagement[cardId] ?? 0.5;
  const rate = 0.15;
  final next = tapped ? prior + rate * (1 - prior) : prior - rate * prior;
  final clamped = next.clamp(0.0, 1.0);
  return {...engagement, cardId: double.parse(clamped.toStringAsFixed(3))};
}
