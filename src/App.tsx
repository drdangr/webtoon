import React, { useState, useEffect } from 'react';
import WebtoonsGraphEditor from './WebtoonsGraphEditor';

// Интерфейс пользователя
interface User {
  id: string;
  username: string;
  password: string; // В реальном приложении пароли должны быть хешированы!
  createdDate: string;
}

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
  authorId: string; // ID автора проекта
  authorName: string; // Имя автора для отображения
}

// Компонент экрана входа/регистрации
function AuthScreen({ onLogin }: { onLogin: (user: User) => void }) {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username.trim() || !password.trim()) {
      setError('Заполните все поля');
      return;
    }

    const users: User[] = JSON.parse(localStorage.getItem('webtoon-users') || '[]');

    if (isLogin) {
      // Вход
      const user = users.find(u => u.username === username && u.password === password);
      if (user) {
        onLogin(user);
      } else {
        setError('Неверный логин или пароль');
      }
    } else {
      // Регистрация
      if (users.some(u => u.username === username)) {
        setError('Пользователь с таким именем уже существует');
        return;
      }

      const newUser: User = {
        id: `user-${Date.now()}`,
        username,
        password, // В реальном приложении нужно хешировать!
        createdDate: new Date().toISOString()
      };

      users.push(newUser);
      localStorage.setItem('webtoon-users', JSON.stringify(users));
      onLogin(newUser);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            🎨 Webtoon Gallery
          </h1>
          <p className="text-gray-600">
            {isLogin ? 'Войдите в свой аккаунт' : 'Создайте новый аккаунт'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Имя пользователя
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Введите имя пользователя"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Пароль
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Введите пароль"
            />
          </div>

          {error && (
            <div className="text-red-600 text-sm bg-red-50 p-2 rounded">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors font-semibold"
          >
            {isLogin ? 'Войти' : 'Зарегистрироваться'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => {
              setIsLogin(!isLogin);
              setError('');
              setUsername('');
              setPassword('');
            }}
            className="text-blue-600 hover:text-blue-700 text-sm"
          >
            {isLogin 
              ? 'Нет аккаунта? Зарегистрируйтесь' 
              : 'Уже есть аккаунт? Войдите'
            }
          </button>
        </div>

        <div className="mt-6 text-xs text-gray-500 text-center">
          ⚠️ Демо-режим: данные хранятся локально в браузере
        </div>
      </div>
    </div>
  );
}

// Компонент галереи
function Gallery({ projects, currentUser, onNewProject, onEditProject, onDeleteProject, onLogout }: {
  projects: Project[];
  currentUser: User;
  onNewProject: () => void;
  onEditProject: (project: Project) => void;
  onDeleteProject: (id: string) => void;
  onLogout: () => void;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        {/* Заголовок с информацией о пользователе */}
        <div className="flex items-center justify-between mb-8">
          <div className="text-center flex-1">
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
          
          {/* Информация о пользователе */}
          <div className="bg-white rounded-lg shadow-sm p-4 ml-8">
            <div className="text-sm text-gray-600 mb-2">Добро пожаловать!</div>
            <div className="font-semibold text-gray-800 mb-3">👤 {currentUser.username}</div>
            <button
              onClick={onLogout}
              className="text-sm px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
            >
              Выйти
            </button>
          </div>
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
              <div className="text-xs text-gray-500 mb-1">
                👤 Автор: {project.authorName}
              </div>
              <p className="text-xs text-gray-500 mb-3">
                Изменен: {new Date(project.modifiedDate).toLocaleDateString()}
              </p>

              {/* Действия */}
              <div className="flex gap-2">
                {project.authorId === currentUser.id ? (
                  // Если пользователь - автор, может редактировать и удалять
                  <>
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
                  </>
                ) : (
                  // Если не автор, только просмотр
                  <button
                    onClick={() => onEditProject(project)}
                    className="flex-1 px-3 py-1 bg-green-100 text-green-700 rounded text-sm hover:bg-green-200 transition-colors"
                  >
                    👁️ Просмотр
                  </button>
                )}
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
  const [user, setUser] = useState<User | null>(null);

  // Проверяем авторизацию при загрузке
  useEffect(() => {
    const savedUser = localStorage.getItem('webtoon-current-user');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (error) {
        console.error('Ошибка загрузки пользователя:', error);
      }
    }
  }, []);

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
      images: {},
      authorId: user?.id || 'guest', // Пример: если пользователь не авторизован, используем 'guest'
      authorName: user?.username || 'Гость'
    };
    
    setCurrentProject(newProject);
    setCurrentView('editor');
  };

  // Редактирование проекта
  const handleEditProject = (project: Project) => {
    setCurrentProject(project);
    setCurrentView('editor');
  };

  // Удаление проекта (только автор может удалить)
  const handleDeleteProject = (id: string) => {
    const project = projects.find(p => p.id === id);
    if (!project || !user) return;
    
    // Проверяем, что пользователь - автор проекта
    if (project.authorId !== user.id) {
      alert('Вы можете удалять только свои проекты!');
      return;
    }
    
    if (confirm('Вы уверены, что хотите удалить этот проект?')) {
      const updatedProjects = projects.filter(p => p.id !== id);
      saveProjects(updatedProjects);
    }
  };

  // Сохранение изменений проекта из редактора
  const handleSaveProject = (projectData: { nodes: any; edges: any; images: any; title?: string; description?: string; thumbnail?: string }) => {
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

  // Обработка входа пользователя
  const handleLogin = (loggedInUser: User) => {
    setUser(loggedInUser);
    localStorage.setItem('webtoon-current-user', JSON.stringify(loggedInUser));
    setCurrentView('gallery');
  };

  // Выход из аккаунта
  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('webtoon-current-user');
    setCurrentView('gallery');
    setCurrentProject(null);
  };

  // Проверка авторизации
  if (!user) {
    return <AuthScreen onLogin={handleLogin} />;
  }

  if (currentView === 'gallery') {
    return (
      <Gallery
        projects={projects}
        currentUser={user}
        onNewProject={handleNewProject}
        onEditProject={handleEditProject}
        onDeleteProject={handleDeleteProject}
        onLogout={handleLogout}
      />
    );
  }

  return (
    <WebtoonsGraphEditor
      initialProject={currentProject}
      currentUser={user}
      isReadOnly={currentProject ? currentProject.authorId !== user.id : false}
      onSaveProject={handleSaveProject}
      onBackToGallery={handleBackToGallery}
    />
  );
}
