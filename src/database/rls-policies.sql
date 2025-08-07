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
