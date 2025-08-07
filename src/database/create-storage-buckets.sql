-- ============================================
-- СОЗДАНИЕ STORAGE BUCKETS
-- ============================================

-- Создаем bucket для изображений проектов
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'project-images',
  'project-images',
  true, -- Публичный доступ для чтения
  10485760, -- 10MB лимит на файл
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

-- Создаем bucket для аватаров
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true, -- Публичный доступ для чтения
  5242880, -- 5MB лимит на файл
  ARRAY['image/jpeg', 'image/png', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

-- Создаем bucket для миниатюр проектов
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'thumbnails',
  'thumbnails',
  true, -- Публичный доступ для чтения
  2097152, -- 2MB лимит на файл
  ARRAY['image/jpeg', 'image/png', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

-- ============================================
-- RLS ПОЛИТИКИ ДЛЯ STORAGE
-- ============================================

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

CREATE POLICY "Users can delete own avatar" 
  ON storage.objects FOR DELETE 
  USING (
    bucket_id = 'avatars' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Public can view avatars" 
  ON storage.objects FOR SELECT 
  USING (bucket_id = 'avatars');

-- Политики для thumbnails
CREATE POLICY "Users can upload own thumbnails" 
  ON storage.objects FOR INSERT 
  WITH CHECK (
    bucket_id = 'thumbnails' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update own thumbnails" 
  ON storage.objects FOR UPDATE 
  USING (
    bucket_id = 'thumbnails' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete own thumbnails" 
  ON storage.objects FOR DELETE 
  USING (
    bucket_id = 'thumbnails' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Public can view thumbnails" 
  ON storage.objects FOR SELECT 
  USING (bucket_id = 'thumbnails');
