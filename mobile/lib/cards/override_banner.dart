import 'package:flutter/material.dart';
import '../models/home_response.dart';
import 'severity.dart';

// Pinned safety warning. Rendered ABOVE the ranked card list, always -
// personalization never suppresses or reorders these (plan section 6,
// "safety override, non-negotiable").
class OverrideBanner extends StatelessWidget {
  final CardOverride data;
  const OverrideBanner({super.key, required this.data});

  @override
  Widget build(BuildContext context) {
    final color = severityColor(data.severity);
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        border: Border.all(color: color, width: 1.5),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.warning_amber_rounded, color: color),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  data.title,
                  style: TextStyle(fontWeight: FontWeight.bold, color: color, fontSize: 15),
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Text(data.body),
          const SizedBox(height: 6),
          Text(
            data.source,
            style: const TextStyle(fontSize: 11, color: Colors.black54),
          ),
        ],
      ),
    );
  }
}
