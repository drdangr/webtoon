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
import { ArrowLeft } from 'lucide-react';
import { supabase } from './lib/supabase';
import { getLocalizedGenreName } from './utils/genreTranslations';

// Расширенный интерфейс проекта с дополнительными данными
interface ProjectWithData extends Project {
  nodes?: any;
  edges?: any;
  images?: any;
  author?: Profile;
  genre?: Genre;
  is_liked?: boolean;
}

// Компонент галереи с загрузкой из БД
function Gallery({ 
  currentUser,
  currentProfile,
  onNewProject,
  onEditProject,
  onDeleteProject,
  onLogout,
  onOpenAuthor,
  refreshKey
}: {
  currentUser: User;
  currentProfile: Profile | null;
  onNewProject: () => void;
  onEditProject: (project: ProjectWithData) => void;
  onDeleteProject: (projectId: string) => void;
  onLogout: () => void;
  onOpenAuthor: (username: string) => void;
  refreshKey?: number;
}) {
  const { t, language } = useLanguage();
  const [projects, setProjects] = useState<ProjectWithData[]>([]);
  const [genres, setGenres] = useState<Genre[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'created_at' | 'view_count' | 'like_count'>('created_at');

  useEffect(() => {
    loadData();
  }, [currentUser, selectedGenre, sortBy, refreshKey]);

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

      // Загружаем проекты: свои (любой приватности) + публичные опубликованные
      const [mineRes, publicRes] = await Promise.all([
        projectsService.getProjects({
          userId: currentUser.id,
          genreId: selectedGenre || undefined,
          sortBy
        }),
        projectsService.getProjects({
          isPublic: true,
          genreId: selectedGenre || undefined,
          sortBy
        })
      ]);

      // Объединяем без дублей
      const combinedMap = new Map<string, any>();
      for (const p of mineRes.projects) combinedMap.set(p.id, p);
      for (const p of publicRes.projects) combinedMap.set(p.id, p);
      const projectsData = Array.from(combinedMap.values());
      console.log('📁 Найдено проектов:', projectsData.length);

      // Для галереи не тянем версии и граф — достаточно метаданных проекта (ускорение и меньше таймаутов)
      const projectsWithData = projectsData.map((project: any) => ({
        ...project,
        nodes: {},
        edges: [],
        images: {}
      }));

      // Строгая фильтрация на клиенте: свои или публичные опубликованные
      const visible = projectsWithData.filter((p: any) => (
        p.user_id === currentUser.id || p.is_public
      ));

      // Сортируем объединенный список по выбранному полю (на случай смешения наборов)
      const sorted = [...visible].sort((a: any, b: any) => {
        const aa = a[sortBy] || 0;
        const bb = b[sortBy] || 0;
        return bb - aa;
      });
      setProjects(sorted);
      console.log('✅ Проекты загружены:', sorted.length);
    } catch (error) {
      console.error('❌ Ошибка загрузки данных:', error);
    } finally {
      setLoading(false);
    }
  };

  // Realtime лайки: подписка на изменения в таблице likes и обновление счётчиков
  useEffect(() => {
    if (!projects || projects.length === 0) return;
    // Единый канал для галереи
    const channel = supabase
      .channel('realtime-likes-gallery')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'likes' },
        (payload: any) => {
          const affectedProjectId = (payload.new?.project_id) || (payload.old?.project_id);
          if (!affectedProjectId) return;
          // Обновляем только если проект есть на экране
          const exists = projects.some(p => p.id === affectedProjectId);
          if (!exists) return;
          // Игнорируем собственные события, т.к. у нас уже есть локальный оптимистичный апдейт
          const eventUserId = (payload.new?.user_id) || (payload.old?.user_id);
          if (eventUserId && currentUser && eventUserId === currentUser.id) return;

          setProjects(prev => prev.map(p => {
            if (p.id !== affectedProjectId) return p;
            if (payload.eventType === 'INSERT') {
              return { ...p, like_count: Math.max(0, (p.like_count || 0) + 1) } as any;
            }
            if (payload.eventType === 'DELETE') {
              return { ...p, like_count: Math.max(0, (p.like_count || 0) - 1) } as any;
            }
            return p;
          }));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projects.length, currentUser?.id]);

  // Realtime проекты: обновляем метаданные (название, превью, публичность, счётчики)
  useEffect(() => {
    if (!currentUser) return;
    const channel = supabase
      .channel('realtime-projects-gallery')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'projects' },
        (payload: any) => {
          const projectId = (payload.new?.id) || (payload.old?.id);
          if (!projectId) return;
          setProjects(prev => {
            // Для INSERT: проект может стать видимым, если публичный или наш
            const isOwn = payload.new?.user_id === currentUser.id;
            const isPublic = !!payload.new?.is_public;
            let next = [...prev];
            if (payload.eventType === 'DELETE') {
              next = next.filter(p => p.id !== projectId);
            } else if (payload.eventType === 'INSERT') {
              if (isOwn || isPublic) {
                const exists = next.some(p => p.id === projectId);
                if (!exists) next.push(payload.new);
              }
            } else if (payload.eventType === 'UPDATE') {
              const idx = next.findIndex(p => p.id === projectId);
              if (idx >= 0) {
                next[idx] = { ...next[idx], ...payload.new };
                // если запись стала приватной и не наша — убрать
                const nowOwn = payload.new.user_id === currentUser.id;
                const nowPublic = !!payload.new.is_public;
                if (!nowOwn && !nowPublic) {
                  next.splice(idx, 1);
                }
              } else {
                // если стала публичной — добавить
                const nowOwn = payload.new.user_id === currentUser.id;
                const nowPublic = !!payload.new.is_public;
                if (nowOwn || nowPublic) next.push(payload.new);
              }
            }

            // Пересортировка и фильтр жанра
            const sortField = sortBy;
            const sorted = [...next].sort((a: any, b: any) => (b[sortField] || 0) - (a[sortField] || 0));
            const filtered = selectedGenre ? sorted.filter(p => p.genre_id === selectedGenre) : sorted;
            return filtered as any;
          });
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'projects' },
        (payload: any) => {
          const projectId = payload.new?.id;
          if (!projectId) return;
          setProjects(prev => {
            const isOwn = payload.new?.user_id === currentUser.id;
            const isPublic = !!payload.new?.is_public;
            if (!isOwn && !isPublic) return prev;
            if (prev.some(p => p.id === projectId)) return prev;
            const next = [...prev, payload.new];
            const sorted = [...next].sort((a: any, b: any) => (b[sortBy] || 0) - (a[sortBy] || 0));
            const filtered = selectedGenre ? sorted.filter(p => p.genre_id === selectedGenre) : sorted;
            return filtered as any;
          });
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'projects' },
        (payload: any) => {
          const projectId = payload.old?.id;
          if (!projectId) return;
          setProjects(prev => prev.filter(p => p.id !== projectId));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser?.id, sortBy, selectedGenre]);

  return (
    <div className="min-h-screen bg-[#0b0b0c]">
      {/* Заголовок с информацией о пользователе */}
      <div className="bg-[#0b0b0c] border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-2xl font-bold text-white">{t.gallery.title}</h1>
              <p className="text-sm text-white/60 mt-1">{t.gallery.subtitle}</p>
            </div>
            <div className="flex items-center gap-4">
              <LanguageSwitcher />
              <div className="flex items-center gap-2">
                {currentProfile?.avatar_url && (
                  <img 
                    src={currentProfile.avatar_url} 
                    alt={currentProfile.username}
                    className="w-8 h-8 rounded-full ring-2 ring-white/10"
                  />
                )}
                <span className="text-sm font-medium text-white/80">
                  {currentProfile?.username || currentUser.email}
                </span>
              </div>
              <button
                onClick={onLogout}
                className="px-3 py-1 text-sm text-white/70 hover:text-white bg-white/5 hover:bg-white/10 rounded border border-white/10"
              >
                {t.logout}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Контент галереи */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Панель фильтров */}
        <div className="mb-8 flex flex-col md:flex-row gap-3 items-start md:items-center justify-between">
          {genres.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setSelectedGenre(null)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors border ${!selectedGenre ? 'bg-white text-black border-white' : 'bg-white/5 text-white/80 border-white/10 hover:bg-white/10'}`}
              >
                {t.gallery.allGenres || (language === 'ru' ? 'Все жанры' : language === 'uk' ? 'Усі жанри' : 'All genres')}
              </button>
              {genres.map(genre => (
                <button
                  key={genre.id}
                  onClick={() => setSelectedGenre(genre.id)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors border ${selectedGenre===genre.id ? 'bg-white text-black border-white' : 'bg-white/5 text-white/80 border-white/10 hover:bg-white/10'}`}
                  title={genre.name}
                >
                  <span className="mr-1">{genre.icon}</span>
                  {getLocalizedGenreName(genre.slug || genre.name, language)}
                </button>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            <button onClick={() => setSortBy('created_at')} className={`px-3 py-2 rounded-lg border ${sortBy==='created_at' ? 'bg-white text-black border-white' : 'bg-white/5 text-white/80 border-white/10 hover:bg-white/10'}`}>{t.gallery.sort.newest}</button>
            <button onClick={() => setSortBy('view_count')} className={`px-3 py-2 rounded-lg border ${sortBy==='view_count' ? 'bg-white text-black border-white' : 'bg-white/5 text-white/80 border-white/10 hover:bg-white/10'}`}>{t.gallery.sort.views}</button>
            <button onClick={() => setSortBy('like_count')} className={`px-3 py-2 rounded-lg border ${sortBy==='like_count' ? 'bg-white text-black border-white' : 'bg-white/5 text-white/80 border-white/10 hover:bg-white/10'}`}>{t.gallery.sort.likes}</button>
          </div>
        </div>

        {/* Удален дублирующийся блок фильтра по жанрам */}

        {/* Кнопка создания нового проекта */}
        <button
          onClick={onNewProject}
          className="mb-6 w-full md:w-auto px-6 py-3 bg-white text-black rounded-lg hover:bg-gray-100 transition-colors flex items-center justify-center gap-2 border border-white"
          disabled={loading}
        >
          <span className="text-xl">➕</span>
          <span>{t.gallery.createNew}</span>
        </button>

        {/* Список проектов */}
          {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
          </div>
          ) : projects.length === 0 ? (
          <div className="text-center py-12">
              <p className="text-white/80 text-lg">{t.gallery.empty.title}</p>
              <p className="text-white/50 mt-2">{t.gallery.empty.subtitle}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {projects.map((project) => (
              <div
                key={project.id}
                className="rounded-2xl overflow-hidden bg-white/5 border border-white/10 hover:border-white/20 hover:bg-white/10 transition-colors"
              >
                {/* Превью проекта (кликабельно открывает проект) */}
                <div
                  className="aspect-[4/3] bg-black relative cursor-pointer"
                  onClick={() => {
                    if (project.user_id === currentUser.id) {
                      onEditProject(project);
                    } else {
                      // Оптимистично увеличим просмотры в UI
                      setProjects(prev => prev.map(p => p.id === project.id ? { ...p, view_count: (p.view_count || 0) + 1 } : p));
                      onEditProject(project);
                    }
                  }}
                  role="button"
                  aria-label={`${t.gallery.viewProject}: ${project.title}`}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      if (project.user_id === currentUser.id) {
                        onEditProject(project);
                      } else {
                        setProjects(prev => prev.map(p => p.id === project.id ? { ...p, view_count: (p.view_count || 0) + 1 } : p));
                        onEditProject(project);
                      }
                    }
                  }}
                >
                  {project.thumbnail_url ? (
                    <img
                      src={project.thumbnail_url}
                      alt={project.title}
                      loading="lazy"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full text-white/20">
                      <span className="text-5xl">📚</span>
                    </div>
                  )}
                  {project.genre && (
                    <div className="absolute top-3 left-3 px-2.5 py-1.5 rounded-full text-white text-xs font-medium bg-black/50 border border-white/10">
                      {project.genre.icon} {getLocalizedGenreName(project.genre.slug || project.genre.name, language)}
                    </div>
                  )}
                </div>

                {/* Информация о проекте */}
                <div className="p-4">
                  <h3 className="font-semibold text-white truncate text-lg">{project.title}</h3>
                  <p className="text-sm text-white/70 mt-1 line-clamp-2">
                    {project.description || t.editor.comicDescription}
                  </p>
                  <div className="mt-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {project.author?.avatar_url && (
                        <img src={project.author.avatar_url} alt={project.author.username} className="w-6 h-6 rounded-full ring-1 ring-white/20" />
                      )}
                      <button onClick={() => project.author?.username && onOpenAuthor(project.author.username)} className="text-sm text-white/70 hover:text-white">
                        {project.author?.username}
                      </button>
                    </div>
                    <div className="flex gap-3 text-sm text-white/70">
                      <span>👁 {project.view_count}</span>
                      <span>💬 {project.comment_count || 0}</span>
                      <button
                        onClick={async (e) => {
                          e.preventDefault();
                          try {
                            const { liked, likeCount } = await projectsService.toggleLike(project.id);
                            setProjects(prev => prev.map(p => {
                              if (p.id !== project.id) return p;
                              const fallback = (p.like_count || 0) + (liked ? 1 : -1);
                              const next = typeof likeCount === 'number' ? likeCount : fallback;
                              return { ...p, is_liked: liked, like_count: Math.max(0, next) };
                            }));
                          } catch (err) {
                            console.error(err);
                          }
                        }}
                        className={`hover:text-white transition-colors ${project as any && (project as any).is_liked ? 'text-red-400' : ''}`}
                        title={(project as any)?.is_liked ? 'Убрать лайк' : 'Поставить лайк'}
                      >
                        ❤️ {project.like_count}
                      </button>
                    </div>
                  </div>

                  {/* Действия */}
                  <div className="mt-4 flex gap-2">
                    {project.user_id === currentUser.id ? (
                      <>
                        <button
                          onClick={() => onEditProject(project)}
                          className="flex-1 px-3 py-2 bg-white text-black text-sm rounded-lg hover:bg-gray-100 transition-colors"
                        >
                          {t.gallery.editProject}
                        </button>
                        <button
                          onClick={() => {
                        if (window.confirm(t.gallery.deleteConfirm)) {
                              onDeleteProject(project.id);
                            }
                          }}
                          className="px-3 py-2 bg-white/5 text-white text-sm rounded-lg hover:bg-white/10 transition-colors border border-white/10"
                        >
                          {t.gallery.deleteProject}
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => {
                          // Оптимистично увеличим просмотры в UI
                          setProjects(prev => prev.map(p => p.id === project.id ? { ...p, view_count: (p.view_count || 0) + 1 } : p));
                          onEditProject(project);
                        }}
                        className="flex-1 px-3 py-2 bg-white text-black text-sm rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        {t.gallery.viewProject}
                      </button>
                    )}
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
  const [currentView, setCurrentView] = useState<'gallery' | 'editor' | 'author'>('gallery');
  const [currentProject, setCurrentProject] = useState<ProjectWithData | null>(null);
  const [authorUsername, setAuthorUsername] = useState<string | null>(null);
  const [galleryRefreshKey, setGalleryRefreshKey] = useState(0);
  const saveInProgressRef = React.useRef(false);
  const queuedSaveRef = React.useRef<any | null>(null);
  const [suppressAutoSave, setSuppressAutoSave] = useState(false);

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
        title: t.editor.newComic || 'Новый комикс',
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
    setSuppressAutoSave(false);
    // Увеличиваем счетчик просмотров и синхронизируем UI с БД
    try {
      const newCount = await projectsService.incrementViewCount(project.id);
      // обновление галереи здесь не требуется, список хранится выше; оставляем без setProjects
    } catch (e) {
      console.warn('Не удалось инкрементировать просмотры:', e);
    }
    
      // Загружаем полные данные проекта (проект + последняя версия)
      const fullProject = await projectsService.getProject(project.id);
    if (fullProject) {
      const latestVersion = await projectsService.getLatestVersion(project.id);
      
      // Извлекаем изображения из nodes
      const images: any = {};
        const nodes = latestVersion?.nodes ? JSON.parse(JSON.stringify(latestVersion.nodes)) : {};
      
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
      
      // Также проверяем imageUrl/imageData в узлах и нормализуем поля imageId/backgroundImage
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
          // Нормализация: если нет imageId, подставляем backgroundImage; и наоборот
          if (!node.data.imageId) node.data.imageId = imageId;
          if (!node.data.backgroundImage && node.data.imageId) node.data.backgroundImage = node.data.imageId;
        }
      });

      // 3) Дополняем библиотеку изображений записями из БД, даже если они не используются на графе
      try {
        const dbImages = await storageService.getProjectImages(project.id);
        if (dbImages && dbImages.length > 0) {
          dbImages.forEach((img: any) => {
            const filePath: string = img.file_path || '';
            const fileName: string = img.file_name || '';
            const fileUrl: string = img.file_url || '';
            const baseName = (filePath.split('/').pop() || fileName || '').split('.')[0] || `img_${img.id}`;
            if (!images[baseName]) {
              images[baseName] = {
                id: baseName,
                name: (fileName || baseName).replace(/\.[^/.]+$/, ''),
                src: fileUrl,
                originalName: fileName || `${baseName}.png`
              };
            }
          });
          console.log('📚 Добавлены изображения из БД (включая неиспользуемые):', dbImages.length);
        }
      } catch (e) {
        console.warn('Не удалось загрузить список изображений проекта из БД:', e);
      }
      
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
    // Защита: сохраняем только если текущий пользователь — автор
    if (!session?.user || currentProject.user_id !== session.user.id) {
      console.warn('🚫 Попытка сохранить проект не-автором — изменения проигнорированы');
      return;
    }

    // Антидребезг/очередь сохранений, чтобы не бить БД конкурентными запросами
    if (saveInProgressRef.current && !updatedData.onlyMeta) {
      queuedSaveRef.current = { ...updatedData };
      return;
    }
    saveInProgressRef.current = true;

    // Сначала фиксируем ноды
    const nodesToSave = updatedData.nodes || {};
    // Определяем, какие изображения реально используются на графе
    const usedImages = new Set<string>();
    Object.values(nodesToSave).forEach((node: any) => {
      if (node?.data?.backgroundImage) {
        usedImages.add(node.data.backgroundImage);
      }
    });
    // Преобразуем объекты изображений в base64 строки, фильтруем по использованию
    const rawImages = updatedData.images || {};
    const imagesToSave: any = {};
    Object.entries(rawImages).forEach(([key, value]: [string, any]) => {
      if (!usedImages.has(key)) return; // не загружаем неиспользуемые
      if (typeof value === 'object' && value.src) {
        imagesToSave[key] = value.src;
        console.log(`📸 Извлечен base64 из объекта для ${key}`);
      } else if (typeof value === 'string') {
        imagesToSave[key] = value;
      } else {
        console.warn(`⚠️ Неизвестный формат изображения ${key}:`, typeof value);
      }
    });
    
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
    
    // Выводим информацию об использовании изображений
    console.log(`📊 Использование изображений:`, {
      загружено: Object.keys(imagesToSave).length,
      используется: usedImages.size,
      используемые: Array.from(usedImages)
    });

    try {
      let updatedProject: any = null;
      // Если меняем только метаданные (публикация), не создаём новую версию — быстрый апдейт
      if (updatedData.onlyMeta) {
        updatedProject = await projectsService.updateProject(
          currentProject.id,
          {
            // метаданные проекта без новой версии
            title: typeof updatedData.title !== 'undefined' ? updatedData.title : currentProject.title,
            description: typeof updatedData.description !== 'undefined' ? updatedData.description : currentProject.description,
            thumbnail_url: typeof updatedData.thumbnail === 'string' ? updatedData.thumbnail : currentProject.thumbnail_url,
            is_public: typeof updatedData.isPublic === 'boolean' ? updatedData.isPublic : currentProject.is_public,
            genre_id: typeof updatedData.genre_id !== 'undefined' ? updatedData.genre_id : (currentProject as any)?.genre_id
          }
        );
        // Оптимистичное обновление локального статуса, чтобы UI не залипал
        if (typeof updatedData.isPublic === 'boolean') {
          setCurrentProject(prev => prev ? ({ ...prev, is_public: updatedData.isPublic }) as any : prev);
        }
        // Страховка: если у проекта ещё нет версий, создадим первую версию из текущего состояния
        try {
          const existing = await projectsService.getLatestVersion(currentProject.id);
          if (!existing) {
            await projectsService.saveProjectVersion(
              currentProject.id,
              currentProject.nodes || {},
              (currentProject.edges as any) || [],
              currentProject.images || {}
            );
          }
        } catch (e) {
          console.warn('Не удалось проверить/создать первую версию после мета-обновления:', e);
        }
      } else {
        // Полное сохранение с версией
        if (typeof updatedData.thumbnail === 'string') {
          console.log('[thumbnail] update payload:', {
            thumbnail_url: updatedData.thumbnail
          });
        }
        updatedProject = await projectsService.updateProject(
          currentProject.id,
          {
            title: typeof updatedData.title !== 'undefined' ? updatedData.title : currentProject.title,
            description: typeof updatedData.description !== 'undefined' ? updatedData.description : currentProject.description,
            // Если пришёл пустой string, явно сбрасываем превью; иначе оставляем текущее значение
            // Если новое превью пришло — пишем его; иначе оставляем текущее
            thumbnail_url: typeof updatedData.thumbnail === 'string' ? updatedData.thumbnail : currentProject.thumbnail_url,
            // жанр проекта
            genre_id: typeof updatedData.genre_id !== 'undefined' ? updatedData.genre_id : (currentProject as any)?.genre_id
          },
          {
            nodes: nodesToSave,
            edges: updatedData.edges || [],
            images: imagesToSave
          }
        );
      }

      if (updatedProject) {
        if (typeof updatedData.thumbnail === 'string') {
          console.log('[thumbnail] project updated:', updatedProject.thumbnail_url);
        }
        // После сохранения читаем последнюю версию, чтобы подтянуть URL изображений вместо base64
        // Если меняли превью (meta-only), не трогаем версии, но освежим локальные nodes из БД, чтобы исключить локальный дрейф
        const latest = !updatedData.onlyMeta ? await projectsService.getLatestVersion(currentProject.id) : await projectsService.getLatestVersion(currentProject.id);
        let nextImages = updatedData.images || {};
        let nextNodes = updatedData.nodes || {};
        if (latest?.nodes && latest.nodes._imageUrls) {
          const urlMap = latest.nodes._imageUrls as Record<string, string>;
          // Обновляем локальный пул изображений URL-ами
          nextImages = Object.fromEntries(
            Object.keys(nextImages).map((key) => {
              const existing = nextImages[key];
              const url = urlMap[key];
              if (url) {
                return [key, { ...existing, src: url }];
              }
              return [key, existing];
            })
          );
          // Также вставим URL в ноды (imageUrl)
          nextNodes = JSON.parse(JSON.stringify(nextNodes));
          Object.keys(nextNodes).forEach((nodeId) => {
            const node = nextNodes[nodeId];
            if (node?.data?.backgroundImage) {
              const imgId = node.data.backgroundImage;
              if (urlMap[imgId]) {
                if (!node.data) node.data = {};
                node.data.imageUrl = urlMap[imgId];
                delete node.data.imageData;
              }
            }
          });
        }

        setCurrentProject({
          ...currentProject,
          ...updatedProject,
           nodes: (latest?.nodes ? latest.nodes : (updatedData.onlyMeta ? currentProject.nodes : nextNodes)),
           edges: (latest?.edges ? latest.edges : (updatedData.onlyMeta ? currentProject.edges : (updatedData.edges || []))),
           images: (updatedData.onlyMeta ? currentProject.images : nextImages)
        });

        console.log('✅ Проект успешно сохранен в БД:', updatedProject.id);
      } else {
        console.error('❌ Проект не был обновлен');
      }
    } catch (error) {
      console.error('❌ Ошибка сохранения проекта:', error);
      // Не блокируем пользователя модальными окнами; логируем в консоль
    }
    finally {
      saveInProgressRef.current = false;
      if (queuedSaveRef.current) {
        const next = queuedSaveRef.current;
        queuedSaveRef.current = null;
        // Запускаем следующее сохранение после микро‑паузы
        setTimeout(() => handleSaveProject(next), 50);
      }
    }
  };

  const handleBackToGallery = async () => {
    console.log('🔙 Возвращаемся в галерею');
    setSuppressAutoSave(true); // блокируем новые автосейвы из редактора
    // Даем возможности завершиться текущему/очередному сохранению (до 8 секунд)
    const start = Date.now();
    const MAX_WAIT_MS = 8000;
    while ((saveInProgressRef.current || queuedSaveRef.current) && Date.now() - start < MAX_WAIT_MS) {
      // Если есть отложенное сохранение, запустим его вручную
      if (!saveInProgressRef.current && queuedSaveRef.current) {
        const next = queuedSaveRef.current;
        queuedSaveRef.current = null;
        await new Promise((r) => setTimeout(r, 10));
        await (async () => {
          try {
            await handleSaveProject(next);
          } catch {}
        })();
      }
      await new Promise((r) => setTimeout(r, 50));
    }
    setCurrentProject(null);
    setGalleryRefreshKey(prev => prev + 1);
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
        onOpenAuthor={(username) => { setAuthorUsername(username); setCurrentView('author'); }}
        refreshKey={galleryRefreshKey}
      />
    );
  }

  if (currentView === 'author' && authorUsername) {
    return (
      <AuthorPage username={authorUsername} onBack={() => setCurrentView('gallery')} />
    );
  }

  // Редактор
  return (
    <WebtoonsGraphEditor
      initialProject={currentProject ? ({
        id: currentProject.id,
        title: currentProject.title,
        description: currentProject.description || '',
          thumbnail: currentProject.thumbnail_url || '',
        nodes: currentProject.nodes || {},
        edges: currentProject.edges || [],
        images: currentProject.images || {},
        authorId: currentProject.user_id,
        authorName: currentProject.author?.username || 'Unknown',
        // передаём публикацию и жанр для корректной инициализации
        is_public: (currentProject as any)?.is_public,
        is_published: (currentProject as any)?.is_published,
        genre_id: (currentProject as any)?.genre_id
      } as any) : null}
      currentUser={{
        id: session.user.id,
        username: profile?.username || session.user.email || 'User'
      }}
      isReadOnly={currentProject?.user_id !== session.user.id}
      suppressSave={currentProject?.user_id !== session.user.id || suppressAutoSave}
      initialMode={currentProject?.user_id !== session.user.id ? 'viewer' : 'constructor'}
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

// Страница автора (минимальная версия)
function AuthorPage({ username, onBack }: { username: string; onBack: () => void }) {
  const { t } = useLanguage();
  const [loading, setLoading] = React.useState(true);
  const [author, setAuthor] = React.useState<Profile | null>(null);
  const [projects, setProjects] = React.useState<any[]>([]);
  const [currentUserId, setCurrentUserId] = React.useState<string | null>(null);

  React.useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        // Находим профиль автора
        const { data: profiles } = await supabase
          .from('profiles')
          .select('*')
          .eq('username', username)
          .limit(1);
        const profile = profiles && profiles[0];
        setAuthor(profile || null);

        if (profile) {
          // Загружаем публичные опубликованные проекты автора
          const { projects: authorProjects } = await projectsService.getProjects({
            userId: profile.id,
            isPublic: true,
            isPublished: true,
            sortBy: 'created_at'
          });
          setProjects(authorProjects);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [username]);

  // Текущий пользователь (для фильтрации собственных событий в realtime)
  React.useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setCurrentUserId(data.user?.id || null);
    }).catch(() => setCurrentUserId(null));
  }, []);

  // Realtime лайки для страницы автора
  React.useEffect(() => {
    if (!projects || projects.length === 0) return;
    const channel = supabase
      .channel('realtime-likes-author')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'likes' },
        (payload: any) => {
          const affectedProjectId = (payload.new?.project_id) || (payload.old?.project_id);
          if (!affectedProjectId) return;
          const exists = projects.some(p => p.id === affectedProjectId);
          if (!exists) return;
          const eventUserId = (payload.new?.user_id) || (payload.old?.user_id);
          if (eventUserId && currentUserId && eventUserId === currentUserId) return;

          setProjects(prev => prev.map(p => {
            if (p.id !== affectedProjectId) return p;
            if (payload.eventType === 'INSERT') {
              return { ...p, like_count: Math.max(0, (p.like_count || 0) + 1) };
            }
            if (payload.eventType === 'DELETE') {
              return { ...p, like_count: Math.max(0, (p.like_count || 0) - 1) };
            }
            return p;
          }));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projects.length, currentUserId]);

  return (
    <div className="min-h-screen bg-[#0b0b0c]">
      <div className="max-w-6xl mx-auto px-4 py-6">
        <button onClick={onBack} className="text-white/80 hover:text-white flex items-center gap-2">
          <ArrowLeft size={16} /> {t.back}
        </button>

        <div className="mt-6 flex items-center gap-4">
          {author?.avatar_url && <img src={author.avatar_url} className="w-16 h-16 rounded-full ring-2 ring-white/10" />}
          <div>
            <h1 className="text-2xl font-bold text-white">{author?.username || username}</h1>
            <div className="text-white/60 text-sm">
              Комиксов: {author?.total_projects ?? 0} • Просмотров: {author?.total_views ?? 0} • Лайков: {author?.total_likes ?? 0}
            </div>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            <div className="text-white/60">Загрузка...</div>
          ) : (
            projects.map((p) => (
              <div key={p.id} className="rounded-2xl overflow-hidden bg-white/5 border border-white/10">
                <div className="aspect-[4/3] bg-black">
                  {p.thumbnail_url ? (
                    <img src={p.thumbnail_url} alt={p.title} className="w-full h-full object-cover" loading="lazy" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white/20">📚</div>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="text-white font-semibold truncate">{p.title}</h3>
                  <div className="mt-2 flex gap-4 text-white/70 text-sm">
                    <span>👁 {p.view_count}</span>
                    <span>❤️ {p.like_count}</span>
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
