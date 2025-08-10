-- ============================================
-- ВКЛЮЧЕНИЕ ROW LEVEL SECURITY
-- ============================================

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
-- SECURITY DEFINER для служебных функций (обход RLS внутри функций/триггеров)
-- ============================================

-- increment_view_count: обновляет projects.view_count и profiles.total_views
-- Требуется SECURITY DEFINER, иначе UPDATE projects заблокирует RLS для не-автора
DO $$
BEGIN
  PERFORM 1
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname = 'increment_view_count';
  IF FOUND THEN
    EXECUTE 'ALTER FUNCTION public.increment_view_count(uuid, uuid, text) SECURITY DEFINER SET search_path = public';
    -- Закрываем прямой вызов всем и разрешаем только ролям API
    EXECUTE 'REVOKE ALL ON FUNCTION public.increment_view_count(uuid, uuid, text) FROM PUBLIC';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.increment_view_count(uuid, uuid, text) TO anon, authenticated';
  END IF;
END $$;

-- update_like_count (триггерная функция): обновляет projects.like_count и profiles.total_likes
DO $$
BEGIN
  PERFORM 1
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname = 'update_like_count'
    AND p.pronargs = 0; -- триггерная функция без аргументов
  IF FOUND THEN
    EXECUTE 'ALTER FUNCTION public.update_like_count() SECURITY DEFINER SET search_path = public';
  END IF;
END $$;

-- Триггерная функция просмотров тоже выполняется с правами владельца
DO $$
BEGIN
  PERFORM 1
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname = 'increment_project_view_count'
    AND p.pronargs = 0;
  IF FOUND THEN
    EXECUTE 'ALTER FUNCTION public.increment_project_view_count() SECURITY DEFINER SET search_path = public';
  END IF;
END $$;

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

-- Разрешаем всем видеть изображения публичных проектов
CREATE POLICY "Public can view images of public projects"
  ON public.images FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = images.project_id
      AND projects.is_public = true
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

-- Позволяем читать версии публичных проектов всем
CREATE POLICY "Public can view versions of public projects" 
  ON public.project_versions FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = project_versions.project_id
      AND projects.is_public = true
    )
    OR EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = project_versions.project_id
      AND projects.user_id = auth.uid()
    )
  );

-- Hotspots - управление через проекты  
CREATE POLICY "Users can manage hotspots in own projects" 
  ON public.hotspots FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM public.projects 
      WHERE projects.id = hotspots.project_id 
      AND projects.user_id = auth.uid()
    )
  );

-- ============================================
-- ПРОВЕРКА RLS
-- ============================================

-- Проверяем, что RLS включен для всех таблиц
SELECT 
  schemaname,
  tablename,
  rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;
