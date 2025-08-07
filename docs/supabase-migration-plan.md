# 📋 План миграции Webtoon Graph Editor на Supabase с социальными функциями

## 🎯 Текущий статус:
- ✅ Проект **interactive webtoon** создан в Supabase
- ✅ Авторизация через GitHub настроена
- ⏳ Ожидает: создание таблиц с расширенным функционалом

## 🚀 Quick Start - Что делать прямо сейчас:

1. **Скопируйте API ключи** из Dashboard → Settings → API:
   - Project URL: `https://ennbxoy1oehzntqzxqvu.supabase.co`
   - Anon Key: скопируйте и сохраните в `.env.local`

2. **Создайте расширенную схему БД** (включает социальные функции):
   - Откройте **SQL Editor** (слева в меню)
   - Скопируйте SQL из **Фазы 1.2** ниже
   - Нажмите **Run**

3. **Установите npm пакеты**:
   ```bash
   npm install @supabase/supabase-js @supabase/auth-ui-react react-query
   ```

---

## 📅 Обновленная временная оценка: 4-5 недель
- **Базовая миграция**: 2 недели
- **Социальные функции**: 1 неделя
- **Профили и лидерборды**: 1 неделя
- **Оптимизация и тестирование**: 1 неделя

---

## Фаза 0: Подготовка ✅ (Выполнено!)

### ✅ Уже сделано:
- [x] Проект создан в Supabase: **interactive webtoon**
- [x] Авторизация через GitHub: **drdangr**
- [x] Код проекта в Git репозитории

### 📋 Осталось подготовить:
- [ ] Определить структуру URL:
  - Галерея: `/gallery`
  - Просмотр комикса: `/view/[slug]`
  - Профиль пользователя: `/user/[username]`
  - Жанр: `/genre/[genre-slug]`

### 🛠 Необходимые инструменты
```bash
# Основные пакеты
npm install @supabase/supabase-js
npm install @supabase/auth-ui-react @supabase/auth-ui-shared
npm install react-query # для кеширования запросов
npm install zustand # для глобального стейта

# UI компоненты для социальных функций
npm install react-hot-toast # уведомления
npm install framer-motion # анимации лайков
```

---

## Фаза 1: Настройка Supabase с расширенной схемой

### 1.1 Настройка проекта ✅

Проект **interactive webtoon** уже создан! Теперь нужно:

1. Скопировать credentials из Dashboard:
```env
# .env.local
VITE_SUPABASE_URL=https://ennbxoy1oehzntqzxqvu.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc....[ваш anon key из Settings -> API]
```

2. Настроить Authentication providers:
   - GitHub уже подключен ✅
   - Рекомендую включить: Email/Password, Google
   - Настроить Redirect URLs для продакшена

### 1.2 Создание расширенной схемы БД

**Выполните в SQL Editor следующие команды:**

```sql
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

-- Должны увидеть все таблицы:
-- analytics, comments, follows, genres, hotspots, images, likes, 
-- profiles, project_versions, projects, views
```

### 1.3 Настройка Row Level Security (RLS)

**После создания таблиц, выполните эти команды для защиты данных:**

```sql
-- Включить RLS для всех таблиц
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.genres ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hotspots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics ENABLE ROW LEVEL SECURITY;

-- ============================================
-- ПОЛИТИКИ ДЛЯ PROFILES
-- ============================================

CREATE POLICY "Public profiles are viewable by everyone" 
  ON public.profiles FOR SELECT 
  USING (true);

CREATE POLICY "Users can update own profile" 
  ON public.profiles FOR UPDATE 
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" 
  ON public.profiles FOR INSERT 
  WITH CHECK (auth.uid() = id);

-- ============================================
-- ПОЛИТИКИ ДЛЯ PROJECTS
-- ============================================

CREATE POLICY "Published projects are viewable by everyone" 
  ON public.projects FOR SELECT 
  USING (
    is_public = true 
    OR auth.uid() = user_id
  );

CREATE POLICY "Users can create own projects" 
  ON public.projects FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own projects" 
  ON public.projects FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own projects" 
  ON public.projects FOR DELETE 
  USING (auth.uid() = user_id);

-- ============================================
-- ПОЛИТИКИ ДЛЯ СОЦИАЛЬНЫХ ФУНКЦИЙ
-- ============================================

-- Genres - всем можно читать
CREATE POLICY "Genres are viewable by everyone" 
  ON public.genres FOR SELECT 
  USING (true);

-- Likes - пользователи управляют своими лайками
CREATE POLICY "Users can manage own likes" 
  ON public.likes FOR ALL 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Everyone can view likes" 
  ON public.likes FOR SELECT 
  USING (true);

-- Views - любой может добавлять просмотры
CREATE POLICY "Anyone can insert views" 
  ON public.views FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "View stats are public" 
  ON public.views FOR SELECT 
  USING (true);

-- Comments - пользователи управляют своими комментариями
CREATE POLICY "Comments are viewable by everyone" 
  ON public.comments FOR SELECT 
  USING (true);

CREATE POLICY "Users can create comments" 
  ON public.comments FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own comments" 
  ON public.comments FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own comments" 
  ON public.comments FOR DELETE 
  USING (auth.uid() = user_id);

-- Follows - пользователи управляют своими подписками
CREATE POLICY "Users can manage own follows" 
  ON public.follows FOR ALL 
  USING (auth.uid() = follower_id)
  WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Everyone can view follows" 
  ON public.follows FOR SELECT 
  USING (true);

-- ============================================
-- ПОЛИТИКИ ДЛЯ ОСТАЛЬНЫХ ТАБЛИЦ
-- ============================================

-- Images - управление через проекты
CREATE POLICY "Users can manage images in own projects" 
  ON public.images FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM public.projects 
      WHERE projects.id = images.project_id 
      AND projects.user_id = auth.uid()
    )
  );

-- Analytics - любой может добавлять
CREATE POLICY "Anyone can insert analytics" 
  ON public.analytics FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "Users can view analytics for own projects" 
  ON public.analytics FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.projects 
      WHERE projects.id = analytics.project_id 
      AND projects.user_id = auth.uid()
    )
  );

-- Project versions - управление через проекты
CREATE POLICY "Users can manage versions of own projects" 
  ON public.project_versions FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM public.projects 
      WHERE projects.id = project_versions.project_id 
      AND projects.user_id = auth.uid()
    )
  );
```

### 1.4 Настройка Storage для изображений

**В разделе Storage** создайте buckets:

1. **Для изображений проектов:**
   - Название: `project-images`
   - Public bucket: ✅

2. **Для аватаров пользователей:**
   - Название: `avatars`
   - Public bucket: ✅

3. **Для превью проектов:**
   - Название: `thumbnails`
   - Public bucket: ✅

Затем выполните в **SQL Editor** политики для Storage:

```sql
-- Политики для project-images
CREATE POLICY "Users can upload project images" 
  ON storage.objects FOR INSERT 
  WITH CHECK (
    bucket_id = 'project-images' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update own project images" 
  ON storage.objects FOR UPDATE 
  USING (
    bucket_id = 'project-images' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete own project images" 
  ON storage.objects FOR DELETE 
  USING (
    bucket_id = 'project-images' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Public can view project images" 
  ON storage.objects FOR SELECT 
  USING (bucket_id = 'project-images');

-- Политики для avatars
CREATE POLICY "Users can upload own avatar" 
  ON storage.objects FOR INSERT 
  WITH CHECK (
    bucket_id = 'avatars' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update own avatar" 
  ON storage.objects FOR UPDATE 
  USING (
    bucket_id = 'avatars' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Public can view avatars" 
  ON storage.objects FOR SELECT 
  USING (bucket_id = 'avatars');

-- Политики для thumbnails
CREATE POLICY "Users can manage own thumbnails" 
  ON storage.objects FOR ALL
  USING (
    bucket_id = 'thumbnails' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  )
  WITH CHECK (
    bucket_id = 'thumbnails' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Public can view thumbnails" 
  ON storage.objects FOR SELECT 
  USING (bucket_id = 'thumbnails');
```

---

## Фаза 2: Создание API слоя с социальными функциями

### 2.1 Инициализация Supabase клиента и типов

```typescript
// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

// Для проекта interactive webtoon
const supabaseUrl = 'https://ennbxoy1oehzntqzxqvu.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
  }
});

// Расширенные типы для TypeScript
export interface Profile {
  id: string;
  username: string;
  full_name?: string;
  bio?: string;
  avatar_url?: string;
  website?: string;
  social_links?: {
    twitter?: string;
    instagram?: string;
    github?: string;
  };
  total_projects: number;
  total_views: number;
  total_likes: number;
  subscription_tier: 'free' | 'pro' | 'business';
  created_at: string;
  updated_at: string;
}

export interface Genre {
  id: string;
  name: string;
  slug: string;
  description?: string;
  color: string;
  icon: string;
  order_index: number;
  project_count: number;
}

export interface Project {
  id: string;
  user_id: string;
  genre_id?: string;
  genre?: Genre; // для JOIN запросов
  author?: Profile; // для JOIN запросов
  
  title: string;
  description?: string;
  thumbnail_url?: string;
  slug?: string;
  
  view_count: number;
  like_count: number;
  comment_count: number;
  
  is_published: boolean;
  is_public: boolean;
  is_featured: boolean;
  
  estimated_reading_time?: number;
  tags: string[];
  
  created_at: string;
  updated_at: string;
  
  // Добавляется при запросе
  is_liked?: boolean; // лайкнул ли текущий пользователь
}

export interface Like {
  id: string;
  project_id: string;
  user_id: string;
  created_at: string;
}

export interface View {
  id: string;
  project_id: string;
  user_id?: string;
  session_id?: string;
  created_at: string;
}

export interface Comment {
  id: string;
  project_id: string;
  user_id: string;
  parent_id?: string;
  content: string;
  is_edited: boolean;
  created_at: string;
  updated_at: string;
  author?: Profile; // для JOIN запросов
}

export interface Follow {
  id: string;
  follower_id: string;
  following_id: string;
  created_at: string;
}
```

### 2.2 Auth сервис с профилями

```typescript
// src/services/auth.service.ts
import { supabase } from '@/lib/supabase';

export const authService = {
  async signUp(email: string, password: string, username: string) {
    // Проверяем уникальность username
    const { data: existingUser } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', username)
      .single();
    
    if (existingUser) {
      throw new Error('Это имя пользователя уже занято');
    }

    // Создаем пользователя
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username, // сохраняем в метаданных
        }
      }
    });

    if (authError) throw authError;

    // Создаем профиль
    if (authData.user) {
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: authData.user.id,
          username,
          full_name: username,
          avatar_url: `https://ui-avatars.com/api/?name=${username}&background=random`,
        });

      if (profileError) throw profileError;
    }

    return authData;
  },

  async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
    return data;
  },

  async signInWithGitHub() {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`
      }
    });

    if (error) throw error;
    return data;
  },

  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  async getCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  },

  async getProfile(userId: string) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) throw error;
    return data;
  },

  async updateProfile(userId: string, updates: Partial<Profile>) {
    const { data, error } = await supabase
      .from('profiles')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },
};
```

### 2.3 Projects сервис с социальными функциями

```typescript
// src/services/projects.service.ts
import { supabase } from '@/lib/supabase';
import { generateSlug } from '@/utils/slug';

export const projectsService = {
  async getProjects({
    userId,
    genreId,
    sortBy = 'created_at',
    isPublic = true,
    limit = 20,
    offset = 0,
  }: {
    userId?: string;
    genreId?: string;
    sortBy?: 'created_at' | 'view_count' | 'like_count';
    isPublic?: boolean;
    limit?: number;
    offset?: number;
  }) {
    let query = supabase
      .from('projects')
      .select(`
        *,
        author:profiles!projects_user_id_fkey (
          id, username, avatar_url
        ),
        genre:genres (
          id, name, slug, color, icon
        ),
        is_liked:likes!left (
          id
        )
      `, { count: 'exact' });

    // Фильтры
    if (userId) {
      query = query.eq('user_id', userId);
    }
    if (genreId) {
      query = query.eq('genre_id', genreId);
    }
    if (isPublic) {
      query = query.eq('is_public', true).eq('is_published', true);
    }

    // Сортировка
    const sortColumn = sortBy === 'created_at' ? 'created_at' : sortBy;
    query = query.order(sortColumn, { ascending: false });

    // Пагинация
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) throw error;

    // Форматируем is_liked
    const projects = data?.map(project => ({
      ...project,
      is_liked: project.is_liked?.length > 0,
    }));

    return { projects, total: count };
  },

  async getFeaturedProjects() {
    const { data, error } = await supabase
      .from('projects')
      .select(`
        *,
        author:profiles!projects_user_id_fkey (
          id, username, avatar_url
        ),
        genre:genres (
          id, name, slug, color, icon
        )
      `)
      .eq('is_featured', true)
      .eq('is_public', true)
      .eq('is_published', true)
      .order('updated_at', { ascending: false })
      .limit(6);

    if (error) throw error;
    return data;
  },

  async getProjectBySlug(slug: string) {
    const { data, error } = await supabase
      .from('projects')
      .select(`
        *,
        author:profiles!projects_user_id_fkey (
          id, username, avatar_url, bio
        ),
        genre:genres (
          id, name, slug, color, icon
        ),
        project_versions (
          nodes, edges, version_number
        )
      `)
      .eq('slug', slug)
      .single();

    if (error) throw error;

    // Получаем последнюю версию
    const latestVersion = data.project_versions
      ?.sort((a, b) => b.version_number - a.version_number)[0];

    // Проверяем, лайкнул ли текущий пользователь
    const user = await authService.getCurrentUser();
    let isLiked = false;
    
    if (user) {
      const { data: like } = await supabase
        .from('likes')
        .select('id')
        .eq('project_id', data.id)
        .eq('user_id', user.id)
        .single();
      
      isLiked = !!like;
    }

    return {
      ...data,
      nodes: latestVersion?.nodes || {},
      edges: latestVersion?.edges || [],
      is_liked: isLiked,
    };
  },

  async createProject(project: Partial<Project>) {
    const user = await authService.getCurrentUser();
    if (!user) throw new Error('Not authenticated');

    const slug = generateSlug(project.title);

    // Создаем проект
    const { data: projectData, error: projectError } = await supabase
      .from('projects')
      .insert({
        ...project,
        user_id: user.id,
        slug,
      })
      .select()
      .single();

    if (projectError) throw projectError;

    // Создаем первую версию
    const { error: versionError } = await supabase
      .from('project_versions')
      .insert({
        project_id: projectData.id,
        version_number: 1,
        nodes: project.nodes || {},
        edges: project.edges || [],
        created_by: user.id,
      });

    if (versionError) throw versionError;

    return projectData;
  },

  async toggleLike(projectId: string) {
    const user = await authService.getCurrentUser();
    if (!user) throw new Error('Not authenticated');

    // Проверяем, есть ли уже лайк
    const { data: existingLike } = await supabase
      .from('likes')
      .select('id')
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .single();

    if (existingLike) {
      // Удаляем лайк
      const { error } = await supabase
        .from('likes')
        .delete()
        .eq('id', existingLike.id);
      
      if (error) throw error;
      return { liked: false };
    } else {
      // Добавляем лайк
      const { error } = await supabase
        .from('likes')
        .insert({
          project_id: projectId,
          user_id: user.id,
        });
      
      if (error) throw error;
      return { liked: true };
    }
  },

  async incrementViewCount(projectId: string) {
    const user = await authService.getCurrentUser();
    const sessionId = localStorage.getItem('session_id') || generateSessionId();
    
    // Сохраняем session_id для анонимных пользователей
    if (!localStorage.getItem('session_id')) {
      localStorage.setItem('session_id', sessionId);
    }

    const { error } = await supabase.rpc('increment_view_count', {
      p_project_id: projectId,
      p_user_id: user?.id || null,
      p_session_id: sessionId,
    });

    if (error) throw error;
  },
};
```

### 2.4 Социальные сервисы

```typescript
// src/services/social.service.ts
import { supabase } from '@/lib/supabase';

export const socialService = {
  // Жанры
  async getGenres() {
    const { data, error } = await supabase
      .from('genres')
      .select('*')
      .order('order_index');

    if (error) throw error;
    return data;
  },

  async getGenreBySlug(slug: string) {
    const { data, error } = await supabase
      .from('genres')
      .select('*')
      .eq('slug', slug)
      .single();

    if (error) throw error;
    return data;
  },

  // Профили пользователей
  async getUserProfile(username: string) {
    const { data, error } = await supabase
      .from('profiles')
      .select(`
        *,
        projects:projects!projects_user_id_fkey (
          id, title, slug, thumbnail_url, 
          view_count, like_count, created_at,
          genre:genres (name, color, icon)
        ),
        followers:follows!follows_following_id_fkey (count),
        following:follows!follows_follower_id_fkey (count)
      `)
      .eq('username', username)
      .single();

    if (error) throw error;

    // Форматируем данные
    return {
      ...data,
      follower_count: data.followers?.[0]?.count || 0,
      following_count: data.following?.[0]?.count || 0,
    };
  },

  // Подписки
  async toggleFollow(targetUserId: string) {
    const user = await authService.getCurrentUser();
    if (!user) throw new Error('Not authenticated');

    // Проверяем, подписан ли уже
    const { data: existingFollow } = await supabase
      .from('follows')
      .select('id')
      .eq('follower_id', user.id)
      .eq('following_id', targetUserId)
      .single();

    if (existingFollow) {
      // Отписываемся
      const { error } = await supabase
        .from('follows')
        .delete()
        .eq('id', existingFollow.id);
      
      if (error) throw error;
      return { following: false };
    } else {
      // Подписываемся
      const { error } = await supabase
        .from('follows')
        .insert({
          follower_id: user.id,
          following_id: targetUserId,
        });
      
      if (error) throw error;
      return { following: true };
    }
  },

  // Лидерборд
  async getLeaderboard(period: 'week' | 'month' | 'all' = 'all') {
    let dateFilter = new Date();
    
    switch (period) {
      case 'week':
        dateFilter.setDate(dateFilter.getDate() - 7);
        break;
      case 'month':
        dateFilter.setMonth(dateFilter.getMonth() - 1);
        break;
    }

    const { data, error } = await supabase
      .from('profiles')
      .select(`
        id, username, avatar_url,
        total_projects, total_views, total_likes
      `)
      .order('total_likes', { ascending: false })
      .limit(10);

    if (error) throw error;
    return data;
  },

  // Комментарии
  async getComments(projectId: string) {
    const { data, error } = await supabase
      .from('comments')
      .select(`
        *,
        author:profiles!comments_user_id_fkey (
          id, username, avatar_url
        )
      `)
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  async addComment(projectId: string, content: string, parentId?: string) {
    const user = await authService.getCurrentUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('comments')
      .insert({
        project_id: projectId,
        user_id: user.id,
        parent_id: parentId,
        content,
      })
      .select(`
        *,
        author:profiles!comments_user_id_fkey (
          id, username, avatar_url
        )
      `)
      .single();

    if (error) throw error;

    // Увеличиваем счетчик комментариев
    await supabase
      .from('projects')
      .update({ comment_count: supabase.raw('comment_count + 1') })
      .eq('id', projectId);

    return data;
  },
};
```

### 2.5 Real-time подписки

```typescript
// src/services/realtime.service.ts
import { supabase } from '@/lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

export class RealtimeService {
  private channels: Map<string, RealtimeChannel> = new Map();

  // Подписка на лайки проекта
  subscribeToPro
Likes(
    projectId: string,
    callback: (payload: any) => void
  ) {
    const channelName = `likes:${projectId}`;
    
    if (this.channels.has(channelName)) {
      return this.channels.get(channelName);
    }

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'likes',
          filter: `project_id=eq.${projectId}`
        },
        callback
      )
      .subscribe();

    this.channels.set(channelName, channel);
    return channel;
  }

  // Подписка на комментарии
  subscribeToComments(
    projectId: string,
    callback: (payload: any) => void
  ) {
    const channelName = `comments:${projectId}`;
    
    if (this.channels.has(channelName)) {
      return this.channels.get(channelName);
    }

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'comments',
          filter: `project_id=eq.${projectId}`
        },
        callback
      )
      .subscribe();

    this.channels.set(channelName, channel);
    return channel;
  }

  // Подписка на обновления профиля
  subscribeToProfile(
    userId: string,
    callback: (payload: any) => void
  ) {
    const channelName = `profile:${userId}`;
    
    if (this.channels.has(channelName)) {
      return this.channels.get(channelName);
    }

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${userId}`
        },
        callback
      )
      .subscribe();

    this.channels.set(channelName, channel);
    return channel;
  }

  // Отписка от канала
  unsubscribe(channelName: string) {
    const channel = this.channels.get(channelName);
    if (channel) {
      supabase.removeChannel(channel);
      this.channels.delete(channelName);
    }
  }

  // Отписка от всех каналов
  unsubscribeAll() {
    this.channels.forEach(channel => {
      supabase.removeChannel(channel);
    });
    this.channels.clear();
  }
}

export const realtimeService = new RealtimeService();
```

---

## Фаза 3: Компоненты UI для социальных функций

### 3.1 Компонент галереи с фильтрами

```typescript
// src/components/Gallery.tsx
import { useState, useEffect } from 'react';
import { projectsService, socialService } from '@/services';
import { Heart, Eye, Clock, TrendingUp } from 'lucide-react';

export function Gallery() {
  const [projects, setProjects] = useState([]);
  const [genres, setGenres] = useState([]);
  const [filters, setFilters] = useState({
    genreId: null,
    sortBy: 'created_at',
    period: 'all',
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [filters]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Загружаем жанры один раз
      if (genres.length === 0) {
        const genresData = await socialService.getGenres();
        setGenres(genresData);
      }

      // Загружаем проекты с фильтрами
      const { projects: projectsData } = await projectsService.getProjects({
        genreId: filters.genreId,
        sortBy: filters.sortBy,
        isPublic: true,
      });
      
      setProjects(projectsData);
    } catch (error) {
      console.error('Error loading gallery:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async (projectId: string, index: number) => {
    try {
      const { liked } = await projectsService.toggleLike(projectId);
      
      // Обновляем UI оптимистично
      const newProjects = [...projects];
      newProjects[index].is_liked = liked;
      newProjects[index].like_count += liked ? 1 : -1;
      setProjects(newProjects);
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Фильтры */}
      <div className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          {/* Жанры */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            <button
              onClick={() => setFilters(f => ({ ...f, genreId: null }))}
              className={`px-4 py-2 rounded-full whitespace-nowrap ${
                !filters.genreId 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100 hover:bg-gray-200'
              }`}
            >
              Все жанры
            </button>
            {genres.map(genre => (
              <button
                key={genre.id}
                onClick={() => setFilters(f => ({ ...f, genreId: genre.id }))}
                className={`px-4 py-2 rounded-full whitespace-nowrap flex items-center gap-1 ${
                  filters.genreId === genre.id
                    ? 'text-white'
                    : 'bg-gray-100 hover:bg-gray-200'
                }`}
                style={{
                  backgroundColor: filters.genreId === genre.id ? genre.color : '',
                }}
              >
                <span>{genre.icon}</span>
                <span>{genre.name}</span>
              </button>
            ))}
          </div>

          {/* Сортировка */}
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => setFilters(f => ({ ...f, sortBy: 'created_at' }))}
              className={`px-3 py-1 rounded text-sm ${
                filters.sortBy === 'created_at'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Clock size={14} className="inline mr-1" />
              Новые
            </button>
            <button
              onClick={() => setFilters(f => ({ ...f, sortBy: 'view_count' }))}
              className={`px-3 py-1 rounded text-sm ${
                filters.sortBy === 'view_count'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Eye size={14} className="inline mr-1" />
              Популярные
            </button>
            <button
              onClick={() => setFilters(f => ({ ...f, sortBy: 'like_count' }))}
              className={`px-3 py-1 rounded text-sm ${
                filters.sortBy === 'like_count'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <TrendingUp size={14} className="inline mr-1" />
              Топ
            </button>
          </div>
        </div>
      </div>

      {/* Сетка проектов */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg shadow-md animate-pulse">
                <div className="w-full h-48 bg-gray-200" />
                <div className="p-4">
                  <div className="h-4 bg-gray-200 rounded mb-2" />
                  <div className="h-3 bg-gray-200 rounded w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {projects.map((project, index) => (
              <ProjectCard
                key={project.id}
                project={project}
                onLike={() => handleLike(project.id, index)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ProjectCard({ project, onLike }) {
  return (
    <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow">
      {/* Превью */}
      <div className="relative">
        <img
          src={project.thumbnail_url || '/placeholder.jpg'}
          alt={project.title}
          className="w-full h-48 object-cover rounded-t-lg"
        />
        {project.genre && (
          <div
            className="absolute top-2 left-2 px-2 py-1 rounded text-white text-xs font-medium"
            style={{ backgroundColor: project.genre.color }}
          >
            {project.genre.icon} {project.genre.name}
          </div>
        )}
      </div>

      {/* Информация */}
      <div className="p-4">
        <h3 className="font-semibold text-gray-800 mb-1 truncate">
          {project.title}
        </h3>
        <p className="text-sm text-gray-600 mb-2 line-clamp-2">
          {project.description}
        </p>

        {/* Автор */}
        <div className="flex items-center gap-2 mb-3">
          <img
            src={project.author?.avatar_url}
            alt={project.author?.username}
            className="w-6 h-6 rounded-full"
          />
          <span className="text-sm text-gray-600">
            {project.author?.username}
          </span>
        </div>

        {/* Метрики */}
        <div className="flex items-center justify-between">
          <div className="flex gap-3 text-sm text-gray-500">
            <span className="flex items-center gap-1">
              <Eye size={14} />
              {project.view_count}
            </span>
            <button
              onClick={onLike}
              className={`flex items-center gap-1 hover:text-red-500 transition-colors ${
                project.is_liked ? 'text-red-500' : ''
              }`}
            >
              <Heart size={14} fill={project.is_liked ? 'currentColor' : 'none'} />
              {project.like_count}
            </button>
          </div>
          
          <a
            href={`/view/${project.slug}`}
            className="text-sm text-blue-600 hover:text-blue-700"
          >
            Читать →
          </a>
        </div>
      </div>
    </div>
  );
}
```

### 3.2 Компонент профиля пользователя

```typescript
// src/components/UserProfile.tsx
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { socialService } from '@/services';
import { Heart, Eye, BookOpen, Users } from 'lucide-react';

export function UserProfile() {
  const { username } = useParams();
  const [profile, setProfile] = useState(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [activeTab, setActiveTab] = useState('projects');

  useEffect(() => {
    loadProfile();
  }, [username]);

  const loadProfile = async () => {
    try {
      const data = await socialService.getUserProfile(username);
      setProfile(data);
      
      // Проверяем, подписан ли текущий пользователь
      // TODO: реализовать проверку
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  };

  const handleFollow = async () => {
    try {
      const { following } = await socialService.toggleFollow(profile.id);
      setIsFollowing(following);
      
      // Обновляем счетчик
      setProfile(prev => ({
        ...prev,
        follower_count: prev.follower_count + (following ? 1 : -1)
      }));
    } catch (error) {
      console.error('Error toggling follow:', error);
    }
  };

  if (!profile) return <div>Загрузка...</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Шапка профиля */}
      <div className="bg-white shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="flex items-start gap-8">
            {/* Аватар */}
            <img
              src={profile.avatar_url}
              alt={profile.username}
              className="w-32 h-32 rounded-full border-4 border-gray-200"
            />

            {/* Информация */}
            <div className="flex-1">
              <div className="flex items-center gap-4 mb-4">
                <h1 className="text-3xl font-bold">{profile.username}</h1>
                <button
                  onClick={handleFollow}
                  className={`px-4 py-2 rounded-lg font-medium ${
                    isFollowing
                      ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {isFollowing ? 'Отписаться' : 'Подписаться'}
                </button>
              </div>

              {profile.bio && (
                <p className="text-gray-600 mb-4">{profile.bio}</p>
              )}

              {/* Статистика */}
              <div className="flex gap-6">
                <div className="text-center">
                  <div className="text-2xl font-bold">{profile.total_projects}</div>
                  <div className="text-sm text-gray-500">Комиксов</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">
                    {formatNumber(profile.total_views)}
                  </div>
                  <div className="text-sm text-gray-500">Просмотров</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">
                    {formatNumber(profile.total_likes)}
                  </div>
                  <div className="text-sm text-gray-500">Лайков</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">
                    {profile.follower_count}
                  </div>
                  <div className="text-sm text-gray-500">Подписчиков</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Табы */}
      <div className="bg-white border-b sticky top-0">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex gap-8">
            <button
              onClick={() => setActiveTab('projects')}
              className={`py-4 border-b-2 font-medium ${
                activeTab === 'projects'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600'
              }`}
            >
              <BookOpen size={18} className="inline mr-2" />
              Комиксы
            </button>
            <button
              onClick={() => setActiveTab('stats')}
              className={`py-4 border-b-2 font-medium ${
                activeTab === 'stats'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600'
              }`}
            >
              📊 Статистика
            </button>
          </div>
        </div>
      </div>

      {/* Контент */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        {activeTab === 'projects' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {profile.projects?.map(project => (
              <div key={project.id} className="bg-white rounded-lg shadow-md p-4">
                <img
                  src={project.thumbnail_url || '/placeholder.jpg'}
                  alt={project.title}
                  className="w-full h-40 object-cover rounded mb-3"
                />
                <h3 className="font-semibold mb-2">{project.title}</h3>
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <div className="flex gap-3">
                    <span className="flex items-center gap-1">
                      <Eye size={14} />
                      {project.view_count}
                    </span>
                    <span className="flex items-center gap-1">
                      <Heart size={14} />
                      {project.like_count}
                    </span>
                  </div>
                  <span
                    className="px-2 py-1 rounded text-xs"
                    style={{
                      backgroundColor: project.genre?.color + '20',
                      color: project.genre?.color
                    }}
                  >
                    {project.genre?.icon} {project.genre?.name}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'stats' && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold mb-4">Статистика по жанрам</h2>
            {/* TODO: Добавить графики */}
            <p className="text-gray-500">Графики будут добавлены позже</p>
          </div>
        )}
      </div>
    </div>
  );
}

function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
}
```

### 3.3 Компонент лидерборда

```typescript
// src/components/Leaderboard.tsx
import { useState, useEffect } from 'react';
import { socialService } from '@/services';
import { Trophy, TrendingUp, Eye, Heart } from 'lucide-react';

export function Leaderboard() {
  const [leaders, setLeaders] = useState([]);
  const [period, setPeriod] = useState<'week' | 'month' | 'all'>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLeaderboard();
  }, [period]);

  const loadLeaderboard = async () => {
    setLoading(true);
    try {
      const data = await socialService.getLeaderboard(period);
      setLeaders(data);
    } catch (error) {
      console.error('Error loading leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const getMedalColor = (position: number) => {
    switch (position) {
      case 1: return 'text-yellow-500';
      case 2: return 'text-gray-400';
      case 3: return 'text-orange-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="bg-white rounded-lg shadow-lg">
        {/* Заголовок */}
        <div className="p-6 border-b">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Trophy className="text-yellow-500" />
            Лидерборд авторов
          </h1>
          
          {/* Фильтр периода */}
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => setPeriod('week')}
              className={`px-4 py-2 rounded-lg ${
                period === 'week'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700'
              }`}
            >
              Неделя
            </button>
            <button
              onClick={() => setPeriod('month')}
              className={`px-4 py-2 rounded-lg ${
                period === 'month'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700'
              }`}
            >
              Месяц
            </button>
            <button
              onClick={() => setPeriod('all')}
              className={`px-4 py-2 rounded-lg ${
                period === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700'
              }`}
            >
              Все время
            </button>
          </div>
        </div>

        {/* Список лидеров */}
        <div className="divide-y">
          {loading ? (
            <div className="p-8 text-center text-gray-500">
              Загрузка...
            </div>
          ) : (
            leaders.map((user, index) => (
              <div
                key={user.id}
                className="p-4 flex items-center gap-4 hover:bg-gray-50 transition-colors"
              >
                {/* Позиция */}
                <div className={`text-2xl font-bold w-12 text-center ${getMedalColor(index + 1)}`}>
                  {index < 3 ? (
                    <span className="text-3xl">
                      {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                    </span>
                  ) : (
                    index + 1
                  )}
                </div>

                {/* Аватар и имя */}
                <div className="flex items-center gap-3 flex-1">
                  <img
                    src={user.avatar_url}
                    alt={user.username}
                    className="w-12 h-12 rounded-full"
                  />
                  <div>
                    <a
                      href={`/user/${user.username}`}
                      className="font-semibold text-gray-800 hover:text-blue-600"
                    >
                      {user.username}
                    </a>
                    <div className="text-sm text-gray-500">
                      {user.total_projects} комиксов
                    </div>
                  </div>
                </div>

                {/* Статистика */}
                <div className="flex gap-4 text-sm">
                  <div className="flex items-center gap-1 text-gray-600">
                    <Eye size={16} />
                    <span>{formatNumber(user.total_views)}</span>
                  </div>
                  <div className="flex items-center gap-1 text-red-500">
                    <Heart size={16} />
                    <span className="font-semibold">{formatNumber(user.total_likes)}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
```

---

## Фаза 4: Оптимизации и улучшения

### 4.1 Кеширование с React Query

```typescript
// src/hooks/useSupabaseQuery.ts
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { projectsService, socialService } from '@/services';

// Хук для проектов с фильтрами
export function useProjects(filters: any) {
  return useQuery(
    ['projects', filters],
    () => projectsService.getProjects(filters),
    {
      staleTime: 30 * 1000, // 30 секунд
      cacheTime: 5 * 60 * 1000, // 5 минут
    }
  );
}

// Хук для лайков с оптимистичным обновлением
export function useLike() {
  const queryClient = useQueryClient();

  return useMutation(
    (projectId: string) => projectsService.toggleLike(projectId),
    {
      onMutate: async (projectId) => {
        // Отменяем текущие запросы
        await queryClient.cancelQueries(['projects']);

        // Оптимистично обновляем UI
        const previousProjects = queryClient.getQueryData(['projects']);
        
        queryClient.setQueryData(['projects'], (old: any) => {
          // Обновляем состояние лайка
          return {
            ...old,
            projects: old.projects.map((p: any) =>
              p.id === projectId
                ? { ...p, is_liked: !p.is_liked, like_count: p.like_count + (p.is_liked ? -1 : 1) }
                : p
            ),
          };
        });

        return { previousProjects };
      },
      onError: (err, projectId, context) => {
        // Откатываем при ошибке
        queryClient.setQueryData(['projects'], context?.previousProjects);
      },
      onSettled: () => {
        // Обновляем данные с сервера
        queryClient.invalidateQueries(['projects']);
      },
    }
  );
}

// Хук для профиля пользователя
export function useUserProfile(username: string) {
  return useQuery(
    ['profile', username],
    () => socialService.getUserProfile(username),
    {
      staleTime: 60 * 1000, // 1 минута
      enabled: !!username,
    }
  );
}

// Хук для жанров (кешируем надолго)
export function useGenres() {
  return useQuery(
    'genres',
    () => socialService.getGenres(),
    {
      staleTime: 60 * 60 * 1000, // 1 час
      cacheTime: 24 * 60 * 60 * 1000, // 24 часа
    }
  );
}
```

### 4.2 Глобальный стейт с Zustand

```typescript
// src/store/app.store.ts
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

interface AppState {
  // Пользователь
  user: any | null;
  profile: Profile | null;
  
  // UI состояния
  sidebarOpen: boolean;
  theme: 'light' | 'dark';
  
  // Действия
  setUser: (user: any) => void;
  setProfile: (profile: Profile) => void;
  toggleSidebar: () => void;
  setTheme: (theme: 'light' | 'dark') => void;
  
  // Уведомления
  notifications: Notification[];
  addNotification: (notification: Notification) => void;
  removeNotification: (id: string) => void;
}

export const useAppStore = create<AppState>()(
  devtools(
    persist(
      (set) => ({
        // Начальные значения
        user: null,
        profile: null,
        sidebarOpen: true,
        theme: 'light',
        notifications: [],

        // Действия
        setUser: (user) => set({ user }),
        setProfile: (profile) => set({ profile }),
        toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
        setTheme: (theme) => set({ theme }),
        
        addNotification: (notification) =>
          set((state) => ({
            notifications: [...state.notifications, notification],
          })),
          
        removeNotification: (id) =>
          set((state) => ({
            notifications: state.notifications.filter((n) => n.id !== id),
          })),
      }),
      {
        name: 'app-storage',
        partialize: (state) => ({ theme: state.theme }), // Сохраняем только тему
      }
    )
  )
);
```

---

## Чеклист готовности к запуску

### Текущий этап - Настройка инфраструктуры:
- [ ] Таблицы БД созданы с социальными функциями (Фаза 1.2)
- [ ] RLS политики настроены (Фаза 1.3)
- [ ] Storage buckets созданы (Фаза 1.4)
- [ ] npm пакеты установлены

### MVP с социальными функциями (3 недели):
- [ ] Авторизация работает (GitHub/Email)
- [ ] Галерея с фильтрами по жанрам
- [ ] Счетчики просмотров и лайков
- [ ] Профили пользователей
- [ ] Базовый лидерборд
- [ ] Real-time обновления лайков

### Beta версия (1 месяц):
- [ ] Комментарии к проектам
- [ ] Подписки на авторов
- [ ] Push уведомления о новых лайках
- [ ] Расширенная аналитика для авторов
- [ ] Рекомендации на основе лайков

### Production с монетизацией (2 месяца):
- [ ] Платные планы с расширенной аналитикой
- [ ] Премиум жанры для Pro пользователей
- [ ] Marketplace для продажи комиксов
- [ ] Спонсорские размещения
- [ ] A/B тесты конверсии

---

## 💡 Советы по приоритетам

### Делайте в первую очередь:
1. **Базовая миграция на Supabase** - без этого ничего не работает
2. **Жанры и фильтры** - улучшают навигацию сразу
3. **Просмотры и лайки** - социальное доказательство
4. **Профили пользователей** - строят сообщество

### Можно отложить:
- Комментарии (сложная модерация)
- Подписки (нужна критическая масса)
- Расширенная аналитика (для начала хватит базовой)
- Push уведомления (требуют дополнительной настройки)

### Killer Features для старта:
- **Real-time лайки** - создают ощущение живой платформы
- **Лидерборд** - геймификация и соревнование
- **Умная сортировка** - помогает найти лучший контент

---

## Полезные ресурсы

### Для вашего проекта interactive webtoon:
- [Supabase Dashboard](https://supabase.com/dashboard/project/ennbxoy1oehzntqzxqvu)
- [Supabase Docs - Social Features](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [React Query Examples](https://tanstack.com/query/latest/docs/react/examples/optimistic-updates)
- [Zustand Documentation](https://docs.pmnd.rs/zustand/getting-started/introduction)

### Примеры реализаций:
- [Supabase Realtime Example](https://github.com/supabase/realtime/tree/main/examples)
- [Social Network Schema](https://github.com/supabase/supabase/tree/master/examples/slack-clone)
- [Leaderboard Implementation](https://supabase.com/blog/postgres-views)

---

*Последнее обновление: Август 2025*
*Проект: interactive webtoon (drdangr)*
*Версия: 2.0 - с социальными функциями*