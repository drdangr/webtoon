import { supabase } from '../lib/supabase';
import type { Image, ImageInsert } from '../lib/database.types';
import { authService } from './auth.service';

interface UploadResult {
  url: string;
  path: string;
  error?: string;
}

class StorageService {
  private readonly BUCKET_NAMES = {
    PROJECT_IMAGES: 'project-images',
    AVATARS: 'avatars',
    THUMBNAILS: 'thumbnails'
  };

  /**
   * Загрузка изображения проекта
   */
  async uploadProjectImage(
    projectId: string,
    file: File,
    imageId?: string
  ): Promise<UploadResult> {
    try {
      const user = await authService.getCurrentUser();
      if (!user) {
        console.error('❌ User not authenticated for upload');
        throw new Error('User not authenticated');
      }

      // Генерируем уникальное имя файла
      const fileExt = file.name.split('.').pop();
      const fileName = imageId || `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      const filePath = `${user.id}/${projectId}/${fileName}.${fileExt}`;

      console.log(`📤 Attempting to upload to Storage:`, {
        bucket: this.BUCKET_NAMES.PROJECT_IMAGES,
        filePath,
        fileSize: file.size,
        fileType: file.type
      });

      // Загружаем файл в Storage
      const { data, error } = await supabase.storage
        .from(this.BUCKET_NAMES.PROJECT_IMAGES)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (error) {
        console.error('❌ Storage upload error:', error);
        throw error;
      }

      console.log(`✅ File uploaded successfully:`, data);

      // Получаем публичный URL
      const { data: { publicUrl } } = supabase.storage
        .from(this.BUCKET_NAMES.PROJECT_IMAGES)
        .getPublicUrl(data.path);

      console.log(`📎 Public URL generated:`, publicUrl);

      // Сохраняем информацию об изображении в БД
      await this.saveImageRecord(projectId, {
        file_path: data.path,
        file_url: publicUrl,
        file_name: file.name,
        file_size: file.size
      });

      return {
        url: publicUrl,
        path: data.path
      };
    } catch (error: any) {
      console.error('UploadProjectImage error:', error);
      return {
        url: '',
        path: '',
        error: error.message
      };
    }
  }

  /**
   * Загрузка thumbnail проекта
   */
  async uploadThumbnail(
    projectId: string,
    file: File
  ): Promise<UploadResult> {
    try {
      const user = await authService.getCurrentUser();
      if (!user) throw new Error('User not authenticated');

      // Загружаем превью сразу в project-images (лимит выше)
      const fileExt = (file.name.split('.').pop() || 'jpg').toLowerCase();
      const imagePath = `${user.id}/${projectId}/thumbnail.${fileExt}`;
      const { data, error } = await supabase.storage
        .from(this.BUCKET_NAMES.PROJECT_IMAGES)
        .upload(imagePath, file, {
          cacheControl: '3600',
          upsert: true,
          contentType: file.type || 'image/jpeg'
        });
      if (error) throw error;
      const { data: urlData } = supabase.storage
        .from(this.BUCKET_NAMES.PROJECT_IMAGES)
        .getPublicUrl(data.path);
      const publicUrl = urlData.publicUrl;
      const uploadedPath = data.path;

      // Добавляем параметр версии, чтобы обходить кэш CDN/браузера
      const versionedUrl = `${publicUrl}${publicUrl.includes('?') ? '&' : '?'}v=${Date.now()}`;

      // Обновляем URL в проекте (только превью, не трогаем версии)
      await supabase
        .from('projects')
        .update({ thumbnail_url: versionedUrl })
        .eq('id', projectId)
        .eq('user_id', user.id);

      return {
        url: versionedUrl,
        path: uploadedPath
      };
    } catch (error: any) {
      console.error('UploadThumbnail error:', error);
      return {
        url: '',
        path: '',
        error: error.message
      };
    }
  }

  /**
   * Загрузка аватара пользователя
   */
  async uploadAvatar(file: File): Promise<UploadResult> {
    try {
      const user = await authService.getCurrentUser();
      if (!user) throw new Error('User not authenticated');

      // Генерируем имя файла
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/avatar.${fileExt}`;

      // Загружаем файл в Storage
      const { data, error } = await supabase.storage
        .from(this.BUCKET_NAMES.AVATARS)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true // Перезаписываем если существует
        });

      if (error) throw error;

      // Получаем публичный URL
      const { data: { publicUrl } } = supabase.storage
        .from(this.BUCKET_NAMES.AVATARS)
        .getPublicUrl(data.path);

      // Обновляем URL в профиле
      await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);

      return {
        url: publicUrl,
        path: data.path
      };
    } catch (error: any) {
      console.error('UploadAvatar error:', error);
      return {
        url: '',
        path: '',
        error: error.message
      };
    }
  }

  /**
   * Загрузка изображения из base64
   */
  async uploadBase64Image(
    projectId: string,
    base64Data: string,
    imageId: string,
    fileName: string = 'image.png'
  ): Promise<UploadResult> {
    try {
      console.log(`📤 Загружаем изображение ${imageId} в Storage для проекта ${projectId}`);
      
      // Конвертируем base64 в Blob
      const base64Response = await fetch(base64Data);
      const blob = await base64Response.blob();
      
      // Создаем File из Blob
      const file = new File([blob], fileName, { type: blob.type });
      
      // Проверяем размер
      const sizeMB = Math.round(file.size / 1024 / 1024 * 10) / 10;
      console.log(`📦 Размер файла: ${sizeMB} МБ`);
      
      // Загружаем файл с указанным imageId
      const result = await this.uploadProjectImage(projectId, file, imageId);
      
      if (result.url) {
        console.log(`✅ Изображение ${imageId} загружено: ${result.url}`);
      } else {
        console.error(`❌ Ошибка загрузки ${imageId}: ${result.error}`);
      }
      
      return result;
    } catch (error: any) {
      console.error('UploadBase64Image error:', error);
      return {
        url: '',
        path: '',
        error: error.message
      };
    }
  }

  /**
   * Удаление изображения
   */
  async deleteImage(bucket: string, path: string): Promise<boolean> {
    try {
      const user = await authService.getCurrentUser();
      if (!user) throw new Error('User not authenticated');

      // Проверяем, что путь принадлежит текущему пользователю
      if (!path.startsWith(user.id)) {
        throw new Error('Unauthorized to delete this image');
      }

      const { error } = await supabase.storage
        .from(bucket)
        .remove([path]);

      if (error) throw error;

      // Удаляем запись из БД если это изображение проекта
      if (bucket === this.BUCKET_NAMES.PROJECT_IMAGES) {
        await supabase
          .from('images')
          .delete()
          .eq('file_path', path);
      }

      return true;
    } catch (error: any) {
      console.error('DeleteImage error:', error);
      return false;
    }
  }

  /**
   * Удаление всех изображений проекта
   */
  async deleteProjectImages(projectId: string): Promise<void> {
    try {
      const user = await authService.getCurrentUser();
      if (!user) return;

      // Получаем список изображений проекта
      const { data: images } = await supabase
        .from('images')
        .select('file_path')
        .eq('project_id', projectId);

      if (images && images.length > 0) {
        // Удаляем файлы из Storage
        const paths = images.map(img => img.file_path);
        await supabase.storage
          .from(this.BUCKET_NAMES.PROJECT_IMAGES)
          .remove(paths);
      }

      // Удаляем thumbnail
      const folderPath = `${user.id}/${projectId}`;
      const { data: thumbnails } = await supabase.storage
        .from(this.BUCKET_NAMES.THUMBNAILS)
        .list(user.id, {
          search: projectId
        });

      if (thumbnails && thumbnails.length > 0) {
        const thumbnailPaths = thumbnails.map(t => `${user.id}/${t.name}`);
        await supabase.storage
          .from(this.BUCKET_NAMES.THUMBNAILS)
          .remove(thumbnailPaths);
      }
    } catch (error: any) {
      console.error('DeleteProjectImages error:', error);
    }
  }

  /**
   * Сохранение записи об изображении в БД
   */
  private async saveImageRecord(
    projectId: string,
    imageData: Omit<ImageInsert, 'project_id'>
  ): Promise<void> {
    try {
      console.log(`💾 Saving image record to DB:`, {
        projectId,
        ...imageData
      });
      
      const { error } = await supabase
        .from('images')
        .insert({
          project_id: projectId,
          ...imageData
        });

      if (error) {
        console.error('❌ Failed to save image record:', error);
        throw error;
      }
      
      console.log(`✅ Image record saved to DB`);
    } catch (error: any) {
      console.error('SaveImageRecord error:', error);
      // Не прерываем процесс, если не удалось сохранить запись в БД
    }
  }

  /**
   * Получение списка изображений проекта
   */
  async getProjectImages(projectId: string): Promise<Image[]> {
    try {
      const { data, error } = await supabase
        .from('images')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data || [];
    } catch (error: any) {
      console.error('GetProjectImages error:', error);
      return [];
    }
  }

  /**
   * Получение размера изображения
   */
  async getImageDimensions(url: string): Promise<{ width: number; height: number } | null> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        resolve({ width: img.width, height: img.height });
      };
      img.onerror = () => {
        resolve(null);
      };
      img.src = url;
    });
  }

  /**
   * Проверка типа файла
   */
  isValidImageType(file: File): boolean {
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    return validTypes.includes(file.type);
  }

  /**
   * Проверка размера файла (максимум 10MB для анимированных GIF)
   */
  isValidFileSize(file: File, maxSizeMB: number = 10): boolean {
    const maxSize = maxSizeMB * 1024 * 1024; // Конвертируем в байты
    return file.size <= maxSize;
  }

  /**
   * Валидация изображения перед загрузкой
   */
  validateImage(file: File): { valid: boolean; error?: string } {
    if (!this.isValidImageType(file)) {
      return {
        valid: false,
        error: 'Неподдерживаемый формат файла. Используйте JPEG, PNG, GIF или WebP.'
      };
    }

    if (!this.isValidFileSize(file)) {
      return {
        valid: false,
        error: 'Файл слишком большой. Максимальный размер 5MB.'
      };
    }

    return { valid: true };
  }
}

export const storageService = new StorageService();
