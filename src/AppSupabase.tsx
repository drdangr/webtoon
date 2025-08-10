import React, { useState, useEffect } from 'react';
import { Session, User } from '@supabase/supabase-js';
import WebtoonsGraphEditor from './WebtoonsGraphEditor';
import { LanguageProvider, useLanguage, LanguageSwitcher } from './LanguageContext';
import { TestSupabase } from './components/TestSupabase';
import { SupabaseAuth } from './components/SupabaseAuth';
import { authService } from './services/auth.service';
import { projectsService } from './services/projects.service';
import { storageService } from './services/storage.service';
import type { Profile, Project } from './lib/database.types';

// Временный интерфейс для проекта (пока используем localStorage)
interface LocalProject {
  id: string;
  title: string;
  description: string;
  createdDate: string;
  modifiedDate: string;
  thumbnail?: string;
  nodes: any;
  edges: any;
  images: any;
  authorId: string;
  authorName: string;
}

// Компонент галереи (временно с localStorage, потом мигрируем)
function Gallery({ 
  projects, 
  currentUser,
  currentProfile,
  onNewProject,
  onEditProject,
  onDeleteProject,
  onLogout
}: {
  projects: LocalProject[];
  currentUser: User;
  currentProfile: Profile | null;
  onNewProject: () => void;
  onEditProject: (project: LocalProject) => void;
  onDeleteProject: (projectId: string) => void;
  onLogout: () => void;
}) {
  const { t } = useLanguage();

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
        {/* Уведомление о миграции */}
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-blue-800">
            ℹ️ <strong>Миграция в процессе:</strong> Аутентификация работает через Supabase. 
            Проекты пока сохраняются локально. Скоро будет полная миграция на БД.
          </p>
        </div>

        {/* Кнопка создания нового проекта */}
        <button
          onClick={onNewProject}
          className="mb-6 w-full md:w-auto px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
        >
          <span className="text-xl">➕</span>
          <span>{t.gallery.createNew}</span>
        </button>

        {/* Список проектов */}
        {projects.length === 0 ? (
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
                {/* Превью проекта (кликабельно) */}
                <div
                  className="aspect-video bg-gray-200 relative cursor-pointer"
                  onClick={() => onEditProject(project)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onEditProject(project); } }}
                  aria-label={`${t.gallery.viewProject}: ${project.title}`}
                >
                  {project.thumbnail ? (
                    <img
                      src={project.thumbnail}
                      alt={project.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-400">
                      <span className="text-4xl">📚</span>
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
                      {t.gallery.modified}: {new Date(project.modifiedDate).toLocaleDateString()}
                    </span>
                  </div>

                  {/* Действия */}
                  <div className="mt-4 flex gap-2">
                    {project.authorId === currentUser.id ? (
                      <>
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
                      </>
                    ) : (
                      <button
                        onClick={() => onEditProject(project)}
                        className="flex-1 px-3 py-1.5 bg-gray-600 text-white text-sm rounded hover:bg-gray-700 transition-colors"
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

// Основной компонент приложения с Supabase
function AppContent() {
  const { t } = useLanguage();
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState<'gallery' | 'editor'>('gallery');
  const [currentProject, setCurrentProject] = useState<LocalProject | null>(null);
  const [projects, setProjects] = useState<LocalProject[]>([]);

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

  // Загрузка проектов из localStorage (временно, потом мигрируем на Supabase)
  useEffect(() => {
    if (session?.user) {
      loadLocalProjects();
    }
  }, [session]);

  const loadLocalProjects = () => {
    const savedProjects = localStorage.getItem('webtoon-projects');
    if (savedProjects) {
      try {
        const allProjects = JSON.parse(savedProjects);
        // Фильтруем проекты текущего пользователя (временно, пока используем localStorage)
        const userProjects = allProjects.filter((p: LocalProject) => 
          p.authorId === session?.user.id
        );
        setProjects(userProjects);
      } catch (error) {
        console.error('Error loading projects:', error);
        setProjects([]);
      }
    }
  };

  const saveLocalProjects = (updatedProjects: LocalProject[]) => {
    // Сохраняем в localStorage (временно)
    const allProjects = JSON.parse(localStorage.getItem('webtoon-projects') || '[]');
    const otherProjects = allProjects.filter((p: LocalProject) => 
      p.authorId !== session?.user.id
    );
    const mergedProjects = [...otherProjects, ...updatedProjects];
    localStorage.setItem('webtoon-projects', JSON.stringify(mergedProjects));
    setProjects(updatedProjects);
  };

  // Обработчики для проектов
  const handleNewProject = () => {
    if (!session?.user || !profile) return;

    const newProject: LocalProject = {
      id: `project_${Date.now()}`,
      title: t.editor.newProjectTitle,
      description: '',
      createdDate: new Date().toISOString(),
      modifiedDate: new Date().toISOString(),
      nodes: {},
      edges: [],
      images: {},
      authorId: session.user.id,
      authorName: profile.username || session.user.email || 'Unknown'
    };

    setCurrentProject(newProject);
    setCurrentView('editor');
  };

  const handleEditProject = (project: LocalProject) => {
    setCurrentProject(project);
    setCurrentView('editor');
  };

  const handleDeleteProject = (projectId: string) => {
    const updatedProjects = projects.filter(p => p.id !== projectId);
    saveLocalProjects(updatedProjects);
  };

  const handleSaveProject = (updatedData: any) => {
    if (!currentProject) return;

    const updatedProject = {
      ...currentProject,
      ...updatedData,
      modifiedDate: new Date().toISOString()
    };

    const updatedProjects = projects.some(p => p.id === currentProject.id)
      ? projects.map(p => p.id === currentProject.id ? updatedProject : p)
      : [...projects, updatedProject];

    saveLocalProjects(updatedProjects);
    setCurrentProject(updatedProject);
  };

  const handleBackToGallery = () => {
    setCurrentView('gallery');
    setCurrentProject(null);
  };

  const handleLogout = async () => {
    await authService.signOut();
    setSession(null);
    setProfile(null);
    setProjects([]);
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
        projects={projects}
        currentUser={session.user}
        currentProfile={profile}
        onNewProject={handleNewProject}
        onEditProject={handleEditProject}
        onDeleteProject={handleDeleteProject}
        onLogout={handleLogout}
      />
    );
  }

  // Редактор
  return (
    <WebtoonsGraphEditor
      initialProject={currentProject}
      currentUser={{
        id: session.user.id,
        username: profile?.username || session.user.email || 'User'
      }}
      isReadOnly={currentProject?.authorId !== session.user.id}
      onSaveProject={handleSaveProject}
      onBackToGallery={handleBackToGallery}
    />
  );
}

// Экспортируемый компонент с провайдером языка
export default function AppSupabase() {
  return (
    <LanguageProvider>
      <AppContent />
    </LanguageProvider>
  );
}
