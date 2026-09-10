import 'package:flutter/material.dart';
import '../models/home_response.dart';
import '../i18n/strings.dart';
import 'severity.dart';

// One widget renders every card type - the type-specific logic lives in the
// index engine (backend), not the widget tree. `why` is explainability
// (plan section 6): tapping it expands the reason the card was surfaced.
class HomeCardWidget extends StatefulWidget {
  final HomeCard card;
  final AppLanguage lang;
  final VoidCallback onTap;

  const HomeCardWidget({super.key, required this.card, required this.lang, required this.onTap});

  @override
  State<HomeCardWidget> createState() => _HomeCardWidgetState();
}

class _HomeCardWidgetState extends State<HomeCardWidget> {
  bool _whyExpanded = false;

  @override
  Widget build(BuildContext context) {
    final card = widget.card;
    final color = severityColor(card.index.band);
    final fg = severityForeground(card.index.band);

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: InkWell(
        onTap: widget.onTap,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
                    decoration: BoxDecoration(color: color, borderRadius: BorderRadius.circular(999)),
                    child: Text(
                      card.index.band,
                      style: TextStyle(color: fg, fontSize: 11, fontWeight: FontWeight.w600),
                    ),
                  ),
                  const Spacer(),
                  if (card.modelled)
                    Tooltip(
                      message: tr(widget.lang, 'modelled'),
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                        decoration: BoxDecoration(
                          color: const Color(0xFFFCEFD0),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: const Text(
                          'Modelled',
                          style: TextStyle(fontSize: 11, color: Color(0xFF8A6D1E)),
                        ),
                      ),
                    ),
                ],
              ),
              const SizedBox(height: 8),
              Text(card.verdict, style: const TextStyle(fontSize: 15)),
              if (card.why.isNotEmpty) ...[
                const SizedBox(height: 6),
                GestureDetector(
                  onTap: () => setState(() => _whyExpanded = !_whyExpanded),
                  child: Text(
                    '💡 ${tr(widget.lang, 'why')}${_whyExpanded ? ': ${card.why}' : ''}',
                    style: const TextStyle(fontSize: 12, color: Colors.black54),
                  ),
                ),
              ],
              const SizedBox(height: 8),
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
                    decoration: BoxDecoration(
                      border: Border.all(color: Colors.black26),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text(card.source.name, style: const TextStyle(fontSize: 11)),
                  ),
                  if (card.source.distanceKm != null) ...[
                    const SizedBox(width: 6),
                    Text('· ${card.source.distanceKm} km away', style: const TextStyle(fontSize: 11, color: Colors.black54)),
                  ],
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
