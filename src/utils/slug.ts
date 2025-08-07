/**
 * Утилита для генерации URL-friendly slug из строки
 */

// Транслитерация кириллицы в латиницу
const cyrillicToLatin: Record<string, string> = {
  'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd',
  'е': 'e', 'ё': 'yo', 'ж': 'zh', 'з': 'z', 'и': 'i',
  'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm', 'н': 'n',
  'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't',
  'у': 'u', 'ф': 'f', 'х': 'h', 'ц': 'c', 'ч': 'ch',
  'ш': 'sh', 'щ': 'sch', 'ъ': '', 'ы': 'y', 'ь': '',
  'э': 'e', 'ю': 'yu', 'я': 'ya',
  'А': 'A', 'Б': 'B', 'В': 'V', 'Г': 'G', 'Д': 'D',
  'Е': 'E', 'Ё': 'Yo', 'Ж': 'Zh', 'З': 'Z', 'И': 'I',
  'Й': 'Y', 'К': 'K', 'Л': 'L', 'М': 'M', 'Н': 'N',
  'О': 'O', 'П': 'P', 'Р': 'R', 'С': 'S', 'Т': 'T',
  'У': 'U', 'Ф': 'F', 'Х': 'H', 'Ц': 'C', 'Ч': 'Ch',
  'Ш': 'Sh', 'Щ': 'Sch', 'Ъ': '', 'Ы': 'Y', 'Ь': '',
  'Э': 'E', 'Ю': 'Yu', 'Я': 'Ya'
};

// Транслитерация украинских букв
const ukrainianToLatin: Record<string, string> = {
  'і': 'i', 'І': 'I',
  'ї': 'yi', 'Ї': 'Yi',
  'є': 'ye', 'Є': 'Ye',
  'ґ': 'g', 'Ґ': 'G'
};

/**
 * Транслитерация строки из кириллицы в латиницу
 */
function transliterate(str: string): string {
  const translitMap = { ...cyrillicToLatin, ...ukrainianToLatin };
  
  return str.split('').map(char => {
    return translitMap[char] || char;
  }).join('');
}

/**
 * Генерация slug из строки
 * @param text - исходный текст
 * @param options - опции генерации
 * @returns URL-friendly строка
 */
export function generateSlug(
  text: string | undefined | null,
  options: {
    transliterate?: boolean;
    maxLength?: number;
  } = {}
): string {
  const { transliterate: shouldTransliterate = true, maxLength = 50 } = options;

  if (!text) {
    return `project-${Date.now()}`;
  }

  let slug = text;

  // Транслитерация если нужно
  if (shouldTransliterate) {
    slug = transliterate(slug);
  }

  // Преобразование в нижний регистр
  slug = slug.toLowerCase();

  // Замена пробелов и специальных символов на дефисы
  slug = slug
    .replace(/[^\w\s-]/g, '') // Удаляем все кроме букв, цифр, пробелов и дефисов
    .replace(/\s+/g, '-') // Заменяем пробелы на дефисы
    .replace(/-+/g, '-') // Заменяем множественные дефисы на один
    .replace(/^-+/, '') // Удаляем дефисы в начале
    .replace(/-+$/, ''); // Удаляем дефисы в конце

  // Обрезка до максимальной длины
  if (slug.length > maxLength) {
    slug = slug.substring(0, maxLength).replace(/-+$/, '');
  }

  // Если slug пустой, генерируем на основе timestamp
  if (!slug) {
    slug = `project-${Date.now()}`;
  }

  return slug;
}

/**
 * Генерация уникального slug с добавлением числа при необходимости
 * @param baseSlug - базовый slug
 * @param existingSlugs - массив существующих slug для проверки уникальности
 * @returns уникальный slug
 */
export function generateUniqueSlug(
  baseSlug: string,
  existingSlugs: string[]
): string {
  let slug = baseSlug;
  let counter = 1;

  while (existingSlugs.includes(slug)) {
    slug = `${baseSlug}-${counter}`;
    counter++;
  }

  return slug;
}

/**
 * Генерация ID сессии для анонимных пользователей
 */
export function generateSessionId(): string {
  return `session-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
}
