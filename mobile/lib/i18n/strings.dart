// Minimal chrome translation, same approach as web/index.html: verdicts
// render as the backend sends them (English) and only the app chrome is
// translated locally. Plan section 7 names Bhashini (ULCA) as the real
// integration for 22 scheduled languages with a Flutter SDK; this map is a
// stand-in so the language-switch demo beat works without that dependency.
enum AppLanguage { en, hi }

const Map<AppLanguage, Map<String, String>> kStrings = {
  AppLanguage.en: {
    'title': 'Mausam Home',
    'why': 'Why',
    'modelled': 'Modelled - estimated, not observed',
    'lastUpdated': 'Last updated',
    'minAgo': 'min ago',
    'cached': 'cached',
    'offlineBanner': 'Offline - showing cached data.',
    'refresh': 'Refresh',
    'account': 'Account',
    'scenario': 'Scenario',
    'noData': 'No data available (offline, no cache yet).',
  },
  AppLanguage.hi: {
    'title': 'मौसम होम',
    'why': 'क्यों',
    'modelled': 'अनुमानित - मापा नहीं गया',
    'lastUpdated': 'अंतिम बार अपडेट किया गया',
    'minAgo': 'मिनट पहले',
    'cached': 'संचित',
    'offlineBanner': 'ऑफ़लाइन - संचित डेटा दिखाया जा रहा है।',
    'refresh': 'ताज़ा करें',
    'account': 'खाता',
    'scenario': 'परिदृश्य',
    'noData': 'कोई डेटा उपलब्ध नहीं (ऑफ़लाइन, कोई संचित डेटा नहीं)।',
  },
};

String tr(AppLanguage lang, String key) => kStrings[lang]?[key] ?? kStrings[AppLanguage.en]![key]!;
