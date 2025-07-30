import React, { useState, useEffect } from 'react';
import WebtoonsGraphEditor from './WebtoonsGraphEditor';

// Интерфейс проекта
interface Project {
  id: string;
  title: string;
  description: string;
  createdDate: string;
  modifiedDate: string;
  thumbnail?: string; // base64 изображение превью
  nodes: any; // данные графа
  edges: any; // связи графа
  images: any; // изображения проекта
}

// Компонент галереи
function Gallery({ projects, onNewProject, onEditProject, onDeleteProject }: {
  projects: Project[];
  onNewProject: () => void;
  onEditProject: (project: Project) => void;
  onDeleteProject: (id: string) => void;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        {/* Заголовок */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-4">
            🎨 Галерея веб-комиксов
          </h1>
          <p className="text-lg text-gray-600 mb-6">
            Создавайте и управляйте своими интерактивными комиксами
          </p>
          <button
            onClick={onNewProject}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
          >
            ➕ Создать новый комикс
          </button>
        </div>

        {/* Сетка проектов */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {projects.map((project) => (
            <div
              key={project.id}
              className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-4"
            >
              {/* Превью */}
              <div className="w-full h-40 bg-gray-200 rounded-lg mb-3 flex items-center justify-center">
                {project.thumbnail ? (
                  <img
                    src={project.thumbnail}
                    alt={project.title}
                    className="w-full h-full object-cover rounded-lg"
                  />
                ) : (
                  <div className="text-gray-400 text-sm">Нет превью</div>
                )}
              </div>

              {/* Информация о проекте */}
              <h3 className="font-semibold text-gray-800 mb-1 truncate">
                {project.title}
              </h3>
              <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                {project.description}
              </p>
              <p className="text-xs text-gray-500 mb-3">
                Изменен: {new Date(project.modifiedDate).toLocaleDateString()}
              </p>

              {/* Действия */}
              <div className="flex gap-2">
                <button
                  onClick={() => onEditProject(project)}
                  className="flex-1 px-3 py-1 bg-blue-100 text-blue-700 rounded text-sm hover:bg-blue-200 transition-colors"
                >
                  Редактировать
                </button>
                <button
                  onClick={() => onDeleteProject(project.id)}
                  className="px-3 py-1 bg-red-100 text-red-700 rounded text-sm hover:bg-red-200 transition-colors"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Пустое состояние */}
        {projects.length === 0 && (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">🎭</div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">
              Пока нет комиксов
            </h3>
            <p className="text-gray-500 mb-6">
              Создайте свой первый интерактивный комикс!
            </p>
            <button
              onClick={onNewProject}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
            >
              Начать создание
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function App() {
  const [currentView, setCurrentView] = useState<'gallery' | 'editor'>('gallery');
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);

  // Загрузка проектов из localStorage при старте
  useEffect(() => {
    const savedProjects = localStorage.getItem('webtoon-projects');
    if (savedProjects) {
      try {
        setProjects(JSON.parse(savedProjects));
      } catch (error) {
        console.error('Ошибка загрузки проектов:', error);
      }
    }
  }, []);

  // Сохранение проектов в localStorage
  const saveProjects = (updatedProjects: Project[]) => {
    setProjects(updatedProjects);
    localStorage.setItem('webtoon-projects', JSON.stringify(updatedProjects));
  };

  // Создание нового проекта
  const handleNewProject = () => {
    const newProject: Project = {
      id: `project-${Date.now()}`,
      title: 'Новый комикс',
      description: 'Описание комикса',
      createdDate: new Date().toISOString(),
      modifiedDate: new Date().toISOString(),
      nodes: {},
      edges: {},
      images: {}
    };
    
    setCurrentProject(newProject);
    setCurrentView('editor');
  };

  // Редактирование проекта
  const handleEditProject = (project: Project) => {
    setCurrentProject(project);
    setCurrentView('editor');
  };

  // Удаление проекта
  const handleDeleteProject = (id: string) => {
    if (confirm('Вы уверены, что хотите удалить этот проект?')) {
      const updatedProjects = projects.filter(p => p.id !== id);
      saveProjects(updatedProjects);
    }
  };

  // Сохранение изменений проекта из редактора
  const handleSaveProject = (projectData: { nodes: any; edges: any; images: any; title?: string; description?: string }) => {
    if (!currentProject) return;

    const updatedProject: Project = {
      ...currentProject,
      ...projectData,
      modifiedDate: new Date().toISOString()
    };

    const existingIndex = projects.findIndex(p => p.id === currentProject.id);
    let updatedProjects: Project[];

    if (existingIndex >= 0) {
      // Обновляем существующий проект
      updatedProjects = [...projects];
      updatedProjects[existingIndex] = updatedProject;
    } else {
      // Добавляем новый проект
      updatedProjects = [...projects, updatedProject];
    }

    saveProjects(updatedProjects);
    setCurrentProject(updatedProject);
  };

  // Возврат в галерею
  const handleBackToGallery = () => {
    setCurrentView('gallery');
    setCurrentProject(null);
  };

  if (currentView === 'gallery') {
    return (
      <Gallery
        projects={projects}
        onNewProject={handleNewProject}
        onEditProject={handleEditProject}
        onDeleteProject={handleDeleteProject}
      />
    );
  }

  return (
    <WebtoonsGraphEditor
      initialProject={currentProject}
      onSaveProject={handleSaveProject}
      onBackToGallery={handleBackToGallery}
    />
  );
}
