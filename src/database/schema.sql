-- ============================================
-- ОСНОВНЫЕ ТАБЛИЦЫ
-- ============================================

-- Расширенная таблица профилей пользователей
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  full_name TEXT,
  bio TEXT, -- описание профиля
  avatar_url TEXT,
  website TEXT,
  social_links JSONB DEFAULT '{}', -- {twitter: "", instagram: ""}
  
  -- Статистика пользователя (денормализованная для скорости)
  total_projects INTEGER DEFAULT 0,
  total_views INTEGER DEFAULT 0,
  total_likes INTEGER DEFAULT 0,
  
  subscription_tier TEXT DEFAULT 'free',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Таблица жанров
CREATE TABLE public.genres (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#3B82F6', -- hex цвет для UI
  icon TEXT DEFAULT '📚', -- emoji или название иконки
  order_index INTEGER DEFAULT 0,
  project_count INTEGER DEFAULT 0, -- денормализованный счетчик
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Расширенная таблица проектов
CREATE TABLE public.projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  genre_id UUID REFERENCES public.genres(id),
  
  title TEXT NOT NULL,
  description TEXT,
  thumbnail_url TEXT,
  slug TEXT UNIQUE,
  
  -- Социальные метрики (денормализованные для производительности)
  view_count INTEGER DEFAULT 0,
  like_count INTEGER DEFAULT 0,
  comment_count INTEGER DEFAULT 0,
  
  -- Статусы
  is_published BOOLEAN DEFAULT false,
  is_public BOOLEAN DEFAULT false,
  is_featured BOOLEAN DEFAULT false, -- для главной страницы
  
  -- Метаданные
  estimated_reading_time INTEGER, -- в минутах
  tags TEXT[] DEFAULT '{}', -- массив тегов
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Версии проектов (без изменений)
CREATE TABLE public.project_versions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  version_number INTEGER NOT NULL,
  nodes JSONB NOT NULL,
  edges JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  created_by UUID REFERENCES auth.users(id)
);

-- Таблица изображений (без изменений)
CREATE TABLE public.images (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  file_path TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER,
  width INTEGER,
  height INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- ============================================
-- СОЦИАЛЬНЫЕ ФУНКЦИИ
-- ============================================

-- Таблица лайков
CREATE TABLE public.likes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  UNIQUE(project_id, user_id) -- один пользователь = один лайк на проект
);

-- Детальная таблица просмотров
CREATE TABLE public.views (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id), -- NULL для анонимных
  session_id TEXT,
  ip_address INET,
  referrer TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Таблица комментариев (опционально на будущее)
CREATE TABLE public.comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  parent_id UUID REFERENCES public.comments(id), -- для ответов
  content TEXT NOT NULL,
  is_edited BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Таблица подписок пользователей друг на друга
CREATE TABLE public.follows (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  follower_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  following_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  UNIQUE(follower_id, following_id)
);

-- ============================================
-- АНАЛИТИКА И МЕТРИКИ
-- ============================================

-- Расширенная таблица аналитики
CREATE TABLE public.analytics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  session_id TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  
  -- Детали прохождения
  path_taken JSONB NOT NULL,
  choices_made JSONB,
  completion_rate FLOAT,
  time_spent INTEGER, -- в секундах
  
  -- Контекст
  device_type TEXT, -- mobile, tablet, desktop
  browser TEXT,
  country TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Таблица хотспотов (без изменений)
CREATE TABLE public.hotspots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  edge_id TEXT NOT NULL,
  x_position FLOAT NOT NULL,
  y_position FLOAT NOT NULL,
  width FLOAT NOT NULL,
  height FLOAT NOT NULL,
  label TEXT,
  click_count INTEGER DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- ============================================
-- ИНДЕКСЫ ДЛЯ ПРОИЗВОДИТЕЛЬНОСТИ
-- ============================================

-- Основные индексы
CREATE INDEX idx_projects_user_id ON public.projects(user_id);
CREATE INDEX idx_projects_genre_id ON public.projects(genre_id);
CREATE INDEX idx_projects_slug ON public.projects(slug);
CREATE INDEX idx_projects_published ON public.projects(is_published, is_public);
CREATE INDEX idx_projects_featured ON public.projects(is_featured) WHERE is_featured = true;

-- Индексы для сортировки
CREATE INDEX idx_projects_view_count ON public.projects(view_count DESC);
CREATE INDEX idx_projects_like_count ON public.projects(like_count DESC);
CREATE INDEX idx_projects_created_at ON public.projects(created_at DESC);

-- Индексы для социальных функций
CREATE INDEX idx_likes_project_id ON public.likes(project_id);
CREATE INDEX idx_likes_user_id ON public.likes(user_id);
CREATE INDEX idx_views_project_id ON public.views(project_id);
CREATE INDEX idx_follows_follower ON public.follows(follower_id);
CREATE INDEX idx_follows_following ON public.follows(following_id);

-- Индексы для аналитики
CREATE INDEX idx_analytics_project_id ON public.analytics(project_id);
CREATE INDEX idx_analytics_created_at ON public.analytics(created_at DESC);
CREATE INDEX idx_images_project_id ON public.images(project_id);

-- ============================================
-- ФУНКЦИИ И ТРИГГЕРЫ
-- ============================================

-- Функция для инкремента просмотров с защитой от накрутки
CREATE OR REPLACE FUNCTION increment_view_count(
  p_project_id UUID,
  p_user_id UUID DEFAULT NULL,
  p_session_id TEXT DEFAULT NULL
)
RETURNS void AS $$
DECLARE
  v_last_view TIMESTAMP;
BEGIN
  -- Проверяем, не смотрел ли этот пользователь/сессия недавно
  IF p_user_id IS NOT NULL THEN
    SELECT created_at INTO v_last_view
    FROM views
    WHERE project_id = p_project_id 
      AND user_id = p_user_id
    ORDER BY created_at DESC
    LIMIT 1;
  ELSIF p_session_id IS NOT NULL THEN
    SELECT created_at INTO v_last_view
    FROM views
    WHERE project_id = p_project_id 
      AND session_id = p_session_id
    ORDER BY created_at DESC
    LIMIT 1;
  END IF;
  
  -- Считаем просмотр только если прошло больше часа
  IF v_last_view IS NULL OR (NOW() - v_last_view) > INTERVAL '1 hour' THEN
    -- Увеличиваем счетчик
    UPDATE projects 
    SET view_count = view_count + 1 
    WHERE id = p_project_id;
    
    -- Записываем детали просмотра
    INSERT INTO views (project_id, user_id, session_id) 
    VALUES (p_project_id, p_user_id, p_session_id);
    
    -- Обновляем статистику пользователя-автора
    UPDATE profiles 
    SET total_views = total_views + 1
    WHERE id = (SELECT user_id FROM projects WHERE id = p_project_id);
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Триггер для обновления счетчика лайков
CREATE OR REPLACE FUNCTION update_like_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Увеличиваем счетчик лайков проекта
    UPDATE projects 
    SET like_count = like_count + 1 
    WHERE id = NEW.project_id;
    
    -- Увеличиваем счетчик лайков автора
    UPDATE profiles 
    SET total_likes = total_likes + 1
    WHERE id = (SELECT user_id FROM projects WHERE id = NEW.project_id);
    
  ELSIF TG_OP = 'DELETE' THEN
    -- Уменьшаем счетчики
    UPDATE projects 
    SET like_count = like_count - 1 
    WHERE id = OLD.project_id;
    
    UPDATE profiles 
    SET total_likes = total_likes - 1
    WHERE id = (SELECT user_id FROM projects WHERE id = OLD.project_id);
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_project_likes
AFTER INSERT OR DELETE ON likes
FOR EACH ROW EXECUTE FUNCTION update_like_count();

-- Триггер для обновления счетчика проектов пользователя
CREATE OR REPLACE FUNCTION update_user_project_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE profiles 
    SET total_projects = total_projects + 1
    WHERE id = NEW.user_id;
    
    -- Также обновляем счетчик в жанре
    IF NEW.genre_id IS NOT NULL THEN
      UPDATE genres 
      SET project_count = project_count + 1
      WHERE id = NEW.genre_id;
    END IF;
    
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE profiles 
    SET total_projects = total_projects - 1
    WHERE id = OLD.user_id;
    
    IF OLD.genre_id IS NOT NULL THEN
      UPDATE genres 
      SET project_count = project_count - 1
      WHERE id = OLD.genre_id;
    END IF;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_projects
AFTER INSERT OR DELETE ON projects
FOR EACH ROW EXECUTE FUNCTION update_user_project_count();

-- ============================================
-- ВСТАВКА НАЧАЛЬНЫХ ДАННЫХ
-- ============================================

-- Добавление жанров по умолчанию
INSERT INTO public.genres (name, slug, description, color, icon, order_index) VALUES
  ('Романтика', 'romance', 'Истории о любви и отношениях', '#EC4899', '💕', 1),
  ('Приключения', 'adventure', 'Захватывающие путешествия и квесты', '#10B981', '🗺️', 2),
  ('Фэнтези', 'fantasy', 'Магические миры и волшебство', '#8B5CF6', '🔮', 3),
  ('Научная фантастика', 'sci-fi', 'Будущее и технологии', '#06B6D4', '🚀', 4),
  ('Детектив', 'mystery', 'Тайны и расследования', '#6B7280', '🔍', 5),
  ('Хоррор', 'horror', 'Страшные истории', '#DC2626', '👻', 6),
  ('Комедия', 'comedy', 'Смешные и легкие истории', '#F59E0B', '😄', 7),
  ('Драма', 'drama', 'Эмоциональные истории', '#3B82F6', '🎭', 8),
  ('Экшен', 'action', 'Динамичные сюжеты с боями', '#EF4444', '⚔️', 9),
  ('Повседневность', 'slice-of-life', 'Истории из жизни', '#84CC16', '☕', 10);

-- ============================================
-- ПРОВЕРКА УСТАНОВКИ
-- ============================================

-- Тест: проверка что все таблицы созданы
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;
