-- ============================================
-- ВСТАВКА НАЧАЛЬНЫХ ЖАНРОВ
-- ============================================

-- Добавляем популярные жанры для вебтунов
INSERT INTO genres (name, description) VALUES
  ('Romance', 'Romantic stories and relationships'),
  ('Fantasy', 'Magical worlds and supernatural elements'),
  ('Action', 'Dynamic battles and adventures'),
  ('Drama', 'Emotional and realistic stories'),
  ('Comedy', 'Humorous and funny content'),
  ('Horror', 'Scary and thrilling stories'),
  ('Slice of Life', 'Everyday life experiences'),
  ('Sci-Fi', 'Science fiction and futuristic themes'),
  ('Mystery', 'Detective stories and puzzles'),
  ('Sports', 'Athletic competitions and team spirit')
ON CONFLICT (name) DO NOTHING;

-- Для поддержки локализации можно будет создать отдельную таблицу genre_translations
-- CREATE TABLE genre_translations (
--   id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
--   genre_id UUID REFERENCES genres(id) ON DELETE CASCADE,
--   language VARCHAR(2) NOT NULL, -- 'en', 'ru'
--   name VARCHAR(100) NOT NULL,
--   description TEXT,
--   UNIQUE(genre_id, language)
-- );
