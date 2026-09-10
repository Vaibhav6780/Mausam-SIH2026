// Mirrors the GET /v1/home contract in docs/plan.md section 9.
// Deliberately permissive parsing (missing fields default rather than throw)
// so a backend field addition never crashes the home screen mid-demo.

class CardSource {
  final String name;
  final String? station;
  final double? distanceKm;

  CardSource({required this.name, this.station, this.distanceKm});

  factory CardSource.fromJson(Map<String, dynamic>? json) {
    if (json == null) return CardSource(name: 'Unknown');
    return CardSource(
      name: json['name'] as String? ?? 'Unknown',
      station: json['station'] as String?,
      distanceKm: (json['distance_km'] as num?)?.toDouble(),
    );
  }
}

class CardIndex {
  final String name;
  final num value;
  final String band;
  final double confidence;

  CardIndex({required this.name, required this.value, required this.band, required this.confidence});

  factory CardIndex.fromJson(Map<String, dynamic>? json) {
    if (json == null) return CardIndex(name: 'Unknown', value: 0, band: '', confidence: 0);
    return CardIndex(
      name: json['name'] as String? ?? 'Unknown',
      value: (json['value'] as num?) ?? 0,
      band: json['band'] as String? ?? '',
      confidence: (json['confidence'] as num?)?.toDouble() ?? 0,
    );
  }
}

class HomeCard {
  final String cardId;
  final String type;
  final CardIndex index;
  final String verdict;
  final String why;
  final List<double> features;
  final List<String> affinityTags;
  final int ttlSeconds;
  final CardSource source;
  final bool modelled;

  HomeCard({
    required this.cardId,
    required this.type,
    required this.index,
    required this.verdict,
    required this.why,
    required this.features,
    required this.affinityTags,
    required this.ttlSeconds,
    required this.source,
    required this.modelled,
  });

  factory HomeCard.fromJson(Map<String, dynamic> json) {
    return HomeCard(
      cardId: json['card_id'] as String? ?? 'unknown',
      type: json['type'] as String? ?? 'unknown',
      index: CardIndex.fromJson(json['index'] as Map<String, dynamic>?),
      verdict: json['verdict'] as String? ?? '',
      why: json['why'] as String? ?? '',
      features: ((json['features'] as List?) ?? const [])
          .map((e) => (e as num).toDouble())
          .toList(),
      affinityTags: ((json['affinity_tags'] as List?) ?? const [])
          .map((e) => e as String)
          .toList(),
      ttlSeconds: (json['ttl_seconds'] as num?)?.toInt() ?? 3600,
      source: CardSource.fromJson(json['source'] as Map<String, dynamic>?),
      modelled: json['modelled'] as bool? ?? false,
    );
  }
}

class CardOverride {
  final String cardId;
  final String severity; // green | yellow | orange | red
  final bool pinned;
  final String title;
  final String body;
  final String source;

  CardOverride({
    required this.cardId,
    required this.severity,
    required this.pinned,
    required this.title,
    required this.body,
    required this.source,
  });

  factory CardOverride.fromJson(Map<String, dynamic> json) {
    return CardOverride(
      cardId: json['card_id'] as String? ?? 'unknown',
      severity: json['severity'] as String? ?? 'red',
      pinned: json['pinned'] as bool? ?? true,
      title: json['title'] as String? ?? 'Warning',
      body: json['body'] as String? ?? '',
      source: json['source'] as String? ?? '',
    );
  }
}

class HomeLocation {
  final String district;
  final String stationId;
  final String stationName;

  HomeLocation({required this.district, required this.stationId, required this.stationName});

  factory HomeLocation.fromJson(Map<String, dynamic>? json) {
    if (json == null) return HomeLocation(district: '', stationId: '', stationName: '');
    return HomeLocation(
      district: json['district'] as String? ?? '',
      stationId: json['station_id'] as String? ?? '',
      stationName: json['station_name'] as String? ?? '',
    );
  }
}

class HomeResponse {
  final HomeLocation location;
  final DateTime generatedAt;
  final String scenarioLabel;
  final List<CardOverride> overrides;
  final List<HomeCard> cards;

  HomeResponse({
    required this.location,
    required this.generatedAt,
    required this.scenarioLabel,
    required this.overrides,
    required this.cards,
  });

  factory HomeResponse.fromJson(Map<String, dynamic> json) {
    return HomeResponse(
      location: HomeLocation.fromJson(json['location'] as Map<String, dynamic>?),
      generatedAt: DateTime.tryParse(json['generated_at'] as String? ?? '') ?? DateTime.now(),
      scenarioLabel: (json['scenario'] as Map<String, dynamic>?)?['label'] as String? ?? '',
      overrides: ((json['overrides'] as List?) ?? const [])
          .map((e) => CardOverride.fromJson(e as Map<String, dynamic>))
          .toList(),
      cards: ((json['cards'] as List?) ?? const [])
          .map((e) => HomeCard.fromJson(e as Map<String, dynamic>))
          .toList(),
    );
  }

  Map<String, dynamic> toJson() => {
        'location': {
          'district': location.district,
          'station_id': location.stationId,
          'station_name': location.stationName,
        },
        'generated_at': generatedAt.toIso8601String(),
        'scenario': {'label': scenarioLabel},
        'overrides': overrides
            .map((o) => {
                  'card_id': o.cardId,
                  'severity': o.severity,
                  'pinned': o.pinned,
                  'title': o.title,
                  'body': o.body,
                  'source': o.source,
                })
            .toList(),
        'cards': cards
            .map((c) => {
                  'card_id': c.cardId,
                  'type': c.type,
                  'index': {
                    'name': c.index.name,
                    'value': c.index.value,
                    'band': c.index.band,
                    'confidence': c.index.confidence,
                  },
                  'verdict': c.verdict,
                  'why': c.why,
                  'features': c.features,
                  'affinity_tags': c.affinityTags,
                  'ttl_seconds': c.ttlSeconds,
                  'source': {
                    'name': c.source.name,
                    'station': c.source.station,
                    'distance_km': c.source.distanceKm,
                  },
                  'modelled': c.modelled,
                })
            .toList(),
      };
}
