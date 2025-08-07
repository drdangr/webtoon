// Файл с переводами для многоязычного интерфейса
export type Language = 'ru' | 'uk' | 'en';

export interface Translations {
  // Общие элементы
  appTitle: string;
  welcome: string;
  author: string;
  logout: string;
  back: string;
  save: string;
  delete: string;
  edit: string;
  view: string;
  create: string;
  cancel: string;
  confirm: string;
  loading: string;
  error: string;
  success: string;
  
  // Аутентификация
  auth: {
    title: string;
    login: string;
    register: string;
    username: string;
    password: string;
    loginButton: string;
    registerButton: string;
    switchToRegister: string;
    switchToLogin: string;
    fillAllFields: string;
    wrongCredentials: string;
    userExists: string;
    enterUsername: string;
    enterPassword: string;
    demoMode: string;
    signIn: string;
    signUp: string;
    noAccount: string;
    haveAccount: string;
    usernameRequired: string;
    registrationSuccess: string;
    emailAlreadyRegistered: string;
    invalidCredentials: string;
    or: string;
    signInWithGitHub: string;
    agreementText: string;
    demoWarning: string;
  };
  
  // Галерея
  gallery: {
    title: string;
    subtitle: string;
    createNew: string;
    welcomeBack: string;
    editProject: string;
    deleteProject: string;
    viewProject: string;
    noThumbnail: string;
    modified: string;
    empty: {
      title: string;
      subtitle: string;
      button: string;
    };
    deleteConfirm: string;
    onlyAuthorCanDelete: string;
  };
  
  // Редактор
  editor: {
    title: string;
    backToGallery: string;
    readOnly: string;
    viewComic: string;
    newComic: string;
    comicDescription: string;
    clickToEdit: string;
    enterTitle: string;
    enterDescription: string;
    
    // Панель инструментов
    tools: {
      imagePool: string;
      uploadImages: string;
      tools: string;
      addChoice: string;
      goToStart: string;
      disperseNodes: string;
      uploadThumbnail: string;
      deleteThumbnail: string;
      contextHint: string;
      controls: string;
      connectionRules: string;
      positioning: string;
    };
    
    // Граф
    graph: {
      title: string;
      scrollHint: string;
      contextSelected: string;
      selectContext: string;
      startNode: string;
      startNodeDescription: string;
      noCaption: string;
      noImage: string;
      chooseAction: string;
      option: string;
      variant: string;
      
      // Подсказки управления
      hints: {
        clickImage: string;
        drag: string;
        click: string;
        shiftClick: string;
        ctrlClick: string;
        clickCaption: string;
        selected: string;
        notSelected: string;
        canDetach: string;
      };
      
      // Правила связей
      rules: {
        start: string;
        images: string;
        choices: string;
        detachable: string;
      };
      
      // Позиционирование
      positioning: {
        first: string;
        selected: string;
        lastAdded: string;
      };
    };
    
    // Предпросмотр
    preview: {
      title: string;
      selectNode: string;
      startPoint: string;
      position: string;
      file: string;
      id: string;
      incoming: string;
      outgoing: string;
      noBackground: string;
      connectToImage: string;
      choiceTitle: string;
      optionsCount: string;
      hotspot: string;
      dragToChange: string;
    };
  };
  
  // Просмотрщик
  viewer: {
    backToConstructor: string;
    imagesInStory: string;
    storyEmpty: string;
    addContent: string;
    endOfStory: string;
    choose: string;
  };
  
  // Сообщения об ошибках
  errors: {
    loadingUser: string;
    loadingProjects: string;
    savingScroll: string;
  };
}

export const translations: Record<Language, Translations> = {
  ru: {
    // Общие элементы
    appTitle: 'Webtoon Gallery',
    welcome: 'Добро пожаловать!',
    author: 'Автор',
    logout: 'Выйти',
    back: 'Назад',
    save: 'Сохранить',
    delete: 'Удалить',
    edit: 'Редактировать',
    view: 'Просмотр',
    create: 'Создать',
    cancel: 'Отмена',
    confirm: 'Подтвердить',
    loading: 'Загрузка...',
    error: 'Ошибка',
    success: 'Успешно',
    
    // Аутентификация
    auth: {
      title: 'Webtoon Gallery',
      login: 'Вход',
      register: 'Регистрация',
      username: 'Имя пользователя',
      password: 'Пароль',
      loginButton: 'Войти',
      registerButton: 'Зарегистрироваться',
      switchToRegister: 'Нет аккаунта? Зарегистрируйтесь',
      switchToLogin: 'Уже есть аккаунт? Войдите',
      fillAllFields: 'Заполните все поля',
      wrongCredentials: 'Неверный логин или пароль',
      userExists: 'Пользователь с таким именем уже существует',
      enterUsername: 'Введите имя пользователя',
      enterPassword: 'Введите пароль',
      demoMode: '⚠️ Демо-режим: данные хранятся локально в браузере',
      signIn: 'Вход в систему',
      signUp: 'Регистрация',
      noAccount: 'Нет аккаунта?',
      haveAccount: 'Уже есть аккаунт?',
      usernameRequired: 'Имя пользователя обязательно',
      registrationSuccess: 'Регистрация успешна! Проверьте вашу почту для подтверждения.',
      emailAlreadyRegistered: 'Этот email уже зарегистрирован',
      invalidCredentials: 'Неверный email или пароль',
      or: 'или',
      signInWithGitHub: 'Войти через GitHub',
      agreementText: 'Регистрируясь, вы соглашаетесь с условиями использования',
      demoWarning: 'Полноценная версия с базой данных Supabase',
    },
    
    // Галерея
    gallery: {
      title: 'Галерея веб-комиксов',
      subtitle: 'Создавайте и управляйте своими интерактивными комиксами',
      createNew: '➕ Создать новый комикс',
      welcomeBack: 'Добро пожаловать!',
      editProject: 'Редактировать',
      deleteProject: '🗑️',
      viewProject: '👁️ Просмотр',
      noThumbnail: 'Нет превью',
      modified: 'Изменен',
      empty: {
        title: 'Пока нет комиксов',
        subtitle: 'Создайте свой первый интерактивный комикс!',
        button: 'Начать создание',
      },
      deleteConfirm: 'Вы уверены, что хотите удалить этот проект?',
      onlyAuthorCanDelete: 'Вы можете удалять только свои проекты!',
    },
    
    // Редактор
    editor: {
      title: 'Редактор комиксов',
      backToGallery: 'В галерею',
      readOnly: '👁️ Только просмотр',
      viewComic: 'Просмотр комикса',
      newComic: 'Новый комикс',
      comicDescription: 'Описание комикса',
      clickToEdit: 'Кликните чтобы редактировать',
      enterTitle: 'Введите название комикса',
      enterDescription: 'Введите описание комикса',
      
      tools: {
        imagePool: 'Пул изображений',
        uploadImages: 'Загрузить изображения',
        tools: 'Инструменты',
        addChoice: 'Добавить выбор',
        goToStart: 'К началу (START)',
        disperseNodes: 'Разбросать ноды по кругу',
        uploadThumbnail: 'Загрузить превью',
        deleteThumbnail: 'Удалить превью',
        contextHint: '💡 Новые ноды появляются рядом с выделенной',
        controls: 'Управление:',
        connectionRules: 'Правила связей:',
        positioning: 'Позиционирование новых нод:',
      },
      
      graph: {
        title: 'Граф сценария',
        scrollHint: 'Скролл для навигации • Свободное перетаскивание нод',
        contextSelected: 'Контекст: {type} (новые ноды рядом)',
        selectContext: 'Кликните на ноду для выбора контекста',
        startNode: 'START',
        startNodeDescription: 'Стартовая нода - начало истории',
        noCaption: 'Без подписи',
        noImage: 'Нет изображения',
        chooseAction: 'Выберите действие:',
        option: 'Вариант',
        variant: 'Вариант',
        
        hints: {
          clickImage: '• Клик на картинку → создать узел',
          drag: '• Перетаскивание → свободно перемещать ноду',
          click: '• Обычный клик → выделить для контекста',
          shiftClick: '• Shift+клик → выделить/связать ноды',
          ctrlClick: '• Ctrl+клик → отрезать от родителей',
          clickCaption: '• Клик на подпись → редактировать',
          selected: 'Выделена: {type} (новые ноды появятся рядом)',
          notSelected: 'Клик для выделения контекста',
          canDetach: 'Ctrl+клик чтобы отрезать от родителей',
        },
        
        rules: {
          start: '• START → только к картинкам (1 выход)',
          images: '• Картинки → 1 вход, 1 выход',
          choices: '• Переключатели → 1 вход, много выходов',
          detachable: '• 🟠 точка = можно отрезать Ctrl+кликом',
        },
        
        positioning: {
          first: '• Первая → рядом с центром',
          selected: '• При выделении → рядом с выделенной',
          lastAdded: '• Иначе → рядом с последней добавленной',
        },
      },
      
      preview: {
        title: 'Содержимое выделенной ноды',
        selectNode: 'Выберите ноду для просмотра',
        startPoint: 'Начальная точка истории',
        position: 'Позиция',
        file: 'Файл',
        id: 'ID',
        incoming: '← Входящих связей',
        outgoing: '→ Исходящих связей',
        noBackground: 'Нет фонового изображения',
        connectToImage: 'Подключите choice-ноду к image-ноде',
        choiceTitle: 'Заголовок',
        optionsCount: 'Вариантов выбора',
        hotspot: 'Хотспот',
        dragToChange: '(перетащите для изменения позиции)',
      },
    },
    
    viewer: {
      backToConstructor: 'Назад к конструктору',
      imagesInStory: 'Изображений в истории',
      storyEmpty: 'История пуста. Добавьте контент в граф.',
      addContent: 'Добавьте контент в граф.',
      endOfStory: 'Конец истории',
      choose: 'Выбрать',
    },
    
    errors: {
      loadingUser: 'Ошибка загрузки пользователя',
      loadingProjects: 'Ошибка загрузки проектов',
      savingScroll: 'Ошибка восстановления позиции скролла',
    },
  },
  
  uk: {
    // Общие элементы
    appTitle: 'Webtoon Gallery',
    welcome: 'Ласкаво просимо!',
    author: 'Автор',
    logout: 'Вийти',
    back: 'Назад',
    save: 'Зберегти',
    delete: 'Видалити',
    edit: 'Редагувати',
    view: 'Перегляд',
    create: 'Створити',
    cancel: 'Скасувати',
    confirm: 'Підтвердити',
    loading: 'Завантаження...',
    error: 'Помилка',
    success: 'Успішно',
    
    // Аутентификация
    auth: {
      title: 'Webtoon Gallery',
      login: 'Вхід',
      register: 'Реєстрація',
      username: "Ім'я користувача",
      password: 'Пароль',
      loginButton: 'Увійти',
      registerButton: 'Зареєструватися',
      switchToRegister: 'Немає акаунту? Зареєструйтеся',
      switchToLogin: 'Вже є акаунт? Увійдіть',
      fillAllFields: "Заповніть усі поля",
      wrongCredentials: 'Неправильний логін або пароль',
      userExists: "Користувач з таким ім'ям вже існує",
      enterUsername: "Введіть ім'я користувача",
      enterPassword: 'Введіть пароль',
      demoMode: '⚠️ Демо-режим: дані зберігаються локально в браузері',
      signIn: 'Вхід до системи',
      signUp: 'Реєстрація',
      noAccount: 'Немає акаунту?',
      haveAccount: 'Вже є акаунт?',
      usernameRequired: "Ім'я користувача обов'язкове",
      registrationSuccess: 'Реєстрація успішна! Перевірте вашу пошту для підтвердження.',
      emailAlreadyRegistered: 'Цей email вже зареєстровано',
      invalidCredentials: 'Неправильний email або пароль',
      or: 'або',
      signInWithGitHub: 'Увійти через GitHub',
      agreementText: 'Реєструючись, ви погоджуєтеся з умовами використання',
      demoWarning: 'Повноцінна версія з базою даних Supabase',
    },
    
    // Галерея
    gallery: {
      title: 'Галерея веб-коміксів',
      subtitle: 'Створюйте та керуйте своїми інтерактивними коміксами',
      createNew: '➕ Створити новий комікс',
      welcomeBack: 'Ласкаво просимо!',
      editProject: 'Редагувати',
      deleteProject: '🗑️',
      viewProject: '👁️ Перегляд',
      noThumbnail: 'Немає превʼю',
      modified: 'Змінено',
      empty: {
        title: 'Поки немає коміксів',
        subtitle: 'Створіть свій перший інтерактивний комікс!',
        button: 'Почати створення',
      },
      deleteConfirm: 'Ви впевнені, що хочете видалити цей проект?',
      onlyAuthorCanDelete: 'Ви можете видаляти лише свої проекти!',
    },
    
    // Редактор
    editor: {
      title: 'Редактор коміксів',
      backToGallery: 'У галерею',
      readOnly: '👁️ Лише перегляд',
      viewComic: 'Перегляд коміксу',
      newComic: 'Новий комікс',
      comicDescription: 'Опис коміксу',
      clickToEdit: 'Клікніть щоб редагувати',
      enterTitle: 'Введіть назву коміксу',
      enterDescription: 'Введіть опис коміксу',
      
      tools: {
        imagePool: 'Пул зображень',
        uploadImages: 'Завантажити зображення',
        tools: 'Інструменти',
        addChoice: 'Додати вибір',
        goToStart: 'До початку (START)',
        disperseNodes: 'Розкидати ноди по колу',
        uploadThumbnail: 'Завантажити превʼю',
        deleteThumbnail: 'Видалити превʼю',
        contextHint: '💡 Нові ноди зʼявляються поруч із виділеною',
        controls: 'Керування:',
        connectionRules: "Правила зв'язків:",
        positioning: 'Позиціонування нових нод:',
      },
      
      graph: {
        title: 'Граф сценарію',
        scrollHint: 'Скрол для навігації • Вільне перетягування нод',
        contextSelected: 'Контекст: {type} (нові ноди поруч)',
        selectContext: 'Клікніть на ноду для вибору контексту',
        startNode: 'START',
        startNodeDescription: 'Стартова нода - початок історії',
        noCaption: 'Без підпису',
        noImage: 'Немає зображення',
        chooseAction: 'Виберіть дію:',
        option: 'Варіант',
        variant: 'Варіант',
        
        hints: {
          clickImage: '• Клік на картинку → створити вузол',
          drag: '• Перетягування → вільно переміщати ноду',
          click: '• Звичайний клік → виділити для контексту',
          shiftClick: "• Shift+клік → виділити/зв'язати ноди",
          ctrlClick: '• Ctrl+клік → відрізати від батьків',
          clickCaption: '• Клік на підпис → редагувати',
          selected: 'Виділена: {type} (нові ноди зʼявляться поруч)',
          notSelected: 'Клік для виділення контексту',
          canDetach: 'Ctrl+клік щоб відрізати від батьків',
        },
        
        rules: {
          start: '• START → лише до картинок (1 вихід)',
          images: '• Картинки → 1 вхід, 1 вихід',
          choices: '• Перемикачі → 1 вхід, багато виходів',
          detachable: '• 🟠 точка = можна відрізати Ctrl+кліком',
        },
        
        positioning: {
          first: '• Перша → поруч з центром',
          selected: '• При виділенні → поруч з виділеною',
          lastAdded: '• Інакше → поруч з останньою доданою',
        },
      },
      
      preview: {
        title: 'Вміст виділеної ноди',
        selectNode: 'Виберіть ноду для перегляду',
        startPoint: 'Початкова точка історії',
        position: 'Позиція',
        file: 'Файл',
        id: 'ID',
        incoming: "← Вхідних зв'язків",
        outgoing: "→ Вихідних зв'язків",
        noBackground: 'Немає фонового зображення',
        connectToImage: "Підключіть choice-ноду до image-ноди",
        choiceTitle: 'Заголовок',
        optionsCount: 'Варіантів вибору',
        hotspot: 'Хотспот',
        dragToChange: '(перетягніть для зміни позиції)',
      },
    },
    
    viewer: {
      backToConstructor: 'Назад до конструктора',
      imagesInStory: 'Зображень в історії',
      storyEmpty: 'Історія порожня. Додайте контент у граф.',
      addContent: 'Додайте контент у граф.',
      endOfStory: 'Кінець історії',
      choose: 'Вибрати',
    },
    
    errors: {
      loadingUser: 'Помилка завантаження користувача',
      loadingProjects: 'Помилка завантаження проектів',
      savingScroll: 'Помилка відновлення позиції скролу',
    },
  },
  
  en: {
    // Общие элементы
    appTitle: 'Webtoon Gallery',
    welcome: 'Welcome!',
    author: 'Author',
    logout: 'Logout',
    back: 'Back',
    save: 'Save',
    delete: 'Delete',
    edit: 'Edit',
    view: 'View',
    create: 'Create',
    cancel: 'Cancel',
    confirm: 'Confirm',
    loading: 'Loading...',
    error: 'Error',
    success: 'Success',
    
    // Аутентификация
    auth: {
      title: 'Webtoon Gallery',
      login: 'Login',
      register: 'Register',
      username: 'Username',
      password: 'Password',
      loginButton: 'Sign In',
      registerButton: 'Sign Up',
      switchToRegister: "Don't have an account? Sign up",
      switchToLogin: 'Already have an account? Sign in',
      fillAllFields: 'Fill in all fields',
      wrongCredentials: 'Wrong username or password',
      userExists: 'User with this name already exists',
      enterUsername: 'Enter username',
      enterPassword: 'Enter password',
      demoMode: '⚠️ Demo mode: data is stored locally in browser',
      signIn: 'Sign In',
      signUp: 'Sign Up',
      noAccount: "Don't have an account?",
      haveAccount: 'Already have an account?',
      usernameRequired: 'Username is required',
      registrationSuccess: 'Registration successful! Check your email for confirmation.',
      emailAlreadyRegistered: 'This email is already registered',
      invalidCredentials: 'Invalid email or password',
      or: 'or',
      signInWithGitHub: 'Sign in with GitHub',
      agreementText: 'By signing up, you agree to our terms of service',
      demoWarning: 'Full version with Supabase database',
    },
    
    // Галерея
    gallery: {
      title: 'Web Comics Gallery',
      subtitle: 'Create and manage your interactive comics',
      createNew: '➕ Create new comic',
      welcomeBack: 'Welcome back!',
      editProject: 'Edit',
      deleteProject: '🗑️',
      viewProject: '👁️ View',
      noThumbnail: 'No preview',
      modified: 'Modified',
      empty: {
        title: 'No comics yet',
        subtitle: 'Create your first interactive comic!',
        button: 'Start creating',
      },
      deleteConfirm: 'Are you sure you want to delete this project?',
      onlyAuthorCanDelete: 'You can only delete your own projects!',
    },
    
    // Редактор
    editor: {
      title: 'Comic Editor',
      backToGallery: 'To Gallery',
      readOnly: '👁️ Read Only',
      viewComic: 'View Comic',
      newComic: 'New Comic',
      comicDescription: 'Comic Description',
      clickToEdit: 'Click to edit',
      enterTitle: 'Enter comic title',
      enterDescription: 'Enter comic description',
      
      tools: {
        imagePool: 'Image Pool',
        uploadImages: 'Upload Images',
        tools: 'Tools',
        addChoice: 'Add Choice',
        goToStart: 'Go to START',
        disperseNodes: 'Disperse Nodes in Circle',
        uploadThumbnail: 'Upload Thumbnail',
        deleteThumbnail: 'Delete Thumbnail',
        contextHint: '💡 New nodes appear near selected one',
        controls: 'Controls:',
        connectionRules: 'Connection Rules:',
        positioning: 'New Nodes Positioning:',
      },
      
      graph: {
        title: 'Scenario Graph',
        scrollHint: 'Scroll to navigate • Free node dragging',
        contextSelected: 'Context: {type} (new nodes nearby)',
        selectContext: 'Click on node to select context',
        startNode: 'START',
        startNodeDescription: 'Start node - beginning of story',
        noCaption: 'No caption',
        noImage: 'No image',
        chooseAction: 'Choose action:',
        option: 'Option',
        variant: 'Variant',
        
        hints: {
          clickImage: '• Click on image → create node',
          drag: '• Dragging → freely move node',
          click: '• Regular click → select for context',
          shiftClick: '• Shift+click → select/connect nodes',
          ctrlClick: '• Ctrl+click → detach from parents',
          clickCaption: '• Click on caption → edit',
          selected: 'Selected: {type} (new nodes will appear nearby)',
          notSelected: 'Click to select context',
          canDetach: 'Ctrl+click to detach from parents',
        },
        
        rules: {
          start: '• START → only to images (1 output)',
          images: '• Images → 1 input, 1 output',
          choices: '• Switches → 1 input, multiple outputs',
          detachable: '• 🟠 dot = can detach with Ctrl+click',
        },
        
        positioning: {
          first: '• First → near center',
          selected: '• When selected → near selected',
          lastAdded: '• Otherwise → near last added',
        },
      },
      
      preview: {
        title: 'Selected Node Content',
        selectNode: 'Select node to view',
        startPoint: 'Starting point of story',
        position: 'Position',
        file: 'File',
        id: 'ID',
        incoming: '← Incoming connections',
        outgoing: '→ Outgoing connections',
        noBackground: 'No background image',
        connectToImage: 'Connect choice-node to image-node',
        choiceTitle: 'Title',
        optionsCount: 'Choice options',
        hotspot: 'Hotspot',
        dragToChange: '(drag to change position)',
      },
    },
    
    viewer: {
      backToConstructor: 'Back to Constructor',
      imagesInStory: 'Images in story',
      storyEmpty: 'Story is empty. Add content to graph.',
      addContent: 'Add content to graph.',
      endOfStory: 'End of story',
      choose: 'Choose',
    },
    
    errors: {
      loadingUser: 'Error loading user',
      loadingProjects: 'Error loading projects',
      savingScroll: 'Error restoring scroll position',
    },
  },
};