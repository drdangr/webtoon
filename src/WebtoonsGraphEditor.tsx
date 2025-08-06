import React, { useState, useRef, useCallback } from 'react';
import { Upload, Plus, Eye, ArrowLeft, Trash2, MousePointer } from 'lucide-react';
import { useLanguage, LanguageSwitcher } from './LanguageContext';

// Интерфейс для кликабельных областей (хотспотов) на изображениях
interface Hotspot {
  id: string;
  x: number;        // позиция в % от ширины изображения
  y: number;        // позиция в % от высоты изображения  
  width: number;    // ширина в % от ширины изображения
  height: number;   // высота в % от высоты изображения
  edgeId: string;   // ID связи, к которой привязан хотспот
}

// Компонент перетаскиваемого хотспота (вынесен на уровень модуля)
const DraggableHotspot = React.memo(({ hotspot, choiceNodeId, onPositionUpdate, isInViewMode = false }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [tempPosition, setTempPosition] = useState(null); // Временная позиция во время drag
  const hotspotRef = useRef(null);
  const dragInfo = useRef(null);
  const lastUpdateTime = useRef(0); // Возвращаем легкий throttling
  
  const handleMouseDown = (e) => {
    if (isInViewMode) return; // В режиме просмотра не перетаскиваем
    if (e.button !== 0) return; // Только левая кнопка мыши
    if (isDragging) return; // Уже перетаскиваем
    
    e.preventDefault();
    e.stopPropagation();
    
    const container = hotspotRef.current?.parentElement;
    if (!container) return;
    
    // Сохраняем начальные позиции
    dragInfo.current = {
      startX: e.pageX,
      startY: e.pageY,
      initialHotspotX: hotspot.x,
      initialHotspotY: hotspot.y,
      containerRect: container.getBoundingClientRect()
    };
    
    setIsDragging(true);
    
    // Устанавливаем курсор и блокируем выделение
    document.body.style.cursor = 'grabbing';
    document.body.style.userSelect = 'none';
  };

  React.useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e) => {
      if (!dragInfo.current) return;
      
      // Легкий throttling - обновляем не чаще чем каждые 8ms
      const now = Date.now();
      if (now - lastUpdateTime.current < 8) return;
      lastUpdateTime.current = now;
      
      // Дополнительная проверка - если кнопка мыши больше не нажата, останавливаем
      if (e.buttons === 0) {
        handleMouseUp();
        return;
      }
      
      const { startX, startY, initialHotspotX, initialHotspotY, containerRect } = dragInfo.current;
      
      const deltaX = ((e.pageX - startX) / containerRect.width) * 100;
      const deltaY = ((e.pageY - startY) / containerRect.height) * 100;
      
      const newX = Math.max(0, Math.min(80, initialHotspotX + deltaX));
      const newY = Math.max(0, Math.min(92, initialHotspotY + deltaY));
      
      // Во время drag обновляем только локальную позицию - НЕ ТРОГАЕМ глобальное состояние!
      setTempPosition({ x: newX, y: newY });
    };

    const handleMouseUp = () => {
      // Если есть временная позиция, сохраняем её в глобальное состояние
      if (tempPosition) {
        onPositionUpdate(choiceNodeId, hotspot.edgeId, tempPosition.x, tempPosition.y);
        setTempPosition(null);
      }
      
      setIsDragging(false);
      dragInfo.current = null;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    // Предотвращаем контекстное меню во время перетаскивания
    const handleContextMenu = (e) => {
      if (isDragging) {
        e.preventDefault();
        handleMouseUp();
      }
    };

    // Добавляем обработчики
    document.addEventListener('mousemove', handleMouseMove, { passive: false });
    document.addEventListener('mouseup', handleMouseUp, { passive: false });
    document.addEventListener('contextmenu', handleContextMenu, { passive: false });
    
    // Cleanup функция
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [isDragging, choiceNodeId, hotspot.edgeId, onPositionUpdate, tempPosition]);
  
  const handleClick = (e) => {
    if (isInViewMode && hotspot.onClick) {
      e.preventDefault();
      e.stopPropagation();
      hotspot.onClick();
    }
  };
  
  return (
    <div
      ref={hotspotRef}
      className={`absolute rounded flex items-center justify-center text-white text-xs font-medium transition-all duration-200 ${
        isInViewMode 
          ? 'bg-transparent hover:bg-black hover:bg-opacity-60 cursor-pointer' // В режиме просмотра прозрачные, с hover эффектом
          : (isDragging 
              ? 'bg-blue-500 bg-opacity-90 border-2 border-blue-300 cursor-grabbing' 
              : 'bg-orange-500 bg-opacity-70 hover:bg-opacity-90 border-2 border-orange-600 cursor-grab')
      }`}
      style={{
        left: `${tempPosition ? tempPosition.x : hotspot.x}%`,
        top: `${tempPosition ? tempPosition.y : hotspot.y}%`,
        width: `${hotspot.width}%`,
        height: `${hotspot.height}%`,
        minWidth: '60px',
        minHeight: '24px',
        zIndex: isDragging ? 1000 : 1
      }}
      onMouseDown={handleMouseDown}
      onClick={handleClick}
      title={hotspot.title}
    >
      {/* В режиме просмотра показываем текст только при hover */}
      <span className={isInViewMode ? "opacity-0 hover:opacity-100 transition-opacity duration-200" : ""}>
        {hotspot.isSelected && '✓ '}
        {hotspot.label}
      </span>
    </div>
  );
});

// Выносим NodeComponent на уровень модуля
const NodeComponent = ({ 
  node, 
  isSelected, 
  hasIncomingConnections,
  canBeDetached,
  images,
  onNodeClick,
  onUpdateCaption,
  onDeleteNode,
  onUpdatePosition
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const dragInfo = useRef(null);
  const [isEditing, setIsEditing] = useState(false);

  const handleMouseDown = (e) => {
    // Только левая кнопка мыши
    if (e.button !== 0) return;
    
    // Проверяем, не идёт ли уже перетаскивание
    if (isDragging) return;
    
    // Предотвращаем стандартное поведение браузера
    e.preventDefault();
    e.stopPropagation();
    
    if (e.shiftKey || e.ctrlKey) {
      onNodeClick(node.id, e.shiftKey, e.ctrlKey);
      return;
    }
    
    // При обычном клике тоже выделяем ноду
    onNodeClick(node.id, false, false);
    
    // Сохраняем начальные позиции
    dragInfo.current = {
      startX: e.pageX,
      startY: e.pageY,
      nodeStartX: node.position.x,
      nodeStartY: node.position.y
    };
    
    setIsDragging(true);
    
    // Устанавливаем курсор и блокируем выделение
    document.body.style.cursor = 'grabbing';
    document.body.style.userSelect = 'none';
    document.body.style.WebkitUserSelect = 'none';
    document.body.style.MozUserSelect = 'none';
    document.body.style.msUserSelect = 'none';
    document.body.classList.add('dragging');
  };

  React.useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e) => {
      if (!dragInfo.current) return;
      
      // Дополнительная проверка - если кнопка мыши больше не нажата, останавливаем
      if (e.buttons === 0) {
        handleMouseUp();
        return;
      }
      
      const deltaX = e.pageX - dragInfo.current.startX;
      const deltaY = e.pageY - dragInfo.current.startY;
      
      const newX = Math.max(10, Math.min(1900, dragInfo.current.nodeStartX + deltaX));
      const newY = Math.max(10, Math.min(1400, dragInfo.current.nodeStartY + deltaY));
      
      onUpdatePosition(node.id, { x: newX, y: newY });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      dragInfo.current = null;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      document.body.style.WebkitUserSelect = '';
      document.body.style.MozUserSelect = '';
      document.body.style.msUserSelect = '';
      document.body.classList.remove('dragging');
    };

    // Предотвращаем контекстное меню во время перетаскивания
    const handleContextMenu = (e) => {
      if (isDragging) {
        e.preventDefault();
        handleMouseUp();
      }
    };

    // Добавляем обработчики
    document.addEventListener('mousemove', handleMouseMove, { passive: false });
    document.addEventListener('mouseup', handleMouseUp, { passive: false });
    document.addEventListener('contextmenu', handleContextMenu, { passive: false });
    
    // Дополнительная проверка на потерю фокуса окна
    const handleBlur = () => {
      if (isDragging) {
        handleMouseUp();
      }
    };
    window.addEventListener('blur', handleBlur);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove, { passive: false });
      document.removeEventListener('mouseup', handleMouseUp, { passive: false });
      document.removeEventListener('contextmenu', handleContextMenu, { passive: false });
      window.removeEventListener('blur', handleBlur);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      document.body.style.WebkitUserSelect = '';
      document.body.style.MozUserSelect = '';
      document.body.style.msUserSelect = '';
      document.body.classList.remove('dragging');
    };
  }, [isDragging, node.id, onUpdatePosition]);

  // Очистка при размонтировании компонента
  React.useEffect(() => {
    return () => {
      if (isDragging) {
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        document.body.style.WebkitUserSelect = '';
        document.body.style.MozUserSelect = '';
        document.body.style.msUserSelect = '';
        document.body.classList.remove('dragging');
      }
    };
  }, [isDragging]);

  const baseStyle = {
    position: 'absolute',
    left: node.position.x,
    top: node.position.y,
    cursor: isDragging ? 'grabbing' : 'grab',
    userSelect: 'none',
    WebkitUserSelect: 'none',
    MozUserSelect: 'none',
    msUserSelect: 'none',
    touchAction: 'none'
  };

  if (node.type === 'start') {
    return (
      <div
        style={baseStyle}
        onMouseDown={handleMouseDown}
        className={`w-16 h-16 bg-green-500 rounded-full flex items-center justify-center text-white font-bold border-4 ${
          isSelected ? 'border-blue-400 ring-4 ring-blue-200' : 'border-green-600'
        } shadow-lg ${isDragging ? 'opacity-75 node-dragging' : 'transition-all'}`}
        title="Стартовая нода - начало истории"
      >
        <div className="text-xs pointer-events-none">START</div>
      </div>
    );
  }

  if (node.type === 'image') {
    const image = images[node.data.imageId];
    if (!image) return null;

    return (
      <div
        style={baseStyle}
        onMouseDown={handleMouseDown}
        className={`relative border-4 ${
          isSelected 
            ? 'border-blue-400 ring-4 ring-blue-200' 
            : canBeDetached 
              ? 'border-orange-300 hover:border-orange-400' 
              : 'border-gray-300'
        } bg-white rounded-lg p-2 shadow-lg ${isDragging ? 'opacity-75 node-dragging' : 'transition-all'}`}
        title={canBeDetached ? 'Ctrl+клик чтобы отрезать от родителей' : 'Картинка комикса'}
      >
        <img 
          src={image.src} 
          alt={image.name}
          className="w-20 h-20 object-cover rounded pointer-events-none"
          draggable={false}
        />
        
        {canBeDetached && (
          <div className="absolute -top-1 -left-1 w-3 h-3 bg-orange-500 rounded-full border border-white" 
               title="Можно отрезать от родителей" />
        )}
        
        {isEditing ? (
          <input
            type="text"
            value={node.data.caption || ''}
            onChange={(e) => onUpdateCaption(node.id, e.target.value)}
            onBlur={() => setIsEditing(false)}
            onKeyPress={(e) => e.key === 'Enter' && setIsEditing(false)}
            onMouseDown={(e) => e.stopPropagation()}
            className="text-xs text-center mt-1 w-full border border-gray-300 rounded px-1"
            autoFocus
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <div 
            className="text-xs text-center mt-1 font-medium max-w-20 truncate cursor-text border border-transparent hover:border-gray-300 rounded px-1"
            onClick={(e) => {
              e.stopPropagation();
              setIsEditing(true);
            }}
            onMouseDown={(e) => e.stopPropagation()}
            title="Кликните для редактирования"
          >
            {node.data.caption || 'Без подписи'}
          </div>
        )}
        
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDeleteNode(node.id);
          }}
          onMouseDown={(e) => e.stopPropagation()}
          className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 text-xs"
        >
          ×
        </button>
      </div>
    );
  }

  if (node.type === 'choice') {
    return (
      <div
        style={baseStyle}
        onMouseDown={handleMouseDown}
        className={`relative border-4 ${
          isSelected 
            ? 'border-blue-400 ring-4 ring-blue-200' 
            : canBeDetached 
              ? 'border-orange-300 hover:border-orange-400' 
              : 'border-orange-300'
        } bg-orange-100 rounded-lg p-3 min-w-32 max-w-40 shadow-lg ${isDragging ? 'opacity-75 node-dragging' : 'transition-all'}`}
        title={canBeDetached ? 'Ctrl+клик чтобы отрезать от родителей' : 'Точка выбора для зрителя'}
      >
        {canBeDetached && (
          <div className="absolute -top-1 -left-1 w-3 h-3 bg-orange-500 rounded-full border border-white" 
               title="Можно отрезать от родителей" />
        )}
        
        <div className="text-sm font-medium text-center truncate">
          {node.data.title}
        </div>
        <div className="text-xs text-gray-600 mt-1">
          {node.data.options.map((option, idx) => (
            <div key={idx} className="truncate">• {option}</div>
          ))}
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDeleteNode(node.id);
          }}
          onMouseDown={(e) => e.stopPropagation()}
          className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 text-xs"
        >
          ×
        </button>
      </div>
    );
  }

  return null;
};

interface WebtoonsGraphEditorProps {
  initialProject?: {
    id: string;
    title: string;
    description: string;
    nodes: any;
    edges: any;
    images: any;
    authorId: string;
    authorName: string;
  } | null;
  currentUser: {
    id: string;
    username: string;
  };
  isReadOnly: boolean;
  onSaveProject: (projectData: { nodes: any; edges: any; images: any; title?: string; description?: string; thumbnail?: string }) => void;
  onBackToGallery: () => void;
}

const WebtoonsGraphEditor = ({ initialProject, currentUser, isReadOnly, onSaveProject, onBackToGallery }: WebtoonsGraphEditorProps) => {
  const { t } = useLanguage();
  const [mode, setMode] = useState('constructor');
  const [images, setImages] = useState(() => {
    if (initialProject?.images && Object.keys(initialProject.images).length > 0) {
      return initialProject.images;
    }
    return {};
  });
  const [projectTitle, setProjectTitle] = useState(initialProject?.title || t.editor.newComic);
  const [projectDescription, setProjectDescription] = useState(initialProject?.description || t.editor.comicDescription);
  const [projectThumbnail, setProjectThumbnail] = useState(initialProject?.thumbnail || '');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  
  // Инициализируем nodes и edges из проекта или дефолтными значениями
  const [nodes, setNodes] = useState(() => {
    if (initialProject?.nodes && Object.keys(initialProject.nodes).length > 0) {
      return initialProject.nodes;
    }
    return {
      'start': {
        id: 'start',
        type: 'start',
        position: { x: 1000, y: 300 },
        data: { title: t.editor.graph.startNode }
      }
    };
  });
  
  const [edges, setEdges] = useState(() => {
    if (initialProject?.edges && Array.isArray(initialProject.edges)) {
      return initialProject.edges;
    }
    return [];
  });
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [lastAddedNodeId, setLastAddedNodeId] = useState(null);
  const [choiceHistory, setChoiceHistory] = useState([]);
  const [viewerPath, setViewerPath] = useState([]);
  const [draggedHotspot, setDraggedHotspot] = useState(null); // Состояние для перетаскивания хотспотов
  const [scrollPosition, setScrollPosition] = useState({ x: 0, y: 0 });
  const graphScrollRef = useRef(null);
  const fileInputRef = useRef(null);

  // Глобальный стиль для предотвращения выделения текста во время перетаскивания
  React.useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      .dragging * {
        user-select: none !important;
        -webkit-user-select: none !important;
        -moz-user-select: none !important;
        -ms-user-select: none !important;
      }
      .node-dragging {
        cursor: grabbing !important;
      }
      .node-dragging * {
        pointer-events: none !important;
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // Автосохранение проекта при изменениях (только если не режим просмотра)
  React.useEffect(() => {
    if (isReadOnly) return; // Не сохраняем в режиме только просмотра
    
    // Не сохраняем при первой загрузке
    if (!initialProject && Object.keys(nodes).length === 1 && edges.length === 0) {
      return;
    }
    
    const timeoutId = setTimeout(() => {
      onSaveProject({
        nodes,
        edges,
        images,
        title: projectTitle,
        description: projectDescription,
        thumbnail: projectThumbnail
      });
    }, 1000); // Сохраняем через 1 секунду после последнего изменения
    
    return () => clearTimeout(timeoutId);
  }, [nodes, edges, images, projectTitle, projectDescription, projectThumbnail, onSaveProject, isReadOnly]);

  // Обработчики для редактирования полей проекта
  const handleTitleClick = () => {
    if (!isReadOnly) {
      setIsEditingTitle(true);
    }
  };

  const handleTitleSave = (e) => {
    if (e.key === 'Enter' || e.type === 'blur') {
      setIsEditingTitle(false);
    }
  };

  const handleDescriptionClick = () => {
    if (!isReadOnly) {
      setIsEditingDescription(true);
    }
  };

  const handleDescriptionSave = (e) => {
    if (e.key === 'Enter' || e.type === 'blur') {
      setIsEditingDescription(false);
    }
  };

  // Обработчик загрузки превью
  const handleThumbnailUpload = (event) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setProjectThumbnail(e.target.result);
      };
      reader.readAsDataURL(file);
    }
    // Очищаем input чтобы можно было загрузить тот же файл повторно
    event.target.value = '';
  };

  // Восстановление позиции скролла при загрузке проекта
  React.useEffect(() => {
    if (graphScrollRef.current && initialProject) {
      const savedScrollKey = `scroll-${initialProject.id}`;
      const savedScroll = localStorage.getItem(savedScrollKey);
      if (savedScroll) {
        try {
          const { x, y } = JSON.parse(savedScroll);
          graphScrollRef.current.scrollLeft = x;
          graphScrollRef.current.scrollTop = y;
          setScrollPosition({ x, y });
        } catch (error) {
          console.error('Ошибка восстановления позиции скролла:', error);
        }
      }
    }
  }, [initialProject]);

  // Сохранение позиции скролла
  const handleScroll = React.useCallback(() => {
    if (graphScrollRef.current && initialProject) {
      const { scrollLeft, scrollTop } = graphScrollRef.current;
      const newPosition = { x: scrollLeft, y: scrollTop };
      setScrollPosition(newPosition);
      
      // Сохраняем в localStorage с привязкой к ID проекта
      const savedScrollKey = `scroll-${initialProject.id}`;
      localStorage.setItem(savedScrollKey, JSON.stringify(newPosition));
    }
  }, [initialProject]);

  // Добавляем обработчик скролла
  React.useEffect(() => {
    const scrollContainer = graphScrollRef.current;
    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', handleScroll, { passive: true });
      return () => {
        scrollContainer.removeEventListener('scroll', handleScroll);
      };
    }
  }, [handleScroll]);

  const handleImageUpload = (event) => {
    const files = Array.from(event.target.files);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const imageId = `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const newImage = {
          id: imageId,
          name: file.name.replace(/\.[^/.]+$/, ""),
          src: e.target.result,
          originalName: file.name
        };
        
        setImages(prev => ({
          ...prev,
          [imageId]: newImage
        }));
      };
      reader.readAsDataURL(file);
    });
  };

  const findFreePosition = (nodeType = 'image', basePosition = null) => {
    const nodeSize = nodeType === 'choice' ? 150 : 120;
    const spacing = 30;
    
    // Определяем базовую позицию
    let baseX, baseY;
    
    if (basePosition) {
      baseX = basePosition.x;
      baseY = basePosition.y;
    } else {
      // Если нет базовой позиции, определяем её исходя из контекста
      const nodeCount = Object.keys(nodes).length - 1; // минус START нода
      
      if (nodeCount === 0) {
        // Первая нода - рядом с центром
        baseX = 1000;
        baseY = 500;
      } else if (selectedNodeId && nodes[selectedNodeId]) {
        // Есть выделенная нода
        baseX = nodes[selectedNodeId].position.x;
        baseY = nodes[selectedNodeId].position.y;
      } else if (lastAddedNodeId && nodes[lastAddedNodeId]) {
        // Есть последняя добавленная
        baseX = nodes[lastAddedNodeId].position.x;
        baseY = nodes[lastAddedNodeId].position.y;
      } else {
        // Fallback на центр
        baseX = 1000;
        baseY = 500;
      }
    }
    
    // Ищем свободное место по спирали вокруг базовой позиции
    const searchRadius = nodeSize + spacing;
    const angles = [0, Math.PI/2, Math.PI, 3*Math.PI/2]; // право, низ, лево, верх
    
    for (let distance = 1; distance <= 5; distance++) {
      for (let angle of angles) {
        const x = baseX + Math.cos(angle) * searchRadius * distance;
        const y = baseY + Math.sin(angle) * searchRadius * distance;
        
        // Проверяем границы
        if (x < 50 || x > 1950 || y < 50 || y > 1450) continue;
        
        // Проверяем коллизии
        const hasCollision = Object.values(nodes).some(node => {
          const dx = Math.abs(node.position.x - x);
          const dy = Math.abs(node.position.y - y);
          return dx < nodeSize && dy < nodeSize;
        });
        
        if (!hasCollision) {
          return { x: x, y: y };
        }
      }
    }
    
    // Если не нашли место рядом, ищем по диагоналям
    for (let distance = 1; distance <= 8; distance++) {
      const diagonalAngles = [Math.PI/4, 3*Math.PI/4, 5*Math.PI/4, 7*Math.PI/4];
      for (let angle of diagonalAngles) {
        const x = baseX + Math.cos(angle) * searchRadius * distance;
        const y = baseY + Math.sin(angle) * searchRadius * distance;
        
        if (x < 50 || x > 1950 || y < 50 || y > 1450) continue;
        
        const hasCollision = Object.values(nodes).some(node => {
          const dx = Math.abs(node.position.x - x);
          const dy = Math.abs(node.position.y - y);
          return dx < nodeSize && dy < nodeSize;
        });
        
        if (!hasCollision) {
          return { x: x, y: y };
        }
      }
    }
    
    // Последний fallback - случайная позиция
    return {
      x: 200 + Math.random() * 1600,
      y: 200 + Math.random() * 1000
    };
  };

  const centerOnNode = (nodeId) => {
    const node = nodes[nodeId];
    if (!node || !graphScrollRef.current) return;
    
    const scrollContainer = graphScrollRef.current;
    const targetX = Math.max(0, node.position.x - scrollContainer.clientWidth / 2 + 50);
    const targetY = Math.max(0, node.position.y - scrollContainer.clientHeight / 2 + 50);
    
    scrollContainer.scrollTo({
      left: targetX,
      top: targetY,
      behavior: 'smooth'
    });
  };

  const disperseNodes = () => {
    const nodeList = Object.values(nodes);
    const center = { x: 1000, y: 600 };
    const updatedNodes = { ...nodes };
    
    nodeList.forEach((node, index) => {
      if (node.id === 'start') return;
      
      const angle = (index * 2 * Math.PI) / (nodeList.length - 1);
      const radius = 200 + (index % 3) * 100;
      
      const newPosition = {
        x: center.x + Math.cos(angle) * radius,
        y: center.y + Math.sin(angle) * radius
      };
      
      updatedNodes[node.id] = {
        ...node,
        position: newPosition
      };
    });
    
    setNodes(updatedNodes);
  };

  const createImageNode = (imageId) => {
    const nodeId = `node_${Date.now()}`;
    const position = findFreePosition('image');
    
    const newNode = {
      id: nodeId,
      type: 'image',
      position,
      data: { 
        imageId,
        caption: images[imageId]?.name || t.editor.graph.noImage
      }
    };
    
    setNodes(prev => ({
      ...prev,
      [nodeId]: newNode
    }));
    
    setLastAddedNodeId(nodeId);
    
    setTimeout(() => centerOnNode(nodeId), 100);
  };

  // Функция обновления позиции хотспота
  const updateHotspotPosition = useCallback((choiceNodeId: string, edgeId: string, x: number, y: number) => {
    setNodes(prev => {
      const oldNode = prev[choiceNodeId];
      
      const updatedNode = {
        ...prev[choiceNodeId],
        data: {
          ...prev[choiceNodeId].data,
          hotspots: {
            ...prev[choiceNodeId].data.hotspots,
            [edgeId]: {
              ...prev[choiceNodeId].data.hotspots?.[edgeId],
              x,
              y
            }
          }
        }
      };
      
      return {
        ...prev,
        [choiceNodeId]: updatedNode
      };
    });
  }, []);

  // Функция получения сохраненной позиции хотспота
  const getHotspotPosition = (choiceNodeId: string, edgeId: string, defaultX: number, defaultY: number) => {
    const savedHotspot = nodes[choiceNodeId]?.data?.hotspots?.[edgeId];
    const result = {
      x: savedHotspot?.x ?? defaultX,
      y: savedHotspot?.y ?? defaultY,
      width: savedHotspot?.width ?? 20,
      height: savedHotspot?.height ?? 8
    };
    
    return result;
  };

  // Функция поиска предыдущей image-ноды для choice-ноды
  const getPreviousImageNode = (choiceNodeId: string) => {
    const incomingEdges = edges.filter(edge => edge.to === choiceNodeId);
    
    for (const edge of incomingEdges) {
      const sourceNode = nodes[edge.from];
      if (sourceNode && sourceNode.type === 'image') {
        return sourceNode;
      }
    }
    
    return null;
  };

  const createChoiceNode = () => {
    const nodeId = `choice_${Date.now()}`;
    const position = findFreePosition('choice');
    
    const newNode = {
      id: nodeId,
      type: 'choice',
      position,
      data: { 
        title: t.editor.graph.chooseAction,
        options: [t.editor.graph.variant + ' 1', t.editor.graph.variant + ' 2'],
        hotspots: {} as Record<string, Hotspot>  // Массив кликабельных областей
      }
    };
    
    setNodes(prev => ({
      ...prev,
      [nodeId]: newNode
    }));
    
    setLastAddedNodeId(nodeId);
    
    setTimeout(() => centerOnNode(nodeId), 100);
  };

  const getNodeConnections = (nodeId) => {
    const incoming = edges.filter(edge => edge.to === nodeId);
    const outgoing = edges.filter(edge => edge.from === nodeId);
    return { incoming, outgoing };
  };

  const canCreateConnection = (fromNodeId, toNodeId) => {
    const fromNode = nodes[fromNodeId];
    const toNode = nodes[toNodeId];
    
    if (!fromNode || !toNode || fromNodeId === toNodeId) return false;
    if (edges.some(edge => edge.from === fromNodeId && edge.to === toNodeId)) return false;
    
    const fromConnections = getNodeConnections(fromNodeId);
    
    switch (fromNode.type) {
      case 'start':
        return fromConnections.outgoing.length === 0 && toNode.type === 'image';
      case 'image':
        return fromConnections.outgoing.length === 0 && toNode.type !== 'start';
      case 'choice':
        return toNode.type === 'image';
      default:
        return false;
    }
  };

  const canReceiveConnection = (nodeId) => {
    const node = nodes[nodeId];
    const connections = getNodeConnections(nodeId);
    
    switch (node.type) {
      case 'start':
        return false;
      case 'image':
      case 'choice':
        return connections.incoming.length === 0;
      default:
        return false;
    }
  };

  const detachNodeFromParents = (nodeId) => {
    if (nodeId === 'start') return;
    
    const incomingEdges = edges.filter(edge => edge.to === nodeId);
    
    if (incomingEdges.length > 0) {
      setEdges(prev => prev.filter(edge => edge.to !== nodeId));
    }
  };

  const handleNodeClick = (nodeId, isShiftClick, isCtrlClick) => {
    if (isCtrlClick) {
      detachNodeFromParents(nodeId);
      return;
    }
    
    if (!isShiftClick) {
      setSelectedNodeId(nodeId);
      return;
    }
    
    if (selectedNodeId === nodeId) {
      setSelectedNodeId(null);
    } else if (selectedNodeId === null) {
      setSelectedNodeId(nodeId);
    } else {
      if (canCreateConnection(selectedNodeId, nodeId) && canReceiveConnection(nodeId)) {
        const newEdge = {
          id: `edge_${Date.now()}`,
          from: selectedNodeId,
          to: nodeId
        };
        
        setEdges(prev => [...prev, newEdge]);
      }
      
      setSelectedNodeId(nodeId);
    }
  };

  const updateImageCaption = (nodeId, caption) => {
    setNodes(prev => ({
      ...prev,
      [nodeId]: {
        ...prev[nodeId],
        data: {
          ...prev[nodeId].data,
          caption
        }
      }
    }));
  };

  const deleteNode = (nodeId) => {
    if (nodeId === 'start') return;
    
    setNodes(prev => {
      const newNodes = { ...prev };
      delete newNodes[nodeId];
      return newNodes;
    });
    
    setEdges(prev => prev.filter(edge => edge.from !== nodeId && edge.to !== nodeId));
    
    // Очищаем состояния если удаляем выделенную или последнюю добавленную ноду
    if (selectedNodeId === nodeId) {
      setSelectedNodeId(null);
    }
    if (lastAddedNodeId === nodeId) {
      setLastAddedNodeId(null);
    }
  };

  const updateNodePosition = (nodeId, position) => {
    setNodes(prev => ({
      ...prev,
      [nodeId]: {
        ...prev[nodeId],
        position
      }
    }));
  };

  const buildViewerPath = (choiceHistory = []) => {
    const path = [];
    let currentNodeId = 'start';
    let choiceIndex = 0;
    const visited = new Set();
    
    while (currentNodeId && !visited.has(currentNodeId)) {
      visited.add(currentNodeId);
      const currentNode = nodes[currentNodeId];
      
      if (!currentNode) break;
      
      if (currentNode.type === 'image') {
        const imageItem = {
          type: 'image',
          nodeId: currentNodeId,
          imageId: currentNode.data.imageId,
          image: images[currentNode.data.imageId],
          caption: currentNode.data.caption,
          hotspots: null  // Будет заполнено если следующая нода - choice
        };
        
        // Проверяем, ведет ли эта image-нода к choice-ноде
        const nextEdge = edges.find(edge => edge.from === currentNodeId);
        const nextNode = nextEdge ? nodes[nextEdge.to] : null;
        
        if (nextNode && nextNode.type === 'choice') {
          // Следующая нода - choice, добавляем хотспоты к текущей image
          const outgoingEdges = edges.filter(edge => edge.from === nextNode.id);
          
          if (outgoingEdges.length > 0) {
            const savedChoice = choiceHistory[choiceIndex];
            const selectedOptionIndex = savedChoice !== undefined ? savedChoice : 0;
            
            const hotspots = outgoingEdges.map((edge, index) => {
              const targetNode = nodes[edge.to];
              const targetImage = targetNode && targetNode.type === 'image' ? images[targetNode.data.imageId] : null;
              const label = targetNode?.data.caption || targetImage?.name || nextNode.data.options[index] || `Вариант ${index + 1}`;
              
              // Позиции хотспотов (используем сохраненные или по умолчанию)
              const defaultX = 10 + (index * 25);
              const defaultY = 10 + (index * 15);
              const position = getHotspotPosition(nextNode.id, edge.id, defaultX, defaultY);
              
              return {
                id: edge.id,
                edgeId: edge.id,
                x: position.x,
                y: position.y,
                width: position.width,
                height: position.height,
                label: label,
                targetNodeId: edge.to,
                optionIndex: index,
                isSelected: index === selectedOptionIndex
              };
            });
            
            imageItem.hotspots = {
              choiceNodeId: nextNode.id,
              choiceIndex: choiceIndex,
              selectedOption: selectedOptionIndex,
              items: hotspots
            };
            
            // Переходим к выбранной цели
            if (outgoingEdges[selectedOptionIndex]) {
              currentNodeId = outgoingEdges[selectedOptionIndex].to;
              choiceIndex++;
            } else {
              currentNodeId = null;
            }
          } else {
            currentNodeId = null;
          }
        } else {
          // Обычная image-нода без choice
          currentNodeId = nextEdge ? nextEdge.to : null;
        }
        
        path.push(imageItem);
        
      } else if (currentNode.type === 'choice') {
        // Этот случай не должен происходить, т.к. choice обрабатываются в image
        const nextEdge = edges.find(edge => edge.from === currentNodeId);
        currentNodeId = nextEdge ? nextEdge.to : null;
        
      } else {
        const nextEdge = edges.find(edge => edge.from === currentNodeId);
        currentNodeId = nextEdge ? nextEdge.to : null;
      }
    }
    
    return path;
  };

  const handleViewerChoice = (choiceIndex, optionIndex) => {
    const newChoiceHistory = [];
    
    // Находим все image-ноды с хотспотами (они содержат информацию о выборах)
    const imageItemsWithHotspots = viewerPath.filter(item => item.type === 'image' && item.hotspots);
    
    for (let i = 0; i < imageItemsWithHotspots.length; i++) {
      if (i < choiceIndex) {
        newChoiceHistory[i] = imageItemsWithHotspots[i].hotspots.selectedOption;
      } else if (i === choiceIndex) {
        newChoiceHistory[i] = optionIndex;
      }
    }
    
    setViewerPath(buildViewerPath(newChoiceHistory));
  };

  const switchToViewer = () => {
    setMode('viewer');
    setViewerPath(buildViewerPath());
  };

  if (mode === 'viewer') {
    return (
      <div className="min-h-screen bg-black">
        <div className="bg-gray-900 text-white p-4 sticky top-0 z-10">
          <div className="flex items-center justify-between max-w-4xl mx-auto">
            <button
              onClick={() => setMode('constructor')}
              className="flex items-center gap-2 px-3 py-1 bg-gray-700 rounded hover:bg-gray-600 transition-colors"
            >
              <ArrowLeft size={16} />
              {t.viewer.backToConstructor}
            </button>
            <div className="text-sm">
              {t.viewer.imagesInStory}: {viewerPath.filter(item => item.type === 'image').length}
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto">
          {viewerPath.length === 0 ? (
            <div className="text-white text-center py-20">
              <p>{t.viewer.storyEmpty}</p>
            </div>
          ) : (
            <div className="space-y-1">
              {viewerPath.map((item, index) => (
                <div key={`${item.nodeId}-${index}`} className="w-full">
                  {item.type === 'image' && item.image ? (
                    <div className="relative">
                      <img 
                        src={item.image.src} 
                        alt={item.image.name}
                        className="w-full h-auto block"
                      />
                      
                      {/* Подпись изображения */}
                      <div className="absolute top-2 right-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded">
                        {item.caption || item.image.name}
                      </div>
                      
                      {/* Хотспоты если есть */}
                      {item.hotspots && (
                        <div className="absolute inset-0">
                          {item.hotspots.items.map((hotspot, hotspotIndex) => (
                            <DraggableHotspot
                              key={hotspot.id}
                              hotspot={{
                                ...hotspot,
                                onClick: () => handleViewerChoice(item.hotspots.choiceIndex, hotspot.optionIndex),
                                title: `Выбрать: ${hotspot.label}`
                              }}
                              choiceNodeId={item.hotspots.choiceNodeId}
                              onPositionUpdate={updateHotspotPosition}
                              isInViewMode={true}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>
              ))}
              
              {viewerPath.length > 0 && (
                <div className="text-center py-8 text-gray-500">
                  <div className="inline-block px-4 py-2 bg-gray-800 rounded">
                    {t.viewer.endOfStory}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b p-4">
        <div className="flex items-center justify-between max-w-full mx-auto">
          <div className="flex items-center gap-4">
            <button
              onClick={onBackToGallery}
              className="flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <ArrowLeft size={16} />
              {t.editor.backToGallery}
            </button>
             <div>
               {/* Редактируемое название */}
               <div className="flex items-center">
                 {isEditingTitle ? (
                   <input
                     type="text"
                     value={projectTitle}
                     onChange={(e) => setProjectTitle(e.target.value)}
                     onKeyDown={handleTitleSave}
                     onBlur={handleTitleSave}
                                         className="text-2xl font-bold text-gray-800 bg-transparent border-b-2 border-blue-500 outline-none"
                    autoFocus
                    placeholder={t.editor.enterTitle}
                   />
                 ) : (
                   <h1 
                     className={`text-2xl font-bold text-gray-800 ${!isReadOnly ? 'cursor-pointer hover:bg-gray-100 px-2 py-1 rounded' : ''}`}
                     onClick={handleTitleClick}
                                         title={!isReadOnly ? t.editor.clickToEdit : ''}
                  >
                    {projectTitle}
                  </h1>
                )}
                {isReadOnly && <span className="ml-2 text-sm bg-yellow-100 text-yellow-800 px-2 py-1 rounded">{t.editor.readOnly}</span>}
               </div>
               
               {/* Редактируемое описание */}
               <div className="flex items-center">
                 {isEditingDescription ? (
                   <input
                     type="text"
                     value={projectDescription}
                     onChange={(e) => setProjectDescription(e.target.value)}
                     onKeyDown={handleDescriptionSave}
                     onBlur={handleDescriptionSave}
                                         className="text-sm text-gray-600 bg-transparent border-b border-blue-400 outline-none"
                    autoFocus
                    placeholder={t.editor.enterDescription}
                   />
                 ) : (
                   <p 
                     className={`text-sm text-gray-600 ${!isReadOnly ? 'cursor-pointer hover:bg-gray-100 px-2 py-1 rounded' : ''}`}
                     onClick={handleDescriptionClick}
                                         title={!isReadOnly ? t.editor.clickToEdit : ''}
                  >
                    {projectDescription}
                  </p>
                )}
                {initialProject && (
                  <span className="ml-2 text-gray-500">• {t.author}: {initialProject.authorName}</span>
                )}
               </div>
             </div>
          </div>
          <div className="flex gap-3">
            <LanguageSwitcher />
            <button
              onClick={switchToViewer}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Eye size={16} />
              {t.editor.viewComic}
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 p-6 max-w-full">
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white rounded-lg shadow-sm p-4">
            <h3 className="font-semibold text-gray-800 mb-3">{t.editor.tools.imagePool}</h3>
            
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
            
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex items-center gap-2 p-2 bg-purple-100 text-purple-800 rounded hover:bg-purple-200 transition-colors mb-3"
            >
              <Upload size={16} />
              {t.editor.tools.uploadImages}
            </button>

            <div className="space-y-2 max-h-64 overflow-y-auto">
              {Object.values(images).map(image => (
                <div 
                  key={image.id} 
                  className="flex items-center gap-2 p-2 bg-gray-50 rounded cursor-pointer hover:bg-gray-100"
                  onClick={() => createImageNode(image.id)}
                >
                  <img src={image.src} alt={image.name} className="w-8 h-8 object-cover rounded" />
                  <span className="text-sm flex-1 truncate">{image.name}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-4">
            <h4 className="font-medium text-gray-700 mb-3">{t.editor.tools.tools}</h4>
            
            <button
              onClick={createChoiceNode}
              className="w-full flex items-center gap-2 p-2 bg-orange-100 text-orange-800 rounded hover:bg-orange-200 transition-colors mb-2"
            >
              <Plus size={16} />
              {t.editor.tools.addChoice}
            </button>

            <button
              onClick={() => centerOnNode('start')}
              className="w-full flex items-center gap-2 p-2 bg-green-100 text-green-800 rounded hover:bg-green-200 transition-colors mb-2"
            >
              <MousePointer size={16} />
              {t.editor.tools.goToStart}
            </button>

            <button
              onClick={disperseNodes}
              className="w-full flex items-center gap-2 p-2 bg-red-100 text-red-800 rounded hover:bg-red-200 transition-colors mb-2"
            >
              <ArrowLeft size={16} className="rotate-45" />
              {t.editor.tools.disperseNodes}
            </button>

            {/* Загрузка превью */}
            <div className="space-y-2">
              <input
                type="file"
                accept="image/*"
                onChange={handleThumbnailUpload}
                style={{ display: 'none' }}
                id="thumbnail-upload"
                disabled={isReadOnly}
              />
              <button
                onClick={() => document.getElementById('thumbnail-upload')?.click()}
                className="w-full flex items-center gap-2 p-2 bg-purple-100 text-purple-800 rounded hover:bg-purple-200 transition-colors"
                disabled={isReadOnly}
              >
                <Upload size={16} />
                {t.editor.tools.uploadThumbnail}
              </button>
              
              {/* Отображение текущего превью */}
              {projectThumbnail && (
                <div className="relative">
                  <img 
                    src={projectThumbnail} 
                    alt="Превью комикса" 
                    className="w-full h-20 object-cover rounded border-2 border-purple-200"
                  />
                  {!isReadOnly && (
                    <button
                      onClick={() => setProjectThumbnail('')}
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600"
                      title={t.editor.tools.deleteThumbnail}
                    >
                      ×
                    </button>
                  )}
                </div>
              )}
            </div>
            
            <div className="mt-3 text-xs text-blue-600 bg-blue-50 p-2 rounded">
              {t.editor.tools.contextHint}
            </div>

            <div className="text-xs text-gray-600 mt-4">
              <div className="mb-2">
                <strong>{t.editor.tools.controls}</strong>
              </div>
              <div>{t.editor.graph.hints.clickImage}</div>
              <div>{t.editor.graph.hints.drag}</div>
              <div>{t.editor.graph.hints.click}</div>
              <div>{t.editor.graph.hints.shiftClick}</div>
              <div>{t.editor.graph.hints.ctrlClick}</div>
              <div>{t.editor.graph.hints.clickCaption}</div>
              
              <div className={`mt-2 p-2 rounded ${selectedNodeId ? 'bg-blue-100 text-blue-800' : 'bg-gray-100'}`}>
                {selectedNodeId 
                  ? t.editor.graph.hints.selected.replace('{type}', nodes[selectedNodeId]?.type || '')
                  : t.editor.graph.hints.notSelected
                }
              </div>
              
              <div className="mt-2 text-xs">
                <strong>{t.editor.tools.connectionRules}</strong>
                <div>{t.editor.graph.rules.start}</div>
                <div>{t.editor.graph.rules.images}</div>
                <div>{t.editor.graph.rules.choices}</div>
                <div>{t.editor.graph.rules.detachable}</div>
              </div>
              
              <div className="mt-2 text-xs">
                <strong>{t.editor.tools.positioning}</strong>
                <div>{t.editor.graph.positioning.first}</div>
                <div>{t.editor.graph.positioning.selected}</div>
                <div>{t.editor.graph.positioning.lastAdded}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-3 space-y-4">
          <div className="bg-white rounded-lg shadow-sm p-4 h-96 lg:h-[400px] relative border">
            <h2 className="text-xl font-semibold mb-4">{t.editor.graph.title}</h2>
            
            <div 
              ref={graphScrollRef}
              className="w-full h-full border border-gray-200 rounded overflow-auto bg-gray-50 relative"
            >
              <div className="relative" style={{ width: '2000px', height: '1500px' }}>
                
                {/* Сетка фона */}
                <div 
                  className="absolute inset-0 opacity-20"
                  style={{
                    backgroundImage: `
                      linear-gradient(to right, #ddd 1px, transparent 1px),
                      linear-gradient(to bottom, #ddd 1px, transparent 1px)
                    `,
                    backgroundSize: '100px 100px'
                  }}
                />
                
                {/* Кликабельный фон для снятия выделения */}
                <div 
                  className="absolute inset-0"
                  style={{ zIndex: 0 }}
                  onClick={() => setSelectedNodeId(null)}
                />
                
                <svg 
                  className="absolute inset-0 w-full h-full pointer-events-none"
                  style={{ zIndex: 1 }}
                  width="2000"
                  height="1500"
                >
                  {edges.map(edge => {
                    const fromNode = nodes[edge.from];
                    const toNode = nodes[edge.to];
                    if (!fromNode || !toNode) return null;
                    
                    const fromX = fromNode.position.x + 50;
                    const fromY = fromNode.position.y + 50;
                    const toX = toNode.position.x + 50;
                    const toY = toNode.position.y + 50;
                    
                    const dx = toX - fromX;
                    const dy = toY - fromY;
                    const length = Math.sqrt(dx * dx + dy * dy);
                    
                    if (length === 0) return null;
                    
                    const unitX = dx / length;
                    const unitY = dy / length;
                    
                    const fromOffset = fromNode.type === 'start' ? 35 : 45;
                    const toOffset = 45;
                    
                    const startX = fromX + unitX * fromOffset;
                    const startY = fromY + unitY * fromOffset;
                    const endX = toX - unitX * toOffset;
                    const endY = toY - unitY * toOffset;
                    
                    const strokeColor = fromNode.type === 'choice' ? '#F59E0B' : '#3B82F6';
                    const strokeWidth = fromNode.type === 'choice' ? 3 : 2;
                    
                    return (
                      <g key={edge.id}>
                        <line
                          x1={startX}
                          y1={startY}
                          x2={endX}
                          y2={endY}
                          stroke={strokeColor}
                          strokeWidth={strokeWidth}
                          markerEnd="url(#arrowhead)"
                          opacity={0.8}
                        />
                        
                        {(selectedNodeId === edge.from || selectedNodeId === edge.to) && (
                          <line
                            x1={startX}
                            y1={startY}
                            x2={endX}
                            y2={endY}
                            stroke="#60A5FA"
                            strokeWidth={strokeWidth + 2}
                            opacity={0.4}
                          />
                        )}
                      </g>
                    );
                  })}
                  
                  <defs>
                    <marker
                      id="arrowhead"
                      markerWidth="12"
                      markerHeight="8"
                      refX="11"
                      refY="4"
                      orient="auto"
                      markerUnits="strokeWidth"
                    >
                      <polygon
                        points="0 0, 12 4, 0 8"
                        fill="#3B82F6"
                        opacity={0.8}
                      />
                    </marker>
                  </defs>
                </svg>

                <div className="relative w-full h-full" style={{ zIndex: 2 }}>
                  {Object.values(nodes).map(node => {
                    const connections = getNodeConnections(node.id);
                    const hasIncoming = connections.incoming.length > 0;
                    const canBeDetached = node.type !== 'start' && hasIncoming;
                    
                    return (
                      <NodeComponent
                        key={node.id}
                        node={node}
                        isSelected={selectedNodeId === node.id}
                        hasIncomingConnections={hasIncoming}
                        canBeDetached={canBeDetached}
                        images={images}
                        onNodeClick={handleNodeClick}
                        onUpdateCaption={updateImageCaption}
                        onDeleteNode={deleteNode}
                        onUpdatePosition={updateNodePosition}
                      />
                    );
                  })}
                </div>
                
                <div 
                  className="absolute bottom-4 right-4 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded pointer-events-none"
                  style={{ zIndex: 10 }}
                >
                  2000 × 1500 px
                </div>
              </div>
            </div>
            
            <div className="mt-2 text-xs text-gray-500 flex justify-between">
              <span>{t.editor.graph.scrollHint}</span>
              <span className={selectedNodeId ? 'text-blue-600 font-medium' : ''}>
                {selectedNodeId 
                  ? t.editor.graph.contextSelected.replace('{type}', nodes[selectedNodeId]?.type || '')
                  : t.editor.graph.selectContext
                }
              </span>
            </div>
          </div>
          
          {/* Панель предпросмотра выделенной ноды */}
          <div className="bg-white rounded-lg shadow-sm p-4 border">
            <h3 className="text-lg font-semibold mb-3 text-gray-800">
              {selectedNodeId ? t.editor.preview.title : t.editor.preview.selectNode}
            </h3>
            
            {selectedNodeId && nodes[selectedNodeId] && (
              <div className="overflow-auto">
                {nodes[selectedNodeId].type === 'start' && (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center text-white font-bold mx-auto mb-2">
                        START
                      </div>
                      <p className="text-gray-600">Начальная точка истории</p>
                      <p className="text-xs text-gray-500 mt-1">
                        Позиция: ({Math.round(nodes[selectedNodeId].position.x)}, {Math.round(nodes[selectedNodeId].position.y)})
                      </p>
                    </div>
                  </div>
                )}
                
                {nodes[selectedNodeId].type === 'image' && (
                  <div className="space-y-3">
                    <div className="w-full">
                      {images[nodes[selectedNodeId].data.imageId] ? (
                        <img 
                          src={images[nodes[selectedNodeId].data.imageId].src}
                          alt={images[nodes[selectedNodeId].data.imageId].name}
                          className="w-full h-auto object-contain rounded border"
                        />
                      ) : (
                        <div className="w-full h-32 bg-gray-200 rounded border flex items-center justify-center text-gray-500">
                          Нет изображения
                        </div>
                      )}
                    </div>
                    <div className="w-full">
                      <p className="font-medium text-gray-800">{nodes[selectedNodeId].data.caption || 'Без подписи'}</p>
                      {images[nodes[selectedNodeId].data.imageId] && (
                        <p className="text-xs text-gray-500 mt-1">
                          Файл: {images[nodes[selectedNodeId].data.imageId].originalName}
                        </p>
                      )}
                      <p className="text-xs text-gray-500 mt-1">
                        ID: {selectedNodeId}
                      </p>
                      <p className="text-xs text-gray-500">
                        Позиция: ({Math.round(nodes[selectedNodeId].position.x)}, {Math.round(nodes[selectedNodeId].position.y)})
                      </p>
                      
                      {/* Информация о связях */}
                      <div className="mt-2 text-xs">
                        {getNodeConnections(selectedNodeId).incoming.length > 0 && (
                          <p className="text-green-600">
                            ← Входящих связей: {getNodeConnections(selectedNodeId).incoming.length}
                          </p>
                        )}
                        {getNodeConnections(selectedNodeId).outgoing.length > 0 && (
                          <p className="text-blue-600">
                            → Исходящих связей: {getNodeConnections(selectedNodeId).outgoing.length}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
                
                {nodes[selectedNodeId].type === 'choice' && (
                  <div className="relative">
                    {/* Фоновое изображение */}
                    {(() => {
                      const previousImageNode = getPreviousImageNode(selectedNodeId);
                      if (previousImageNode && images[previousImageNode.data.imageId]) {
                        const backgroundImage = images[previousImageNode.data.imageId];
                        
                        return (
                          <div className="relative">
                            <img 
                              src={backgroundImage.src}
                              alt={backgroundImage.name}
                              className="w-full h-auto object-contain rounded border"
                            />
                            
                            {/* Хотспоты поверх изображения */}
                            <div className="absolute inset-0">
                              {edges
                                .filter(edge => edge.from === selectedNodeId)
                                .map((edge, index) => {
                                  const targetNode = nodes[edge.to];
                                  const label = targetNode?.data?.caption || nodes[selectedNodeId].data.options[index] || `Вариант ${index + 1}`;
                                  
                                  // Позиция хотспота по умолчанию
                                  const defaultX = 10 + (index * 25);
                                  const defaultY = 10 + (index * 15);
                                  
                                  // Получаем сохраненную позицию или используем позицию по умолчанию
                                  const position = getHotspotPosition(selectedNodeId, edge.id, defaultX, defaultY);
                                  
                                  return (
                                    <DraggableHotspot
                                      key={edge.id}
                                      hotspot={{
                                        id: edge.id,
                                        edgeId: edge.id,
                                        x: position.x,
                                        y: position.y,
                                        width: position.width,
                                        height: position.height,
                                        label: label,
                                        targetNodeId: edge.to,
                                        optionIndex: index,
                                        isSelected: false,
                                        onClick: undefined, // В режиме конструктора не кликабельны
                                        title: `Хотспот: ${label} (перетащите для изменения позиции)`
                                      }}
                                      choiceNodeId={selectedNodeId}
                                      onPositionUpdate={updateHotspotPosition}
                                      isInViewMode={false} // В области предпросмотра можно перетаскивать
                                    />
                                  );
                                })}
                            </div>
                          </div>
                        );
                      } else {
                        // Если нет предыдущего изображения - показываем серую область
                        return (
                          <div className="w-full h-32 bg-gray-200 rounded border flex items-center justify-center text-gray-500">
                            <div className="text-center">
                              <p>Нет фонового изображения</p>
                              <p className="text-xs mt-1">Подключите choice-ноду к image-ноде</p>
                            </div>
                          </div>
                        );
                      }
                    })()}
                    
                    {/* Информационная панель */}
                    <div className="mt-3 p-2 bg-gray-50 rounded text-xs text-gray-600">
                      <p><strong>Заголовок:</strong> {nodes[selectedNodeId].data.title}</p>
                      <p><strong>Вариантов выбора:</strong> {edges.filter(edge => edge.from === selectedNodeId).length}</p>
                      <p><strong>ID:</strong> {selectedNodeId}</p>
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {!selectedNodeId && (
              <div className="flex items-center justify-center h-32 text-gray-400">
                <div className="text-center">
                  <MousePointer size={32} className="mx-auto mb-2 opacity-50" />
                  <p>Кликните на ноду для просмотра деталей</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WebtoonsGraphEditor;