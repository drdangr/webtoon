// Карта переводов по стабильному ключу slug
const GENRE_I18N: Record<string, { en: string; ru: string; uk: string }> = {
  'romance': { en: 'Romance', ru: 'Романтика', uk: 'Романтика' },
  'fantasy': { en: 'Fantasy', ru: 'Фэнтези', uk: 'Фентезі' },
  'action': { en: 'Action', ru: 'Экшн', uk: 'Екшн' },
  'drama': { en: 'Drama', ru: 'Драма', uk: 'Драма' },
  'comedy': { en: 'Comedy', ru: 'Комедия', uk: 'Комедія' },
  'horror': { en: 'Horror', ru: 'Ужасы', uk: 'Жахи' },
  'slice-of-life': { en: 'Slice of Life', ru: 'Повседневность', uk: 'Повсякденність' },
  'sci-fi': { en: 'Sci-Fi', ru: 'Научная фантастика', uk: 'Наукова фантастика' },
  'mystery': { en: 'Mystery', ru: 'Детектив', uk: 'Детектив' },
  'sports': { en: 'Sports', ru: 'Спорт', uk: 'Спорт' },
};

// Популярные синонимы (имя → slug)
const NAME_TO_SLUG: Record<string, string> = {
  // EN
  'romance': 'romance',
  'fantasy': 'fantasy',
  'action': 'action',
  'drama': 'drama',
  'comedy': 'comedy',
  'horror': 'horror',
  'slice of life': 'slice-of-life',
  'slice-of-life': 'slice-of-life',
  'sci-fi': 'sci-fi',
  'sci fi': 'sci-fi',
  'mystery': 'mystery',
  'sports': 'sports',
  // RU
  'романтика': 'romance',
  'фэнтези': 'fantasy',
  'экшн': 'action',
  'драма': 'drama',
  'комедия': 'comedy',
  'ужасы': 'horror',
  'повседневность': 'slice-of-life',
  'научная фантастика': 'sci-fi',
  'детектив': 'mystery',
  'спорт': 'sports',
  // UK
  'фентезі': 'fantasy',
  'єкшн': 'action',
  'екшн': 'action',
  'жахи': 'horror',
  'повсякденність': 'slice-of-life',
  'наукова фантастика': 'sci-fi',
};

function toSlug(key: string): string {
  if (!key) return key;
  const low = key.toLowerCase();
  if (NAME_TO_SLUG[low]) return NAME_TO_SLUG[low];
  // на случай, если приходит slug
  if (GENRE_I18N[low]) return low;
  // простая нормализация
  return low.replace(/\s+/g, '-');
}

export function getLocalizedGenreName(key: string, language: 'en' | 'ru' | 'uk'): string {
  const slug = toSlug(key);
  const i18n = GENRE_I18N[slug];
  if (!i18n) return key;
  return i18n[language];
}

export function getAllGenresLocalized(language: 'en' | 'ru' | 'uk'): Array<{ slug: string; localized: string }> {
  return Object.keys(GENRE_I18N).map(slug => ({ slug, localized: GENRE_I18N[slug][language] }));
}
