import React, { useState, useEffect } from 'react';
import { Session, User } from '@supabase/supabase-js';
import WebtoonsGraphEditor from './WebtoonsGraphEditor';
import { LanguageProvider, useLanguage, LanguageSwitcher } from './LanguageContext';
import { TestSupabase } from './components/TestSupabase';
import { SupabaseAuth } from './components/SupabaseAuth';
import { authService } from './services/auth.service';
import { projectsService } from './services/projects.service';
import { storageService } from './services/storage.service';
import type { Profile, Project, Genre } from './lib/database.types';

// Расширенный интерфейс проекта с дополнительными данными
interface ProjectWithData extends Project {
  nodes?: any;
  edges?: any;
  images?: any;
  author?: Profile;
  genre?: Genre;
}

// Компонент галереи с загрузкой из БД
function Gallery({ 
  currentUser,
  currentProfile,
  onNewProject,
  onEditProject,
  onDeleteProject,
  onLogout,
  refreshKey
}: {
  currentUser: User;
  currentProfile: Profile | null;
  onNewProject: () => void;
  onEditProject: (project: ProjectWithData) => void;
  onDeleteProject: (projectId: string) => void;
  onLogout: () => void;
  refreshKey?: number;
}) {
  const { t } = useLanguage();
  const [projects, setProjects] = useState<ProjectWithData[]>([]);
  const [genres, setGenres] = useState<Genre[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [currentUser, selectedGenre, refreshKey]);

  const loadData = async () => {
    setLoading(true);
    console.log('📂 Загружаем данные для пользователя:', currentUser.id);
    
    try {
      // Загружаем жанры
      if (genres.length === 0) {
        const genresData = await projectsService.getGenres();
        console.log('📚 Загружено жанров:', genresData.length);
        setGenres(genresData);
      }

      // Загружаем проекты пользователя
      const { projects: projectsData, total } = await projectsService.getProjects({
        userId: currentUser.id,
        genreId: selectedGenre || undefined
      });
      
      console.log('📁 Найдено проектов:', total);

      // Для каждого проекта загружаем последнюю версию
      const projectsWithData = await Promise.all(
        projectsData.map(async (project: any) => {
          const latestVersion = await projectsService.getLatestVersion(project.id);
          
          // Извлекаем изображения из nodes (для галереи нужны только URL/base64 строки)
          const images: any = {};
          const nodes = latestVersion?.nodes || {};
          
          // Проверяем новый формат с URL (_imageUrls)
          if (nodes._imageUrls) {
            Object.assign(images, nodes._imageUrls);
            delete nodes._imageUrls;
          }
          // Fallback на старый формат (_images)
          else if (nodes._images) {
            Object.entries(nodes._images).forEach(([key, value]: [string, any]) => {
              // Если это объект с src, извлекаем строку
              if (typeof value === 'object' && value.src) {
                images[key] = value.src;
              } else {
                images[key] = value;
              }
            });
            delete nodes._images;
          }
          
          // Также проверяем imageUrl/imageData в узлах
          Object.keys(nodes).forEach(nodeId => {
            const node = nodes[nodeId];
            if (node?.data?.backgroundImage) {
              if (node.data.imageUrl) {
                images[node.data.backgroundImage] = node.data.imageUrl;
              } else if (node.data.imageData) {
                images[node.data.backgroundImage] = node.data.imageData;
              }
            }
          });
          
          console.log(`📄 Проект ${project.title}:`, {
            id: project.id,
            hasVersion: !!latestVersion,
            nodesCount: Object.keys(nodes).filter(k => k !== '_images').length,
            nodeIds: Object.keys(nodes).filter(k => k !== '_images'),
            edgesCount: latestVersion ? (latestVersion.edges || []).length : 0,
            imagesCount: Object.keys(images).length,
            imageIds: Object.keys(images)
          });
          
          return {
            ...project,
            nodes: nodes,
            edges: latestVersion?.edges || [],
            images: images
          };
        })
      );

      setProjects(projectsWithData);
      console.log('✅ Проекты загружены:', projectsWithData.length);
    } catch (error) {
      console.error('❌ Ошибка загрузки данных:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Заголовок с информацией о пользователе */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{t.gallery.title}</h1>
              <p className="text-sm text-gray-600 mt-1">{t.gallery.subtitle}</p>
            </div>
            <div className="flex items-center gap-4">
              <LanguageSwitcher />
              <div className="flex items-center gap-2">
                {currentProfile?.avatar_url && (
                  <img 
                    src={currentProfile.avatar_url} 
                    alt={currentProfile.username}
                    className="w-8 h-8 rounded-full"
                  />
                )}
                <span className="text-sm font-medium text-gray-700">
                  {currentProfile?.username || currentUser.email}
                </span>
              </div>
              <button
                onClick={onLogout}
                className="px-3 py-1 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded"
              >
                {t.logout}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Контент галереи */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Уведомление об успешной миграции */}
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-green-800">
            ✅ <strong>Миграция завершена:</strong> Все данные теперь сохраняются в облачной базе данных Supabase!
            Ваши проекты доступны с любого устройства.
          </p>
        </div>

        {/* Фильтр по жанрам */}
        {genres.length > 0 && (
          <div className="mb-6 flex gap-2 flex-wrap">
            <button
              onClick={() => setSelectedGenre(null)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                !selectedGenre 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Все жанры
            </button>
            {genres.map(genre => (
              <button
                key={genre.id}
                onClick={() => setSelectedGenre(genre.id)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors flex items-center gap-1 ${
                  selectedGenre === genre.id
                    ? 'text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
                style={{
                  backgroundColor: selectedGenre === genre.id ? genre.color : undefined
                }}
              >
                <span>{genre.icon}</span>
                <span>{genre.name}</span>
              </button>
            ))}
          </div>
        )}

        {/* Кнопка создания нового проекта */}
        <button
          onClick={onNewProject}
          className="mb-6 w-full md:w-auto px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
          disabled={loading}
        >
          <span className="text-xl">➕</span>
          <span>{t.gallery.createNew}</span>
        </button>

        {/* Список проектов */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">{t.gallery.noProjects}</p>
            <p className="text-gray-400 mt-2">{t.gallery.createFirst}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {projects.map((project) => (
              <div
                key={project.id}
                className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow overflow-hidden"
              >
                {/* Превью проекта */}
                <div className="aspect-video bg-gray-200 relative">
                  {project.thumbnail_url ? (
                    <img
                      src={project.thumbnail_url}
                      alt={project.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-400">
                      <span className="text-4xl">📚</span>
                    </div>
                  )}
                  {project.genre && (
                    <div 
                      className="absolute top-2 left-2 px-2 py-1 rounded text-white text-xs font-medium"
                      style={{ backgroundColor: project.genre.color }}
                    >
                      {project.genre.icon} {project.genre.name}
                    </div>
                  )}
                </div>

                {/* Информация о проекте */}
                <div className="p-4">
                  <h3 className="font-semibold text-gray-900 truncate">{project.title}</h3>
                  <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                    {project.description || t.gallery.noDescription}
                  </p>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-xs text-gray-500">
                      {t.gallery.modified}: {new Date(project.updated_at).toLocaleDateString()}
                    </span>
                    <div className="flex gap-2 text-xs text-gray-500">
                      <span>👁 {project.view_count}</span>
                      <span>❤️ {project.like_count}</span>
                    </div>
                  </div>

                  {/* Действия */}
                  <div className="mt-4 flex gap-2">
                    <button
                      onClick={() => onEditProject(project)}
                      className="flex-1 px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
                    >
                      {t.gallery.editProject}
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm(t.gallery.confirmDelete)) {
                          onDeleteProject(project.id);
                        }
                      }}
                      className="px-3 py-1.5 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors"
                    >
                      {t.gallery.deleteProject}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Основной компонент приложения с полной интеграцией Supabase
function AppContent() {
  const { t } = useLanguage();
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState<'gallery' | 'editor'>('gallery');
  const [currentProject, setCurrentProject] = useState<ProjectWithData | null>(null);
  const [galleryRefreshKey, setGalleryRefreshKey] = useState(0);

  // Подписка на изменения состояния авторизации
  useEffect(() => {
    // Получаем текущую сессию
    authService.getSession().then(session => {
      setSession(session);
      if (session?.user) {
        loadProfile(session.user);
      }
      setLoading(false);
    });

    // Подписываемся на изменения
    const {
      data: { subscription },
    } = authService.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) {
        loadProfile(session.user);
      } else {
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Загрузка профиля пользователя
  const loadProfile = async (user: User) => {
    const userProfile = await authService.ensureProfile(user);
    setProfile(userProfile);
  };

  // Обработчики для проектов
  const handleNewProject = async () => {
    if (!session?.user || !profile) {
      console.error('❌ Нет авторизации для создания проекта');
      return;
    }

    console.log('🆕 Создаем новый проект для пользователя:', session.user.id);

    try {
      // Получаем первый жанр по умолчанию
      const genres = await projectsService.getGenres();
      const defaultGenre = genres[0];
      console.log('📚 Жанр по умолчанию:', defaultGenre?.name);

      // Создаем новый проект в БД
      const newProject = await projectsService.createProject({
        title: t.editor.newProjectTitle || 'Новый комикс',
        description: t.editor.comicDescription || '',
        genre_id: defaultGenre?.id,
        nodes: {},
        edges: [],
        images: {},
        is_public: false,
        is_published: false
      });

      console.log('✅ Проект создан:', newProject?.id);

      if (newProject) {
        setCurrentProject({
          ...newProject,
          nodes: {},
          edges: [],
          images: {},
          author: profile,
          genre: defaultGenre
        });
        setCurrentView('editor');
      } else {
        console.error('❌ Проект не был создан');
      }
    } catch (error) {
      console.error('❌ Ошибка создания проекта:', error);
      alert('Ошибка создания проекта: ' + (error as any).message);
    }
  };

  const handleEditProject = async (project: ProjectWithData) => {
    console.log('📝 Открываем проект для редактирования:', project.id);
    
    // Загружаем полные данные проекта
    const fullProject = await projectsService.getProject(project.id);
    if (fullProject) {
      const latestVersion = await projectsService.getLatestVersion(project.id);
      
      // Извлекаем изображения из nodes
      const images: any = {};
      const nodes = latestVersion?.nodes || {};
      
      // Проверяем новый формат с URL (_imageUrls)
      if (nodes._imageUrls) {
        Object.entries(nodes._imageUrls).forEach(([key, url]: [string, any]) => {
          // Создаем объект изображения для редактора
          images[key] = {
            id: key,
            name: key,
            src: url,
            originalName: 'image.png'
          };
        });
        delete nodes._imageUrls;
        console.log('📸 Загружено URL изображений из _imageUrls:', Object.keys(images).length);
      }
      // Fallback на старый формат (_images)
      else if (nodes._images) {
        Object.entries(nodes._images).forEach(([key, data]: [string, any]) => {
          if (typeof data === 'string') {
            images[key] = {
              id: key,
              name: key,
              src: data,
              originalName: 'image.png'
            };
          } else {
            images[key] = data;
          }
        });
        delete nodes._images;
        console.log('📸 Загружено изображений из _images (старый формат):', Object.keys(images).length);
      }
      
      // Также проверяем imageUrl/imageData в узлах
      Object.keys(nodes).forEach(nodeId => {
        const node = nodes[nodeId];
        if (node?.data?.backgroundImage) {
          const imageId = node.data.backgroundImage;
          // Приоритет URL над base64
          if (node.data.imageUrl && !images[imageId]) {
            images[imageId] = {
              id: imageId,
              name: imageId,
              src: node.data.imageUrl,
              originalName: 'image.png'
            };
            console.log(`📸 URL изображения ${imageId} из узла ${nodeId}`);
          } else if (node.data.imageData && !images[imageId]) {
            images[imageId] = {
              id: imageId,
              name: imageId,
              src: node.data.imageData,
              originalName: 'image.png'
            };
            console.log(`📸 Base64 изображение ${imageId} из узла ${nodeId} (старый формат)`);
          }
        }
      });
      
      console.log('📸 Результат загрузки проекта:', {
        projectId: project.id,
        imagesCount: Object.keys(images).length,
        imageIds: Object.keys(images),
        nodesCount: Object.keys(nodes).filter(k => k !== '_images').length,
        nodeIds: Object.keys(nodes).filter(k => k !== '_images')
      });
      
      // Детальная проверка каждого узла
      Object.keys(nodes).forEach(nodeId => {
        if (nodeId === '_images' || nodeId === '_imageUrls') return;
        const node = nodes[nodeId];
        console.log(`  Узел ${nodeId}:`, {
          hasBackgroundImage: !!node?.data?.backgroundImage,
          hasImageUrl: !!node?.data?.imageUrl,
          hasImageData: !!node?.data?.imageData,
          imageId: node?.data?.backgroundImage,
          imageType: node?.data?.imageUrl ? 'URL' : node?.data?.imageData ? 'base64' : 'none',
          imageExtracted: node?.data?.backgroundImage ? !!images[node.data.backgroundImage] : false
        });
      });
      
      setCurrentProject({
        ...fullProject,
        nodes: nodes,
        edges: latestVersion?.edges || [],
        images: images
      });
      setCurrentView('editor');
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    console.log('🗑️ Удаляем проект:', projectId);
    const success = await projectsService.deleteProject(projectId);
    if (success) {
      console.log('✅ Проект удален');
      // Обновляем галерею
      setGalleryRefreshKey(prev => prev + 1); // Триггерим перезагрузку галереи
      setCurrentView('gallery');
    } else {
      alert('Ошибка удаления проекта');
    }
  };

  const handleSaveProject = async (updatedData: any) => {
    if (!currentProject) {
      console.error('❌ Нет текущего проекта для сохранения');
      return;
    }

    // Преобразуем объекты изображений в base64 строки
    const rawImages = updatedData.images || {};
    const imagesToSave: any = {};
    
    Object.entries(rawImages).forEach(([key, value]: [string, any]) => {
      if (typeof value === 'object' && value.src) {
        // Если это объект с полем src, извлекаем base64
        imagesToSave[key] = value.src;
        console.log(`📸 Извлечен base64 из объекта для ${key}`);
      } else if (typeof value === 'string') {
        // Если уже строка, используем как есть
        imagesToSave[key] = value;
      } else {
        console.warn(`⚠️ Неизвестный формат изображения ${key}:`, typeof value);
      }
    });
    
    const nodesToSave = updatedData.nodes || {};
    
    console.log('📝 Сохраняем проект:', {
      id: currentProject.id,
      title: updatedData.title || currentProject.title,
      hasNodes: !!updatedData.nodes,
      nodesCount: Object.keys(nodesToSave).length,
      nodeIds: Object.keys(nodesToSave),
      hasEdges: !!updatedData.edges,
      edgesCount: (updatedData.edges || []).length,
      hasImages: !!updatedData.images,
      imagesCount: Object.keys(imagesToSave).length,
      imageIds: Object.keys(imagesToSave),
      imageFormats: Object.entries(rawImages).map(([k, v]) => `${k}: ${typeof v}`)
    });
    
    // Проверяем, какие изображения используются в узлах
    const usedImages = new Set<string>();
    Object.values(nodesToSave).forEach((node: any) => {
      if (node?.data?.backgroundImage) {
        usedImages.add(node.data.backgroundImage);
      }
    });
    
    // Выводим информацию об использовании изображений
    console.log(`📊 Использование изображений:`, {
      загружено: Object.keys(imagesToSave).length,
      используется: usedImages.size,
      используемые: Array.from(usedImages)
    });

    try {
      // Обновляем проект в БД
      const updatedProject = await projectsService.updateProject(
        currentProject.id,
        {
          title: updatedData.title || currentProject.title,
          description: updatedData.description || currentProject.description,
          thumbnail_url: updatedData.thumbnail || currentProject.thumbnail_url
        },
        {
          nodes: updatedData.nodes || {},
          edges: updatedData.edges || [],
          images: updatedData.images || {}
        }
      );

      if (updatedProject) {
        setCurrentProject({
          ...currentProject,
          ...updatedProject,
          nodes: updatedData.nodes || {},
          edges: updatedData.edges || [],
          images: updatedData.images || {}
        });
        
        console.log('✅ Проект успешно сохранен в БД:', updatedProject.id);
      } else {
        console.error('❌ Проект не был обновлен');
      }
    } catch (error) {
      console.error('❌ Ошибка сохранения проекта:', error);
      alert('Ошибка сохранения проекта: ' + (error as any).message);
    }
  };

  const handleBackToGallery = () => {
    console.log('🔙 Возвращаемся в галерею');
    setCurrentProject(null);
    setGalleryRefreshKey(prev => prev + 1); // Триггерим перезагрузку галереи
    setCurrentView('gallery');
  };

  const handleLogout = async () => {
    await authService.signOut();
    setSession(null);
    setProfile(null);
    setCurrentView('gallery');
  };

  // ВРЕМЕННО: Тестирование подключения к Supabase
  const testSupabase = false;
  if (testSupabase) {
    return <TestSupabase />;
  }

  // Показываем загрузку
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">{t.loading}</p>
        </div>
      </div>
    );
  }

  // Проверка авторизации
  if (!session) {
    return <SupabaseAuth onSuccess={() => {
      // Обновление произойдет автоматически через подписку
    }} />;
  }

  // Отображение галереи или редактора
  if (currentView === 'gallery') {
    return (
      <Gallery
        currentUser={session.user}
        currentProfile={profile}
        onNewProject={handleNewProject}
        onEditProject={handleEditProject}
        onDeleteProject={handleDeleteProject}
        onLogout={handleLogout}
        refreshKey={galleryRefreshKey}
      />
    );
  }

  // Редактор
  return (
    <WebtoonsGraphEditor
      initialProject={currentProject ? {
        id: currentProject.id,
        title: currentProject.title,
        description: currentProject.description || '',
        nodes: currentProject.nodes || {},
        edges: currentProject.edges || [],
        images: currentProject.images || {},
        authorId: currentProject.user_id,
        authorName: currentProject.author?.username || 'Unknown'
      } : null}
      currentUser={{
        id: session.user.id,
        username: profile?.username || session.user.email || 'User'
      }}
      isReadOnly={currentProject?.user_id !== session.user.id}
      onSaveProject={handleSaveProject}
      onBackToGallery={handleBackToGallery}
    />
  );
}

// Экспортируемый компонент с провайдером языка
export default function AppSupabaseDB() {
  return (
    <LanguageProvider>
      <AppContent />
    </LanguageProvider>
  );
}
