import React, { useState, useRef, useCallback } from 'react';
import { Upload, Plus, Eye, ArrowLeft, Trash2, MousePointer } from 'lucide-react';

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

const WebtoonsGraphEditor = () => {
  const [mode, setMode] = useState('constructor');
  const [images, setImages] = useState({});
  const [nodes, setNodes] = useState({
    'start': {
      id: 'start',
      type: 'start',
      position: { x: 1000, y: 300 },
      data: { title: 'Начало' }
    }
  });
  const [edges, setEdges] = useState([]);
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [lastAddedNodeId, setLastAddedNodeId] = useState(null);
  const [viewerPath, setViewerPath] = useState([]);
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
        caption: images[imageId]?.name || 'Картинка'
      }
    };
    
    setNodes(prev => ({
      ...prev,
      [nodeId]: newNode
    }));
    
    setLastAddedNodeId(nodeId);
    
    setTimeout(() => centerOnNode(nodeId), 100);
  };

  const createChoiceNode = () => {
    const nodeId = `choice_${Date.now()}`;
    const position = findFreePosition('choice');
    
    const newNode = {
      id: nodeId,
      type: 'choice',
      position,
      data: { 
        title: 'Выберите действие:',
        options: ['Вариант 1', 'Вариант 2']
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
        path.push({
          type: 'image',
          nodeId: currentNodeId,
          imageId: currentNode.data.imageId,
          image: images[currentNode.data.imageId],
          caption: currentNode.data.caption
        });
        
        const nextEdge = edges.find(edge => edge.from === currentNodeId);
        currentNodeId = nextEdge ? nextEdge.to : null;
        
      } else if (currentNode.type === 'choice') {
        const outgoingEdges = edges.filter(edge => edge.from === currentNodeId);
        
        if (outgoingEdges.length === 0) break;
        
        const options = outgoingEdges.map(edge => {
          const targetNode = nodes[edge.to];
          const targetImage = targetNode && targetNode.type === 'image' ? images[targetNode.data.imageId] : null;
          return {
            nodeId: edge.to,
            text: targetNode?.data.caption || targetImage?.name || 'Вариант',
            targetNodeId: edge.to
          };
        });
        
        const savedChoice = choiceHistory[choiceIndex];
        const selectedOptionIndex = savedChoice !== undefined ? savedChoice : 0;
        
        path.push({
          type: 'choice',
          nodeId: currentNodeId,
          data: { 
            title: currentNode.data.title,
            options: options.map(opt => opt.text)
          },
          choiceIndex: choiceIndex,
          selectedOption: selectedOptionIndex,
          targetNodes: options.map(opt => opt.targetNodeId)
        });
        
        if (options[selectedOptionIndex]) {
          currentNodeId = options[selectedOptionIndex].targetNodeId;
          choiceIndex++;
        } else {
          break;
        }
        
      } else {
        const nextEdge = edges.find(edge => edge.from === currentNodeId);
        currentNodeId = nextEdge ? nextEdge.to : null;
      }
    }
    
    return path;
  };

  const handleViewerChoice = (choiceIndex, optionIndex) => {
    const newChoiceHistory = [];
    
    const choiceItems = viewerPath.filter(item => item.type === 'choice');
    for (let i = 0; i < choiceItems.length; i++) {
      if (i < choiceIndex) {
        newChoiceHistory[i] = choiceItems[i].selectedOption;
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
              Назад к конструктору
            </button>
            <div className="text-sm">
              Элементов в истории: {viewerPath.length}
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto">
          {viewerPath.length === 0 ? (
            <div className="text-white text-center py-20">
              <p>История пуста. Добавьте контент в граф.</p>
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
                      <div className="absolute top-2 right-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded">
                        {item.caption || item.image.name}
                      </div>
                    </div>
                  ) : item.type === 'choice' ? (
                    <div className="bg-gray-800 text-white p-6 my-4">
                      <h3 className="text-lg mb-4 text-center">{item.data.title}</h3>
                      
                      <div className="space-y-3">
                        {item.data.options.map((option, optIndex) => (
                          <button
                            key={optIndex}
                            onClick={() => handleViewerChoice(item.choiceIndex, optIndex)}
                            className={`block w-full max-w-md mx-auto p-3 rounded transition-colors ${
                              optIndex === item.selectedOption
                                ? 'bg-blue-700 border-2 border-blue-400'
                                : 'bg-blue-600 hover:bg-blue-700'
                            }`}
                          >
                            {optIndex === item.selectedOption && '→ '}
                            {option}
                          </button>
                        ))}
                      </div>
                      
                      <div className="text-center text-gray-400 text-xs mt-4">
                        {item.selectedOption !== undefined 
                          ? `Выбран: ${item.data.options[item.selectedOption]}`
                          : 'Сделайте выбор'
                        }
                      </div>
                    </div>
                  ) : null}
                </div>
              ))}
              
              {viewerPath.length > 0 && (
                <div className="text-center py-8 text-gray-500">
                  <div className="inline-block px-4 py-2 bg-gray-800 rounded">
                    Конец истории
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
          <h1 className="text-2xl font-bold text-gray-800">Web-toons Граф-Конструктор</h1>
          <div className="flex gap-3">
            <button
              onClick={switchToViewer}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Eye size={16} />
              Предпросмотр
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 p-6 max-w-full">
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white rounded-lg shadow-sm p-4">
            <h3 className="font-semibold text-gray-800 mb-3">Пул изображений</h3>
            
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
              Загрузить изображения
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
            <h4 className="font-medium text-gray-700 mb-3">Инструменты</h4>
            
            <button
              onClick={createChoiceNode}
              className="w-full flex items-center gap-2 p-2 bg-orange-100 text-orange-800 rounded hover:bg-orange-200 transition-colors mb-2"
            >
              <Plus size={16} />
              Добавить выбор
            </button>

            <button
              onClick={() => centerOnNode('start')}
              className="w-full flex items-center gap-2 p-2 bg-green-100 text-green-800 rounded hover:bg-green-200 transition-colors mb-2"
            >
              <MousePointer size={16} />
              К началу (START)
            </button>

            <button
              onClick={disperseNodes}
              className="w-full flex items-center gap-2 p-2 bg-red-100 text-red-800 rounded hover:bg-red-200 transition-colors"
            >
              <ArrowLeft size={16} className="rotate-45" />
              Разбросать ноды по кругу
            </button>
            
            <div className="mt-3 text-xs text-blue-600 bg-blue-50 p-2 rounded">
              💡 Новые ноды появляются рядом с выделенной
            </div>

            <div className="text-xs text-gray-600 mt-4">
              <div className="mb-2">
                <strong>Управление:</strong>
              </div>
              <div>• Клик на картинку → создать узел</div>
              <div>• Перетаскивание → свободно перемещать ноду</div>
              <div>• Обычный клик → выделить для контекста</div>
              <div>• Shift+клик → выделить/связать ноды</div>
              <div>• Ctrl+клик → отрезать от родителей</div>
              <div>• Клик на подпись → редактировать</div>
              
              <div className={`mt-2 p-2 rounded ${selectedNodeId ? 'bg-blue-100 text-blue-800' : 'bg-gray-100'}`}>
                {selectedNodeId 
                  ? `Выделена: ${nodes[selectedNodeId]?.type} (новые ноды появятся рядом)` 
                  : 'Клик для выделения контекста'
                }
              </div>
              
              <div className="mt-2 text-xs">
                <strong>Правила связей:</strong>
                <div>• START → только к картинкам (1 выход)</div>
                <div>• Картинки → 1 вход, 1 выход</div>
                <div>• Переключатели → 1 вход, много выходов</div>
                <div>• 🟠 точка = можно отрезать Ctrl+кликом</div>
              </div>
              
              <div className="mt-2 text-xs">
                <strong>Позиционирование новых нод:</strong>
                <div>• Первая → рядом с центром</div>
                <div>• При выделении → рядом с выделенной</div>
                <div>• Иначе → рядом с последней добавленной</div>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-3 space-y-4">
          <div className="bg-white rounded-lg shadow-sm p-4 h-96 lg:h-[400px] relative border">
            <h2 className="text-xl font-semibold mb-4">Граф сценария</h2>
            
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
              <span>Скролл для навигации • Свободное перетаскивание нод</span>
              <span className={selectedNodeId ? 'text-blue-600 font-medium' : ''}>
                {selectedNodeId 
                  ? `Контекст: ${nodes[selectedNodeId]?.type} (новые ноды рядом)` 
                  : 'Кликните на ноду для выбора контекста'
                }
              </span>
            </div>
          </div>
          
          {/* Панель предпросмотра выделенной ноды */}
          <div className="bg-white rounded-lg shadow-sm p-4 border">
            <h3 className="text-lg font-semibold mb-3 text-gray-800">
              {selectedNodeId ? 'Содержимое выделенной ноды' : 'Выберите ноду для просмотра'}
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
                  <div>
                    <div className="bg-orange-50 p-3 rounded">
                      <p className="font-medium text-gray-800 mb-2">{nodes[selectedNodeId].data.title}</p>
                      <div className="space-y-1">
                        {nodes[selectedNodeId].data.options.map((option, idx) => {
                          const outgoingEdges = edges.filter(edge => edge.from === selectedNodeId);
                          const targetNodeId = outgoingEdges[idx]?.to;
                          const targetNode = targetNodeId ? nodes[targetNodeId] : null;
                          
                          return (
                            <div key={idx} className="flex items-center gap-2 text-sm">
                              <span className="text-orange-600">•</span>
                              <span>{option}</span>
                              {targetNode && (
                                <span className="text-xs text-gray-500">
                                  → {targetNode.data.caption || 'Без подписи'}
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    <div className="mt-2 text-xs text-gray-500">
                      <p>ID: {selectedNodeId}</p>
                      <p>Позиция: ({Math.round(nodes[selectedNodeId].position.x)}, {Math.round(nodes[selectedNodeId].position.y)})</p>
                      
                      {/* Информация о связях */}
                      <div className="mt-1">
                        {getNodeConnections(selectedNodeId).incoming.length > 0 && (
                          <p className="text-green-600">
                            ← Входящих связей: {getNodeConnections(selectedNodeId).incoming.length}
                          </p>
                        )}
                        {getNodeConnections(selectedNodeId).outgoing.length > 0 && (
                          <p className="text-blue-600">
                            → Вариантов выбора: {getNodeConnections(selectedNodeId).outgoing.length}
                          </p>
                        )}
                      </div>
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