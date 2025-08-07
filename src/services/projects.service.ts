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
    projects: ProjectWithRelations[];
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

      // Теперь получаем связанные данные для каждого проекта
      const projectsWithRelations = await Promise.all(
        (projects || []).map(async (project) => {
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

          return {
            ...project,
            author: author || undefined,
            genre: genre || undefined
          };
        })
      );

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

      // Обновляем проект
      const { data: project, error } = await supabase
        .from('projects')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', projectId)
        .eq('user_id', user.id) // Проверка владельца
        .select()
        .single();

      if (error) throw error;

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
   * Загрузка изображений в Storage и получение URL
   */
  private async uploadImagesToStorage(
    projectId: string,
    images: any
  ): Promise<any> {
    console.log(`🔍 uploadImagesToStorage вызван:`, {
      projectId,
      hasImages: !!images,
      imagesCount: images ? Object.keys(images).length : 0
    });
    
    if (!images || Object.keys(images).length === 0) {
      console.log('⚠️ Нет изображений для загрузки в Storage');
      return {};
    }

    console.log(`🚀 Начинаем загрузку ${Object.keys(images).length} изображений в Storage`);
    const imageUrls: any = {};
    
    for (const [imageId, base64Data] of Object.entries(images)) {
      console.log(`🔍 Обработка изображения ${imageId}:`, {
        type: typeof base64Data,
        isString: typeof base64Data === 'string',
        startsWithHttp: typeof base64Data === 'string' && base64Data.startsWith('http'),
        startsWithData: typeof base64Data === 'string' && base64Data.startsWith('data:')
      });
      
      if (typeof base64Data === 'string') {
        // Проверяем, не является ли это уже URL (начинается с http)
        if (base64Data.startsWith('http')) {
          imageUrls[imageId] = base64Data;
          console.log(`⏭️ Изображение ${imageId} уже в Storage`);
          continue;
        }
        
        try {
          // Загружаем base64 в Storage
          const result = await storageService.uploadBase64Image(
            projectId,
            base64Data,
            imageId
          );
          
          if (result.url) {
            imageUrls[imageId] = result.url;
            console.log(`✅ URL получен для ${imageId}: ${result.url}`);
          } else {
            console.error(`❌ Не удалось загрузить ${imageId}: ${result.error}`);
            // Сохраняем base64 как fallback
            imageUrls[imageId] = base64Data;
          }
        } catch (error) {
          console.error(`❌ Ошибка при загрузке ${imageId}:`, error);
          imageUrls[imageId] = base64Data;
        }
      } else {
        console.warn(`⚠️ Изображение ${imageId} не является строкой:`, typeof base64Data);
      }
    }
    
    console.log(`✅ Загружено в Storage: ${Object.keys(imageUrls).filter(k => typeof imageUrls[k] === 'string' && imageUrls[k].startsWith('http')).length} из ${Object.keys(images).length}`);
    return imageUrls;
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

      // Получаем последний номер версии
      const { data: lastVersion } = await supabase
        .from('project_versions')
        .select('version_number')
        .eq('project_id', projectId)
        .order('version_number', { ascending: false })
        .limit(1)
        .single();

      const nextVersionNumber = (lastVersion?.version_number || 0) + 1;

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
      
      console.log('💾 Сохраняем версию:', {
        projectId,
        versionNumber: nextVersionNumber,
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
          }
        });
        
        // Сохраняем URLs для быстрого доступа
        nodesWithImages._imageUrls = imageUrls;
        console.log(`💾 Сохранено ${Object.keys(imageUrls).length} URL изображений`);
      } else {
        console.log('⚠️ Нет изображений для сохранения');
      }

      // Создаем новую версию
      const versionData: ProjectVersionInsert = {
        project_id: projectId,
        version_number: nextVersionNumber,
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

      const { data, error } = await supabase
        .from('project_versions')
        .insert(versionData)
        .select()
        .single();

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

      // Обновляем дату изменения проекта
      await supabase
        .from('projects')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', projectId);

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
  async incrementViewCount(projectId: string, sessionId?: string): Promise<void> {
    try {
      const user = await authService.getCurrentUser();
      
      const { error } = await supabase.rpc('increment_view_count', {
        p_project_id: projectId,
        p_user_id: user?.id || null,
        p_session_id: sessionId || null
      });

      if (error) throw error;
    } catch (error: any) {
      console.error('IncrementViewCount error:', error);
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
}

export const projectsService = new ProjectsService();
