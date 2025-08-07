// Переводы жанров для локализации
export const genreTranslations: Record<string, { en: string; ru: string }> = {
  'Romance': {
    en: 'Romance',
    ru: 'Романтика'
  },
  'Fantasy': {
    en: 'Fantasy',
    ru: 'Фэнтези'
  },
  'Action': {
    en: 'Action',
    ru: 'Экшн'
  },
  'Drama': {
    en: 'Drama',
    ru: 'Драма'
  },
  'Comedy': {
    en: 'Comedy',
    ru: 'Комедия'
  },
  'Horror': {
    en: 'Horror',
    ru: 'Ужасы'
  },
  'Slice of Life': {
    en: 'Slice of Life',
    ru: 'Повседневность'
  },
  'Sci-Fi': {
    en: 'Sci-Fi',
    ru: 'Научная фантастика'
  },
  'Mystery': {
    en: 'Mystery',
    ru: 'Детектив'
  },
  'Sports': {
    en: 'Sports',
    ru: 'Спорт'
  }
};

// Функция для получения локализованного названия жанра
export function getLocalizedGenreName(genreName: string, language: 'en' | 'ru'): string {
  const translation = genreTranslations[genreName];
  if (!translation) {
    return genreName; // Возвращаем оригинальное название если перевод не найден
  }
  return translation[language];
}

// Функция для получения всех жанров на выбранном языке
export function getAllGenresLocalized(language: 'en' | 'ru'): Array<{ original: string; localized: string }> {
  return Object.keys(genreTranslations).map(genre => ({
    original: genre,
    localized: genreTranslations[genre][language]
  }));
}
