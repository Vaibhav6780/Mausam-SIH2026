import 'package:flutter/material.dart';
import '../api/api_client.dart';
import '../cache/home_cache.dart';
import '../models/home_response.dart';
import '../onboarding/persona_store.dart';
import '../ranker/ranker.dart' as ranker;
import '../cards/home_card_widget.dart';
import '../cards/override_banner.dart';
import '../i18n/strings.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  final _api = ApiClient();
  final _cache = HomeCache();
  final _persona = PersonaStore();

  // "account" here selects which server-side demo fixture to pull (see
  // backend/src/demo/scenarios.js DEMO_ACCOUNTS) so the same phone can
  // demo both personas; the actual ranking below always uses THIS device's
  // own on-device affinity vector, not the server's.
  String _account = 'amit';
  String _scenario = 'clear';
  AppLanguage _lang = AppLanguage.en;
  bool _offline = false;

  HomeResponse? _data;
  DateTime? _fetchedAt;
  bool _stale = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    if (_offline) {
      await _loadFromCache();
      return;
    }
    try {
      await _api.setScenario(_scenario);
      final response = await _api.fetchHome(account: _account);
      await _cache.save(response);
      setState(() {
        _data = response;
        _fetchedAt = DateTime.now();
        _stale = false;
        _error = null;
      });
    } catch (_) {
      await _loadFromCache();
    }
  }

  Future<void> _loadFromCache() async {
    final cached = await _cache.load();
    if (cached == null) {
      setState(() => _error = tr(_lang, 'noData'));
      return;
    }
    final (response, fetchedAt) = cached;
    setState(() {
      _data = response;
      _fetchedAt = fetchedAt;
      _stale = true;
      _error = null;
    });
  }

  Future<List<ranker.RankedCard>> _rankCurrentCards() async {
    final data = _data;
    if (data == null) return [];
    final affinity = await _persona.loadAffinity();
    final engagement = await _persona.loadEngagement();
    final rawFatigue = await _persona.loadFatigue();
    final fatigue = rawFatigue.map(
      (k, v) => MapEntry(k, ranker.FatigueCounter(shown: v['shown'] ?? 0, ignored: v['ignored'] ?? 0)),
    );
    return ranker.rankCards(
      cards: data.cards,
      affinityVector: affinity,
      engagement: engagement,
      fatigue: fatigue,
    );
  }

  Future<void> _onCardTap(HomeCard card) async {
    await _persona.recordShown(card.cardId, ignored: false);
    final engagement = await _persona.loadEngagement();
    await _persona.saveEngagement(ranker.updateEngagement(engagement, card.cardId, true));
    try {
      await _api.recordTap(account: _account, cardId: card.cardId, tapped: true);
    } catch (_) {
      // Offline tap: local engagement update above still applies on-device.
    }
    setState(() {});
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(tr(_lang, 'title')),
        actions: [
          PopupMenuButton<String>(
            icon: const Icon(Icons.person),
            onSelected: (v) {
              setState(() => _account = v);
              _load();
            },
            itemBuilder: (_) => const [
              PopupMenuItem(value: 'amit', child: Text('Amit (fitness + health)')),
              PopupMenuItem(value: 'priya', child: Text('Priya (parent + commuter)')),
            ],
          ),
          PopupMenuButton<String>(
            icon: const Icon(Icons.cloud_outlined),
            onSelected: (v) {
              setState(() => _scenario = v);
              _load();
            },
            itemBuilder: (_) => const [
              PopupMenuItem(value: 'clear', child: Text('Clear day')),
              PopupMenuItem(value: 'delhi_fog', child: Text('Delhi fog morning')),
              PopupMenuItem(value: 'cyclone', child: Text('Cyclone on east coast')),
              PopupMenuItem(value: 'heatwave', child: Text('North India heatwave')),
              PopupMenuItem(value: 'punjab_frost', child: Text('Punjab frost night')),
            ],
          ),
          IconButton(
            icon: const Icon(Icons.translate),
            onPressed: () => setState(() => _lang = _lang == AppLanguage.en ? AppLanguage.hi : AppLanguage.en),
          ),
          IconButton(
            icon: Icon(_offline ? Icons.wifi_off : Icons.wifi),
            onPressed: () {
              setState(() => _offline = !_offline);
              _load();
            },
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _load,
        child: _buildBody(),
      ),
    );
  }

  Widget _buildBody() {
    if (_error != null) {
      return ListView(children: [Padding(padding: const EdgeInsets.all(24), child: Text(_error!))]);
    }
    final data = _data;
    if (data == null) {
      return const Center(child: CircularProgressIndicator());
    }

    return FutureBuilder<List<ranker.RankedCard>>(
      future: _rankCurrentCards(),
      builder: (context, snapshot) {
        final ranked = snapshot.data ?? [];
        final minsAgo = _fetchedAt == null ? 0 : DateTime.now().difference(_fetchedAt!).inMinutes;

        return ListView(
          padding: const EdgeInsets.all(16),
          children: [
            if (_stale)
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(10),
                margin: const EdgeInsets.only(bottom: 12),
                decoration: BoxDecoration(color: const Color(0xFFFCEFD0), borderRadius: BorderRadius.circular(8)),
                child: Text(tr(_lang, 'offlineBanner'), style: const TextStyle(color: Color(0xFF8A6D1E))),
              ),
            Text(
              '${data.location.district} · ${data.scenarioLabel}',
              style: const TextStyle(color: Colors.black54, fontSize: 12),
            ),
            Text(
              '${tr(_lang, 'lastUpdated')} $minsAgo ${tr(_lang, 'minAgo')}${_stale ? ' (${tr(_lang, 'cached')})' : ''}',
              style: const TextStyle(color: Colors.black54, fontSize: 12),
            ),
            const SizedBox(height: 12),
            for (final o in data.overrides) OverrideBanner(data: o),
            for (final r in ranked)
              HomeCardWidget(card: r.card, lang: _lang, onTap: () => _onCardTap(r.card)),
          ],
        );
      },
    );
  }
}
