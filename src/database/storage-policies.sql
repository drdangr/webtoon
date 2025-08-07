-- ============================================
-- ПОЛИТИКИ ДОСТУПА ДЛЯ STORAGE BUCKETS
-- ============================================

-- Политики для bucket: project-images
-- Пользователи могут загружать изображения в свою папку
CREATE POLICY "Users can upload project images" 
  ON storage.objects FOR INSERT 
  WITH CHECK (
    bucket_id = 'project-images' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Пользователи могут обновлять свои изображения
CREATE POLICY "Users can update own project images" 
  ON storage.objects FOR UPDATE 
  USING (
    bucket_id = 'project-images' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Пользователи могут удалять свои изображения
CREATE POLICY "Users can delete own project images" 
  ON storage.objects FOR DELETE 
  USING (
    bucket_id = 'project-images' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Все могут просматривать изображения проектов
CREATE POLICY "Public can view project images" 
  ON storage.objects FOR SELECT 
  USING (bucket_id = 'project-images');

-- ============================================
-- Политики для bucket: avatars
-- ============================================

-- Пользователи могут загружать свой аватар
CREATE POLICY "Users can upload own avatar" 
  ON storage.objects FOR INSERT 
  WITH CHECK (
    bucket_id = 'avatars' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Пользователи могут обновлять свой аватар
CREATE POLICY "Users can update own avatar" 
  ON storage.objects FOR UPDATE 
  USING (
    bucket_id = 'avatars' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Пользователи могут удалять свой аватар
CREATE POLICY "Users can delete own avatar" 
  ON storage.objects FOR DELETE 
  USING (
    bucket_id = 'avatars' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Все могут просматривать аватары
CREATE POLICY "Public can view avatars" 
  ON storage.objects FOR SELECT 
  USING (bucket_id = 'avatars');

-- ============================================
-- Политики для bucket: thumbnails
-- ============================================

-- Пользователи могут управлять своими превью
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

-- Все могут просматривать превью
CREATE POLICY "Public can view thumbnails" 
  ON storage.objects FOR SELECT 
  USING (bucket_id = 'thumbnails');

-- ============================================
-- ПРОВЕРКА ПОЛИТИК
-- ============================================

-- Проверяем созданные политики для storage
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE schemaname = 'storage' 
  AND tablename = 'objects'
ORDER BY policyname;
