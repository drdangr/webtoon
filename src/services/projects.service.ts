import { supabase } from '../lib/supabase';
import type { 
  Project, 
  ProjectInsert, 
  ProjectUpdate,
  ProjectVersion,
  ProjectVersionInsert,
  Genre,
  Profile
} from '../lib/database.types';
import { generateSlug, generateUniqueSlug } from '../utils/slug';
import { authService } from './auth.service';
import { storageService } from './storage.service';

interface ProjectWithRelations extends Project {
  author?: Profile;
  genre?: Genre;
  latest_version?: ProjectVersion;
}

interface ProjectFilters {
  userId?: string;
  genreId?: string;
  isPublic?: boolean;
  isPublished?: boolean;
  searchQuery?: string;
  sortBy?: 'created_at' | 'updated_at' | 'view_count' | 'like_count';
  limit?: number;
  offset?: number;
}

class ProjectsService {
  /**
   * Получение списка проектов с фильтрами
   */
  async getProjects(filters: ProjectFilters = {}): Promise<{
    projects: (ProjectWithRelations & { is_liked?: boolean })[];
    total: number;
  }> {
    try {
      // Сначала получаем проекты
      let query = supabase
        .from('projects')
        .select('*', { count: 'exact' });

      // Применяем фильтры
      if (filters.userId) {
        query = query.eq('user_id', filters.userId);
      }
      if (filters.genreId) {
        query = query.eq('genre_id', filters.genreId);
      }
      if (filters.isPublic !== undefined) {
        query = query.eq('is_public', filters.isPublic);
      }
      if (filters.isPublished !== undefined) {
        query = query.eq('is_published', filters.isPublished);
      }
      if (filters.searchQuery) {
        query = query.or(`title.ilike.%${filters.searchQuery}%,description.ilike.%${filters.searchQuery}%`);
      }

      // Сортировка
      const sortColumn = filters.sortBy || 'created_at';
      query = query.order(sortColumn, { ascending: false });

      // Пагинация
      const limit = filters.limit || 20;
      const offset = filters.offset || 0;
      query = query.range(offset, offset + limit - 1);

      const { data: projects, error, count } = await query;

      if (error) throw error;

      // Получаем связанные данные батчами (без N+1)
      const projectList = (projects || []);
      const authorIds = Array.from(new Set(projectList.map(p => p.user_id)));
      const genreIds = Array.from(new Set(projectList.map(p => p.genre_id).filter(Boolean)));

      const [authorsRes, genresRes] = await Promise.all([
        supabase.from('profiles').select('id, username, full_name, avatar_url').in('id', authorIds),
        genreIds.length > 0 ? supabase.from('genres').select('id, name, slug, color, icon').in('id', genreIds as any) : Promise.resolve({ data: [] as any })
      ]);
      const authorsById = new Map((authorsRes.data || []).map(a => [a.id, a]));
      const genresById = new Map((genresRes as any).data?.map((g: any) => [g.id, g]) || []);

      const projectsWithRelations = projectList.map(project => ({
        ...project,
        author: authorsById.get(project.user_id) || undefined,
        genre: project.genre_id ? genresById.get(project.genre_id) || undefined : undefined
      }));

      // Добавляем is_liked для текущего пользователя за один запрос
      const user = await authService.getCurrentUser();
      if (user && projectsWithRelations.length > 0) {
        const projectIds = projectsWithRelations.map(p => p.id);
        const { data: likesData } = await supabase
          .from('likes')
          .select('project_id')
          .in('project_id', projectIds)
          .eq('user_id', user.id);

        const likedSet = new Set((likesData || []).map(l => l.project_id));
        projectsWithRelations.forEach((p: any) => {
          p.is_liked = likedSet.has(p.id);
        });
      }

      return {
        projects: projectsWithRelations,
        total: count || 0
      };
    } catch (error: any) {
      console.error('GetProjects error:', error);
      return {
        projects: [],
        total: 0
      };
    }
  }

  /**
   * Получение проекта по ID
   */
  async getProject(projectId: string): Promise<ProjectWithRelations | null> {
    try {
      const { data: project, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        throw error;
      }

      if (!project) return null;

      // Получаем автора
      const { data: author } = await supabase
        .from('profiles')
        .select('id, username, full_name, avatar_url')
        .eq('id', project.user_id)
        .single();

      // Получаем жанр
      let genre = null;
      if (project.genre_id) {
        const { data: genreData } = await supabase
          .from('genres')
          .select('id, name, slug, color, icon')
          .eq('id', project.genre_id)
          .single();
        genre = genreData;
      }

      // Получаем последнюю версию
      const latestVersion = await this.getLatestVersion(projectId);
      
      return {
        ...project,
        author: author || undefined,
        genre: genre || undefined,
        latest_version: latestVersion || undefined
      };
    } catch (error: any) {
      console.error('GetProject error:', error);
      return null;
    }
  }

  /**
   * Получение проекта по slug
   */
  async getProjectBySlug(slug: string): Promise<ProjectWithRelations | null> {
    try {
      const { data: project, error } = await supabase
        .from('projects')
        .select('*')
        .eq('slug', slug)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        throw error;
      }

      if (!project) return null;

      // Получаем автора
      const { data: author } = await supabase
        .from('profiles')
        .select('id, username, full_name, avatar_url')
        .eq('id', project.user_id)
        .single();

      // Получаем жанр
      let genre = null;
      if (project.genre_id) {
        const { data: genreData } = await supabase
          .from('genres')
          .select('id, name, slug, color, icon')
          .eq('id', project.genre_id)
          .single();
        genre = genreData;
      }

      // Получаем последнюю версию
      const latestVersion = await this.getLatestVersion(project.id);
      
      return {
        ...project,
        author: author || undefined,
        genre: genre || undefined,
        latest_version: latestVersion || undefined
      };
    } catch (error: any) {
      console.error('GetProjectBySlug error:', error);
      return null;
    }
  }

  /**
   * Создание нового проекта
   */
  async createProject(projectData: {
    title: string;
    description?: string;
    thumbnail_url?: string;
    genre_id?: string;
    nodes?: any;
    edges?: any;
    images?: any;
    is_public?: boolean;
    is_published?: boolean;
  }): Promise<Project | null> {
    try {
      const user = await authService.getCurrentUser();
      if (!user) throw new Error('User not authenticated');

      // Генерируем уникальный slug
      const baseSlug = generateSlug(projectData.title);
      const existingSlugs = await this.getExistingSlugs();
      const uniqueSlug = generateUniqueSlug(baseSlug, existingSlugs);

      // Создаем проект
      const projectInsert: ProjectInsert = {
        user_id: user.id,
        title: projectData.title,
        description: projectData.description,
        thumbnail_url: projectData.thumbnail_url,
        genre_id: projectData.genre_id,
        slug: uniqueSlug,
        is_public: projectData.is_public ?? false,
        is_published: projectData.is_published ?? false,
        tags: [],
        view_count: 0,
        like_count: 0,
        comment_count: 0
      };

      const { data: project, error: projectError } = await supabase
        .from('projects')
        .insert(projectInsert)
        .select()
        .single();

      if (projectError) throw projectError;

      // Создаем первую версию проекта
      if (project) {
        // Преобразуем объекты изображений в base64 строки
        const imageStrings: any = {};
        if (projectData.images) {
          Object.entries(projectData.images).forEach(([key, value]: [string, any]) => {
            if (typeof value === 'object' && value.src) {
              imageStrings[key] = value.src;
              console.log(`📸 Извлечен base64 из объекта для ${key} при создании проекта`);
            } else if (typeof value === 'string') {
              imageStrings[key] = value;
            }
          });
        }
        
        // Загружаем изображения в Storage
        const imageUrls = await this.uploadImagesToStorage(project.id, imageStrings);
        
        // Создаем копию nodes для модификации
        const nodesWithImages = JSON.parse(JSON.stringify(projectData.nodes || {}));
        
        console.log('🆕 Создание первой версии проекта:', {
          projectId: project.id,
          hasImages: !!imageUrls,
          imagesKeys: imageUrls ? Object.keys(imageUrls) : [],
          nodesKeys: Object.keys(nodesWithImages)
        });
        
        if (imageUrls && Object.keys(imageUrls).length > 0) {
          // Добавляем URL изображений в узлы
          Object.keys(nodesWithImages).forEach(nodeId => {
            const node = nodesWithImages[nodeId];
            if (node?.data?.backgroundImage) {
              const imageId = node.data.backgroundImage;
              if (imageUrls[imageId]) {
                if (!node.data) node.data = {};
                node.data.imageUrl = imageUrls[imageId];
                console.log(`✅ Добавлен URL изображения ${imageId} в узел ${nodeId} (первая версия)`);
              }
            }
          });
          
          // Сохраняем URLs для быстрого доступа
          nodesWithImages._imageUrls = imageUrls;
          console.log(`💾 Сохранено ${Object.keys(imageUrls).length} URL изображений (первая версия)`);
        } else {
          console.log('⚠️ Нет изображений для первой версии проекта');
        }

        const versionData: ProjectVersionInsert = {
          project_id: project.id,
          version_number: 1,
          nodes: nodesWithImages,
          edges: projectData.edges || [],
          created_by: user.id
        };
        
        // Проверяем размер данных
        const dataSize = JSON.stringify(versionData).length;
        console.log('📏 Размер первой версии:', {
          totalSize: dataSize,
          totalSizeKB: Math.round(dataSize / 1024),
          totalSizeMB: Math.round(dataSize / 1024 / 1024)
        });

        const { data: versionDataResult, error: versionError } = await supabase
          .from('project_versions')
          .insert(versionData)
          .select()
          .single();

        if (versionError) {
          console.error('❌ Error creating project version:', versionError);
          console.error('❌ Детали ошибки:', {
            message: versionError.message,
            details: versionError.details,
            hint: versionError.hint,
            code: versionError.code
          });
          // Не бросаем ошибку, проект уже создан
        } else if (versionDataResult) {
          let savedImagesCount = 0;
          const savedNodes = versionDataResult.nodes || {};
          
          // Проверяем _images
          if (savedNodes._images) {
            savedImagesCount = Object.keys(savedNodes._images).length;
          }
          
          console.log('✅ Первая версия сохранена:', {
            imagesInOriginal: Object.keys(projectData.images || {}).length,
            savedImagesCount,
            hasImagesStorage: !!savedNodes._images,
            dataSizeKB: Math.round(JSON.stringify(versionDataResult).length / 1024)
          });
        }
      }

      return project;
    } catch (error: any) {
      console.error('CreateProject error:', error);
      throw error;
    }
  }

  /**
   * Обновление проекта
   */
  async updateProject(
    projectId: string, 
    updates: ProjectUpdate,
    newVersion?: { nodes: any; edges: any; images?: any }
  ): Promise<Project | null> {
    try {
      const user = await authService.getCurrentUser();
      if (!user) throw new Error('User not authenticated');

      // Чистим undefined поля
      const cleanedUpdates: any = Object.fromEntries(
        Object.entries(updates || {}).filter(([, v]) => v !== undefined)
      );

      // Если обновлять нечего (только версия) — пропускаем UPDATE projects, читаем текущую запись
      let project: Project | null = null;
      if (Object.keys(cleanedUpdates).length === 0) {
        const { data: existing } = await supabase
          .from('projects')
          .select('*')
          .eq('id', projectId)
          .eq('user_id', user.id)
          .single();
        project = existing as any;
      } else {
        const { data, error } = await supabase
          .from('projects')
          .update({
            ...cleanedUpdates,
            updated_at: new Date().toISOString()
          })
          .eq('id', projectId)
          .eq('user_id', user.id) // Проверка владельца
          .select()
          .single();
        if (error) throw error;
        project = data as any;
      }

      // Если есть новая версия, сохраняем её
      if (newVersion && project) {
        console.log('📤 Передаем в saveProjectVersion:', {
          hasNodes: !!newVersion.nodes,
          nodesCount: Object.keys(newVersion.nodes || {}).length,
          hasEdges: !!newVersion.edges,
          edgesCount: (newVersion.edges || []).length,
          hasImages: !!newVersion.images,
          imagesCount: Object.keys(newVersion.images || {}).length,
          imageIds: newVersion.images ? Object.keys(newVersion.images) : []
        });
        
        await this.saveProjectVersion(
          projectId, 
          newVersion.nodes, 
          newVersion.edges,
          newVersion.images
        );
      }

      return project;
    } catch (error: any) {
      console.error('UpdateProject error:', error);
      throw error;
    }
  }

  /**
   * Удаление проекта
   */
  async deleteProject(projectId: string): Promise<boolean> {
    try {
      const user = await authService.getCurrentUser();
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectId)
        .eq('user_id', user.id); // Проверка владельца

      if (error) throw error;

      return true;
    } catch (error: any) {
      console.error('DeleteProject error:', error);
      return false;
    }
  }

  /**
   * Поставить/снять лайк к проекту текущим пользователем
   */
  async toggleLike(projectId: string): Promise<{ liked: boolean; likeCount?: number }> {
    try {
      const user = await authService.getCurrentUser();
      if (!user) throw new Error('User not authenticated');

      // Проверяем, есть ли лайк
      const { data: existingLike } = await supabase
        .from('likes')
        .select('id')
        .eq('project_id', projectId)
        .eq('user_id', user.id)
        .single();

      if (existingLike) {
        const { error } = await supabase
          .from('likes')
          .delete()
          .eq('id', existingLike.id);
        if (error) throw error;
        // читаем актуальный счетчик из projects
        const { data: proj } = await supabase
          .from('projects')
          .select('like_count')
          .eq('id', projectId)
          .single();
        return { liked: false, likeCount: proj?.like_count };
      } else {
        const { error } = await supabase
          .from('likes')
          .insert({ project_id: projectId, user_id: user.id });
        if (error) throw error;
        const { data: proj } = await supabase
          .from('projects')
          .select('like_count')
          .eq('id', projectId)
          .single();
        return { liked: true, likeCount: proj?.like_count };
      }
    } catch (error: any) {
      console.error('ToggleLike error:', error);
      throw error;
    }
  }

  /**
   * Загрузка изображений в Storage и получение URL
   */
  private async uploadImagesToStorage(
    projectId: string,
    images: any
  ): Promise<any> {
    if (!images || Object.keys(images).length === 0) {
      return {};
    }

    // Параллельная загрузка изображений для ускорения массового импорта
    const entries = Object.entries(images) as Array<[string, any]>;
    const results = await Promise.all(entries.map(async ([imageId, base64Data]) => {
      if (typeof base64Data !== 'string') return [imageId, undefined] as const;
      // Уже URL — возвращаем как есть
      if (base64Data.startsWith('http')) return [imageId, base64Data] as const;
      try {
        const result = await storageService.uploadBase64Image(projectId, base64Data, imageId);
        if (result.url) return [imageId, result.url] as const;
        return [imageId, base64Data] as const;
      } catch {
        return [imageId, base64Data] as const;
      }
    }));
    return Object.fromEntries(results.filter(([, v]) => typeof v === 'string'));
  }

  /**
   * Сохранение новой версии проекта
   */
  async saveProjectVersion(
    projectId: string,
    nodes: any,
    edges: any,
    images?: any
  ): Promise<ProjectVersion | null> {
    try {
      const user = await authService.getCurrentUser();
      if (!user) return null;

      // Получаем последнюю версию (для upsert)
      const { data: lastVersionRow } = await supabase
        .from('project_versions')
        .select('id, version_number')
        .eq('project_id', projectId)
        .order('version_number', { ascending: false })
        .limit(1)
        .single();

      // Преобразуем объекты изображений в base64 строки
      const imageStrings: any = {};
      if (images) {
        Object.entries(images).forEach(([key, value]: [string, any]) => {
          if (typeof value === 'object' && value.src) {
            imageStrings[key] = value.src;
            console.log(`📸 Извлечен base64 из объекта для ${key} при сохранении версии`);
          } else if (typeof value === 'string') {
            imageStrings[key] = value;
          }
        });
      }

      // Загружаем изображения в Storage и получаем URL
      const imageUrls = await this.uploadImagesToStorage(projectId, imageStrings);
      
      // Создаем копию nodes для модификации
      const nodesWithImages = JSON.parse(JSON.stringify(nodes));
      
      console.log('💾 Сохраняем версию (upsert):', {
        projectId,
        baseVersionNumber: lastVersionRow?.version_number || 0,
        hasImages: !!imageUrls,
        imagesKeys: imageUrls ? Object.keys(imageUrls) : [],
        nodesKeys: Object.keys(nodesWithImages)
      });
      
      // Сохраняем URL изображений вместо base64
      if (imageUrls && Object.keys(imageUrls).length > 0) {
        Object.keys(nodesWithImages).forEach(nodeId => {
          const node = nodesWithImages[nodeId];
          // Проверяем, есть ли у узла ссылка на изображение
          if (node?.data?.backgroundImage) {
            const imageId = node.data.backgroundImage;
            if (imageUrls[imageId]) {
              // Сохраняем URL изображения вместо base64
              if (!node.data) node.data = {};
              node.data.imageUrl = imageUrls[imageId];
              // Удаляем старое base64 если есть
              delete node.data.imageData;
              console.log(`✅ Сохранен URL изображения ${imageId} для узла ${nodeId}`);
            }
            // Всегда удаляем возможные остатки base64, даже если URL не нашли
            if (node?.data?.imageData) {
              delete node.data.imageData;
            }
          }
        });
        
        // Сохраняем URLs для быстрого доступа
        nodesWithImages._imageUrls = imageUrls;
        // Убираем возможные старые _images чтобы не хранить base64 в версиях
        if (nodesWithImages._images) {
          delete nodesWithImages._images;
        }
        console.log(`💾 Сохранено ${Object.keys(imageUrls).length} URL изображений`);

        // Fallback: если у проекта ещё нет thumbnail, используем первое изображение из версии
        try {
          const { data: proj } = await supabase
            .from('projects')
            .select('thumbnail_url')
            .eq('id', projectId)
            .single();
          const currentThumb = proj?.thumbnail_url;
          if (!currentThumb) {
            const firstUrl = imageUrls[Object.keys(imageUrls)[0]] as string | undefined;
            if (firstUrl) {
              await supabase
                .from('projects')
                .update({ thumbnail_url: firstUrl, updated_at: new Date().toISOString() })
                .eq('id', projectId);
              console.log('🖼️ Установлен thumbnail_url по первому изображению версии');
            }
          }
        } catch (e) {
          console.warn('Не удалось выполнить fallback для thumbnail_url:', e);
        }
      } else {
        console.log('⚠️ Нет изображений для сохранения');
        // Даже если нет новых изображений — подчистим возможные base64
        Object.keys(nodesWithImages).forEach(nodeId => {
          const node = nodesWithImages[nodeId];
          if (node?.data?.imageData) {
            delete node.data.imageData;
          }
        });
        if (nodesWithImages._images) {
          delete nodesWithImages._images;
        }
      }

      // Данные версии для записи
      const versionData: ProjectVersionInsert = {
        project_id: projectId,
        version_number: lastVersionRow?.version_number || 1,
        nodes: nodesWithImages,
        edges: edges,
        created_by: user.id
      };

      // Проверяем размер данных
      const dataSize = JSON.stringify(versionData).length;
      console.log('📏 Размер данных для сохранения:', {
        totalSize: dataSize,
        totalSizeKB: Math.round(dataSize / 1024),
        totalSizeMB: Math.round(dataSize / 1024 / 1024),
        nodesSize: JSON.stringify(nodesWithImages).length,
        nodesSizeKB: Math.round(JSON.stringify(nodesWithImages).length / 1024),
        nodesSizeMB: Math.round(JSON.stringify(nodesWithImages).length / 1024 / 1024)
      });
      
      if (dataSize > 1024 * 1024) { // Больше 1 МБ
        console.warn('⚠️ ВНИМАНИЕ: Размер данных превышает 1 МБ! Возможны проблемы с сохранением.');
      }

      let data: any = null;
      let error: any = null;
      if (lastVersionRow?.id) {
        // Обновляем последнюю версию вместо вставки новой — чтобы не плодить сотни записей
        const updateRes = await supabase
          .from('project_versions')
          .update({
            nodes: versionData.nodes,
            edges: versionData.edges
          })
          .eq('id', lastVersionRow.id)
          .select()
          .single();
        data = updateRes.data;
        error = updateRes.error;
      } else {
        const insertRes = await supabase
          .from('project_versions')
          .insert(versionData)
          .select()
          .single();
        data = insertRes.data;
        error = insertRes.error;
      }

      if (error) {
        console.error('❌ Ошибка сохранения версии:', error);
        console.error('❌ Детали ошибки:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        throw error;
      }
      
      // Проверяем, что сохранилось
      if (data) {
        const returnedDataSize = JSON.stringify(data).length;
        const savedNodes = data.nodes || {};
        
        // Подсчитываем сохраненные изображения
        let savedImagesCount = 0;
        
        // Проверяем _images
        if (savedNodes._images) {
          savedImagesCount += Object.keys(savedNodes._images).length;
        }
        
        // Проверяем imageData в узлах
        Object.keys(savedNodes).forEach(nodeId => {
          if (nodeId === '_images') return;
          const node = savedNodes[nodeId];
          if (node?.data?.imageData && node?.data?.backgroundImage) {
            savedImagesCount++;
          }
        });
        
        console.log('✅ Версия сохранена в БД:', {
          projectId: data.project_id,
          versionNumber: data.version_number,
          nodesCount: Object.keys(savedNodes).filter(k => k !== '_images').length,
          edgesCount: (data.edges || []).length,
          savedImagesCount,
          hasImagesStorage: !!savedNodes._images,
          returnedDataSize,
          returnedDataSizeKB: Math.round(returnedDataSize / 1024),
          returnedDataSizeMB: Math.round(returnedDataSize / 1024 / 1024)
        });
        
        // Сравниваем размеры до и после
        const originalSize = JSON.stringify(nodesWithImages).length;
        const savedSize = JSON.stringify(savedNodes).length;
        if (savedSize < originalSize / 2) {
          console.error('❌ КРИТИЧНО: Данные были обрезаны! Исходный размер:', originalSize, 'Сохранено:', savedSize);
        }
      }

      return data;
    } catch (error: any) {
      console.error('SaveProjectVersion error:', error);
      return null;
    }
  }

  /**
   * Получение последней версии проекта
   */
  async getLatestVersion(projectId: string): Promise<ProjectVersion | null> {
    try {
      const { data, error } = await supabase
        .from('project_versions')
        .select('*')
        .eq('project_id', projectId)
        .order('version_number', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          console.log('📭 Нет версий для проекта:', projectId);
          return null;
        }
        throw error;
      }

      if (data) {
        const imagesInNodes: string[] = [];
        const nodes = data.nodes || {};
        
        // Проверяем _images
        let imagesFromStorage = 0;
        if (nodes._images) {
          imagesFromStorage = Object.keys(nodes._images).length;
        }
        
        // Проверяем imageData в узлах
        Object.keys(nodes).forEach(nodeId => {
          if (nodeId === '_images') return; // Пропускаем специальное поле
          const node = nodes[nodeId];
          if (node?.data?.imageData && node?.data?.backgroundImage) {
            imagesInNodes.push(node.data.backgroundImage);
          }
        });
        
        console.log('📦 Загружена версия:', {
          projectId,
          versionNumber: data.version_number,
          nodesCount: Object.keys(nodes).filter(k => k !== '_images').length,
          edgesCount: data.edges ? data.edges.length : 0,
          imagesFromStorage,
          imagesInNodes: imagesInNodes
        });
      }

      return data;
    } catch (error: any) {
      console.error('GetLatestVersion error:', error);
      return null;
    }
  }

  /**
   * Получение всех версий проекта
   */
  async getProjectVersions(projectId: string): Promise<ProjectVersion[]> {
    try {
      const { data, error } = await supabase
        .from('project_versions')
        .select('*')
        .eq('project_id', projectId)
        .order('version_number', { ascending: false });

      if (error) throw error;

      return data || [];
    } catch (error: any) {
      console.error('GetProjectVersions error:', error);
      return [];
    }
  }

  /**
   * Получение списка существующих slug для проверки уникальности
   */
  private async getExistingSlugs(): Promise<string[]> {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('slug');

      if (error) throw error;

      return data?.map(p => p.slug).filter(Boolean) as string[] || [];
    } catch (error: any) {
      console.error('GetExistingSlugs error:', error);
      return [];
    }
  }

  /**
   * Инкремент счетчика просмотров
   */
  async incrementViewCount(projectId: string, sessionId?: string): Promise<number | null> {
    try {
      const user = await authService.getCurrentUser();
      const clientSessionId = sessionId || (() => {
        const key = 'viewer-session-id';
        let val = localStorage.getItem(key);
        if (!val) {
          val = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
          localStorage.setItem(key, val);
        }
        return val;
      })();

      // Считаем просмотр только для зрителей (не автора проекта)
      let authorId: string | null = null;
      const { data: projMeta } = await supabase
        .from('projects')
        .select('user_id')
        .eq('id', projectId)
        .single();
      authorId = projMeta?.user_id || null;

      if (!authorId) return null;
      if (user?.id && user.id === authorId) {
        // Автор — не записываем просмотр
        return null;
      }

      // Прямо пишем в views; серверный триггер увеличит счётчик в projects
      await supabase.from('views').insert({
        project_id: projectId,
        user_id: user?.id || null,
        session_id: clientSessionId,
        referrer: (typeof document !== 'undefined' ? document.referrer : null) as any,
        user_agent: (typeof navigator !== 'undefined' ? navigator.userAgent : null) as any
      });

      // Читаем актуальный счётчик
      const { data: proj } = await supabase
        .from('projects')
        .select('view_count')
        .eq('id', projectId)
        .single();
      return proj?.view_count ?? null;
    } catch (error: any) {
      console.error('IncrementViewCount error:', error);
      return null;
    }
  }

  /**
   * Получение всех жанров
   */
  async getGenres(): Promise<Genre[]> {
    try {
      const { data, error } = await supabase
        .from('genres')
        .select('*')
        .order('order_index');

      if (error) throw error;

      return data || [];
    } catch (error: any) {
      console.error('GetGenres error:', error);
      return [];
    }
  }

  /**
   * Комментарии (MVP)
   */
  async getComments(projectId: string): Promise<Array<{ id: string; project_id: string; user_id: string; content: string; created_at: string; author?: { id: string; username: string; avatar_url: string | null } }>> {
    try {
      // 1) Забираем комментарии без join'ов
      const { data: comments, error } = await supabase
        .from('comments')
        .select('id, project_id, user_id, content, created_at')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      const list = comments || [];

      if (list.length === 0) return [];

      // 2) Батчом подгружаем профили авторов
      const userIds = Array.from(new Set(list.map((c: any) => c.user_id)));
      const { data: authors } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .in('id', userIds);
      const byId = new Map((authors || []).map(a => [a.id, a]));

      return list.map((c: any) => ({
        ...c,
        author: byId.get(c.user_id) || null
      }));
    } catch (error: any) {
      console.error('GetComments error:', error);
      return [];
    }
  }

  async addComment(projectId: string, content: string, parentId?: string): Promise<{ id: string } | null> {
    try {
      const user = await authService.getCurrentUser();
      if (!user) {
        console.warn('addComment: not authenticated');
        return null;
      }

      const { data, error } = await supabase
        .from('comments')
        .insert({ project_id: projectId, user_id: user.id, parent_id: parentId || null, content })
        .select('id')
        .single();
      if (error) {
        console.error('addComment insert error:', error);
        return null;
      }

      // Опционально инкрементируем локально comment_count (без ожидания)
      await supabase.from('projects').update({ updated_at: new Date().toISOString() }).eq('id', projectId);
      return data as any;
    } catch (error: any) {
      console.error('AddComment error:', error);
      return null;
    }
  }

  async deleteOwnComment(commentId: string): Promise<boolean> {
    try {
      const user = await authService.getCurrentUser();
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('comments')
        .delete()
        .eq('id', commentId)
        .eq('user_id', user.id);
      if (error) throw error;
      return true;
    } catch (error: any) {
      console.error('DeleteComment error:', error);
      return false;
    }
  }

  // Мягкое удаление комментария: разрешаем, если текущий пользователь — автор комментария или автор проекта
  async deleteComment(commentId: string): Promise<boolean> {
    try {
      const user = await authService.getCurrentUser();
      if (!user) throw new Error('Not authenticated');
      // Сначала пробуем удалить как свой
      const own = await this.deleteOwnComment(commentId);
      if (own) return true;

      // Иначе проверяем, автор ли текущий пользователь проекта
      const { data: comment } = await supabase
        .from('comments')
        .select('id, project_id, user_id')
        .eq('id', commentId)
        .single();
      if (!comment) return false;

      const { data: project } = await supabase
        .from('projects')
        .select('user_id')
        .eq('id', comment.project_id)
        .single();

      if (project?.user_id === user.id) {
        const { error } = await supabase
          .from('comments')
          .delete()
          .eq('id', commentId);
        if (error) throw error;
        return true;
      }
      return false;
    } catch (e) {
      console.error('deleteComment error:', e);
      return false;
    }
  }
}

export const projectsService = new ProjectsService();
