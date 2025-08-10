// @ts-nocheck
import React, { useState, useRef, useCallback } from 'react';
import { Upload, Plus, Eye, ArrowLeft, Trash2, MousePointer, Undo2, Redo2, Link2, Link2Off, Image as ImageIcon } from 'lucide-react';
import { useLanguage, LanguageSwitcher } from './LanguageContext';
import { getLocalizedGenreName } from './utils/genreTranslations';
import { storageService } from './services/storage.service';
import { projectsService } from './services/projects.service';

// Интерфейс для кликабельных областей (хотспотов) на изображениях
interface Hotspot {
  id: string;
  x: number;        // позиция в % от ширины изображения
  y: number;        // позиция в % от высоты изображения  
  width: number;    // ширина в % от ширины изображения
  height: number;   // высота в % от высоты изображения
  shape?: 'rect' | 'ellipse'; // форма хотспота
  edgeId: string;   // ID связи, к которой привязан хотспот
}

// Компонент перетаскиваемого хотспота (вынесен на уровень модуля)
const DraggableHotspot = React.memo(({ hotspot, choiceNodeId, onHotspotUpdate, isInViewMode = false }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const tempRectRef = useRef<any>(null); // текущий прямоугольник во время drag/resize
  const hotspotRef = useRef(null);
  const dragInfo = useRef(null);
  const resizeInfo = useRef(null);
  const frameRef = useRef<number | null>(null); // rAF
  const isCoarsePointer = React.useMemo(() => {
    if (typeof window === 'undefined' || !(window as any).matchMedia) return false;
    try {
      return window.matchMedia('(pointer: coarse)').matches;
    } catch {
      return false;
    }
  }, []);
  const handleSizePx = isCoarsePointer ? 28 : 12;
  
  const clamp = (val, min, max) => Math.max(min, Math.min(max, val));

  const applyVisualRect = (rect: { x: number; y: number; width?: number; height?: number }) => {
    const el = hotspotRef.current as unknown as HTMLElement | null;
    if (!el) return;
    if (rect.x !== undefined) el.style.left = rect.x + '%';
    if (rect.y !== undefined) el.style.top = rect.y + '%';
    if (rect.width !== undefined) el.style.width = rect.width + '%';
    if (rect.height !== undefined) el.style.height = rect.height + '%';
  };

  const scheduleApply = () => {
    if (frameRef.current) return;
    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = null;
      const rect = tempRectRef.current;
      if (rect) applyVisualRect(rect);
    });
  };

  const handleMouseDown = (e) => {
    if (isInViewMode) return; // В режиме просмотра не перетаскиваем
    if (e.button !== 0) return; // Только левая кнопка мыши
    if (isDragging || isResizing) return; // Уже перетаскиваем/ресайзим
    
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

  // (Здесь не должно быть обработчиков нод)

  React.useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e) => {
      if (!dragInfo.current) return;
      
      // Дополнительная проверка - если кнопка мыши больше не нажата, останавливаем
      if (e.buttons === 0) {
        handleMouseUp();
        return;
      }
      
      const { startX, startY, initialHotspotX, initialHotspotY, containerRect } = dragInfo.current;
      
      const deltaX = ((e.pageX - startX) / containerRect.width) * 100;
      const deltaY = ((e.pageY - startY) / containerRect.height) * 100;
      
      const maxX = 100 - (hotspot.width ?? 20);
      const maxY = 100 - (hotspot.height ?? 8);
      const newX = clamp(initialHotspotX + deltaX, 0, maxX);
      const newY = clamp(initialHotspotY + deltaY, 0, maxY);
      
      tempRectRef.current = { x: newX, y: newY, width: hotspot.width, height: hotspot.height };
      scheduleApply();
    };

    const handleMouseUp = () => {
      // Если есть временная позиция, сохраняем её в глобальное состояние
      if (tempRectRef.current) {
        onHotspotUpdate(choiceNodeId, hotspot.edgeId, { x: tempRectRef.current.x, y: tempRectRef.current.y });
        tempRectRef.current = null;
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
    // PointerEvents (для десктопа)
    const handlePointerMove = (e) => handleMouseMove(e as any);
    const handlePointerUp = () => handleMouseUp();
    document.addEventListener('pointermove', handlePointerMove, { passive: false });
    document.addEventListener('pointerup', handlePointerUp, { passive: false });
    document.addEventListener('contextmenu', handleContextMenu, { passive: false });
    const handleTouchMoveNode = (te) => {
      if (!dragInfo.current) return;
      const t = te.touches && te.touches[0];
      if (!t) return;
      const k = scale || 1;
      const deltaX = (t.pageX - dragInfo.current.startX) / k;
      const deltaY = (t.pageY - dragInfo.current.startY) / k;
      const newX = Math.max(10, Math.min(1900, dragInfo.current.nodeStartX + deltaX));
      const newY = Math.max(10, Math.min(1400, dragInfo.current.nodeStartY + deltaY));
      onUpdatePosition(node.id, { x: newX, y: newY });
      te.preventDefault();
    };
    const handleTouchEndNode = () => {
      handleMouseUp();
    };
    document.addEventListener('touchmove', handleTouchMoveNode, { passive: false });
    document.addEventListener('touchend', handleTouchEndNode, { passive: true });
    // Touch версии
    const handleTouchMove = (te) => {
      if (!dragInfo.current) return;
      if (te.touches.length !== 1) return;
      const touch = te.touches[0];
      const { startX, startY, initialHotspotX, initialHotspotY, containerRect } = dragInfo.current;
      const deltaX = ((touch.pageX - startX) / containerRect.width) * 100;
      const deltaY = ((touch.pageY - startY) / containerRect.height) * 100;
      const maxX = 100 - (hotspot.width ?? 20);
      const maxY = 100 - (hotspot.height ?? 8);
      const newX = clamp(initialHotspotX + deltaX, 0, maxX);
      const newY = clamp(initialHotspotY + deltaY, 0, maxY);
      tempRectRef.current = { x: newX, y: newY, width: hotspot.width, height: hotspot.height };
      scheduleApply();
      te.preventDefault();
    };
    const handleTouchEnd = () => {
      if (tempRectRef.current) {
        onHotspotUpdate(choiceNodeId, hotspot.edgeId, { x: tempRectRef.current.x, y: tempRectRef.current.y });
        tempRectRef.current = null;
      }
      setIsDragging(false);
      dragInfo.current = null;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd, { passive: false });
    
    // Cleanup функция
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
      document.removeEventListener('pointermove', handlePointerMove as any);
      document.removeEventListener('pointerup', handlePointerUp as any);
    };
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [isDragging, choiceNodeId, hotspot.edgeId, onHotspotUpdate, hotspot.width, hotspot.height]);

  const handleTouchStart = (e) => {
    if (isInViewMode) return;
    if (isDragging || isResizing) return;
    if (e.touches.length !== 1) return; // одиночный палец — drag, 2 пальца — pinch/pan канвы
    const touch = e.touches[0];
    const container = hotspotRef.current?.parentElement;
    if (!container) return;
    dragInfo.current = {
      startX: touch.pageX,
      startY: touch.pageY,
      initialHotspotX: hotspot.x,
      initialHotspotY: hotspot.y,
      containerRect: container.getBoundingClientRect()
    };
    setIsDragging(true);
    document.body.style.cursor = 'grabbing';
    document.body.style.userSelect = 'none';
    e.preventDefault();
  };

  const handleResizeMouseDown = (e) => {
    if (isInViewMode) return;
    if (e.button !== 0) return;
    if (isDragging || isResizing) return;

    e.preventDefault();
    e.stopPropagation();

    const container = hotspotRef.current?.parentElement;
    if (!container) return;

    resizeInfo.current = {
      startX: e.pageX,
      startY: e.pageY,
      initialWidth: hotspot.width ?? 20,
      initialHeight: hotspot.height ?? 8,
      initialX: hotspot.x,
      initialY: hotspot.y,
      containerRect: container.getBoundingClientRect()
    };
    setIsResizing(true);
    document.body.style.cursor = 'nwse-resize';
    document.body.style.userSelect = 'none';
  };

  React.useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e) => {
      if (!resizeInfo.current) return;

      if (e.buttons === 0) {
        handleMouseUp();
        return;
      }

      const { startX, startY, initialWidth, initialHeight, initialX, initialY, containerRect } = resizeInfo.current;
      const deltaX = ((e.pageX - startX) / containerRect.width) * 100;
      const deltaY = ((e.pageY - startY) / containerRect.height) * 100;

      const minW = 6; // минимальная ширина в %
      const minH = 4; // минимальная высота в %
      const maxW = 100 - initialX;
      const maxH = 100 - initialY;
      const nextW = clamp(initialWidth + deltaX, minW, maxW);
      const nextH = clamp(initialHeight + deltaY, minH, maxH);

      tempRectRef.current = { x: hotspot.x, y: hotspot.y, width: nextW, height: nextH };
      scheduleApply();
    };

    const handleMouseUp = () => {
      if (tempRectRef.current) {
        onHotspotUpdate(choiceNodeId, hotspot.edgeId, { width: tempRectRef.current.width, height: tempRectRef.current.height });
        tempRectRef.current = null;
      }
      setIsResizing(false);
      resizeInfo.current = null;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    const handleContextMenu = (e) => {
      if (isResizing) {
        e.preventDefault();
        handleMouseUp();
      }
    };

    document.addEventListener('mousemove', handleMouseMove, { passive: false });
    document.addEventListener('mouseup', handleMouseUp, { passive: false });
    document.addEventListener('contextmenu', handleContextMenu, { passive: false });
    // PointerEvents (для десктопа)
    const handlePointerMove = (e) => handleMouseMove(e as any);
    const handlePointerUp = () => handleMouseUp();
    document.addEventListener('pointermove', handlePointerMove, { passive: false });
    document.addEventListener('pointerup', handlePointerUp, { passive: false });
    // Touch версии
    const handleTouchMove = (te) => {
      if (!resizeInfo.current) return;
      if (te.touches.length !== 1) return;
      const touch = te.touches[0];
      const { startX, startY, initialWidth, initialHeight, initialX, initialY, containerRect } = resizeInfo.current;
      const deltaX = ((touch.pageX - startX) / containerRect.width) * 100;
      const deltaY = ((touch.pageY - startY) / containerRect.height) * 100;
      const minW = 6;
      const minH = 4;
      const maxW = 100 - initialX;
      const maxH = 100 - initialY;
      const nextW = clamp(initialWidth + deltaX, minW, maxW);
      const nextH = clamp(initialHeight + deltaY, minH, maxH);
      tempRectRef.current = { x: hotspot.x, y: hotspot.y, width: nextW, height: nextH };
      scheduleApply();
      te.preventDefault();
    };
    const handleTouchEnd = () => {
      if (tempRectRef.current) {
        onHotspotUpdate(choiceNodeId, hotspot.edgeId, { width: tempRectRef.current.width, height: tempRectRef.current.height });
        tempRectRef.current = null;
      }
      setIsResizing(false);
      resizeInfo.current = null;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd, { passive: false });

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
      document.removeEventListener('pointermove', handlePointerMove as any);
      document.removeEventListener('pointerup', handlePointerUp as any);
      document.removeEventListener('pointermove', handlePointerMove as any);
      document.removeEventListener('pointerup', handlePointerUp as any);
    };
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [isResizing, choiceNodeId, hotspot.edgeId, onHotspotUpdate, hotspot.x, hotspot.y]);
  
  const handleClick = (e) => {
    if (isInViewMode && hotspot.onClick) {
      e.preventDefault();
      e.stopPropagation();
      hotspot.onClick();
    }
  };
  
  const toggleShape = (e) => {
    if (isInViewMode) return;
    e.preventDefault();
    e.stopPropagation();
    const next = (hotspot.shape || 'rect') === 'rect' ? 'ellipse' : 'rect';
    onHotspotUpdate(choiceNodeId, hotspot.edgeId, { shape: next });
  };

  const handlePointerDown = (e) => {
    // Упрощённый унификатор: для primary мыши и touch перенаправляем в mouse-логику
    if (isInViewMode) return;
    // Только primary (левый) для мыши или любое касание
    const isPrimaryMouse = e.pointerType === 'mouse' && e.button === 0;
    const isTouch = e.pointerType === 'touch';
    if (!isPrimaryMouse && !isTouch) return;
    try {
      (e.target as any)?.setPointerCapture?.(e.pointerId);
    } catch {}
    // Превращаем в поведение как mousedown/touchstart
    if (isTouch) {
      // Синтетический вызов touch-start логики
      const fakeTouchEvent = {
        touches: [{ pageX: e.pageX, pageY: e.pageY }],
        preventDefault: () => e.preventDefault()
      } as any;
      handleTouchStart(fakeTouchEvent);
    } else {
      handleMouseDown(e);
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
        left: `${hotspot.x}%`,
        top: `${hotspot.y}%`,
        width: `${hotspot.width}%`,
        height: `${hotspot.height}%`,
        minWidth: '60px',
        minHeight: '24px',
        zIndex: isDragging || isResizing ? 1000 : 1,
        borderRadius: hotspot.shape === 'ellipse' ? '9999px' : '0.375rem',
        touchAction: 'none',
        willChange: 'left, top, width, height'
      }}
      onPointerDown={handlePointerDown}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      onClick={handleClick}
      title={hotspot.title}
    >
      {/* В режиме просмотра показываем текст только при hover */}
      <span className={isInViewMode ? "opacity-0 hover:opacity-100 transition-opacity duration-200" : ""}>
        {hotspot.isSelected && '✓ '}
        {hotspot.label}
      </span>
      {!isInViewMode && (
        <>
          {/* Переключатель формы */}
          <button
            onMouseDown={(e) => e.stopPropagation()}
            onClick={toggleShape}
            className="absolute top-0.5 left-0.5 w-5 h-5 bg-black/40 hover:bg-black/60 text-white rounded flex items-center justify-center"
            title={hotspot.shape === 'ellipse' ? 'Форма: овал (кликните для прямоугольника)' : 'Форма: прямоугольник (кликните для овала)'}
          >
            {hotspot.shape === 'ellipse' ? '◯' : '▭'}
          </button>
          {/* Хэндл ресайза */}
          <div
            onMouseDown={handleResizeMouseDown}
            onPointerDown={(e) => {
              if (isInViewMode) return;
              if (isDragging || isResizing) return;
              try { (e.currentTarget as any)?.setPointerCapture?.(e.pointerId); } catch {}
              const container = hotspotRef.current?.parentElement;
              if (!container) return;
              resizeInfo.current = {
                startX: (e as any).pageX,
                startY: (e as any).pageY,
                initialWidth: hotspot.width ?? 20,
                initialHeight: hotspot.height ?? 8,
                initialX: hotspot.x,
                initialY: hotspot.y,
                containerRect: container.getBoundingClientRect()
              };
              setIsResizing(true);
              document.body.style.cursor = 'nwse-resize';
              document.body.style.userSelect = 'none';
              e.preventDefault();
              e.stopPropagation();
            }}
            onTouchStart={(e) => {
              if (isInViewMode) return;
              if (isDragging || isResizing) return;
              const touch = e.touches?.[0];
              if (!touch) return;
              const container = hotspotRef.current?.parentElement;
              if (!container) return;
              resizeInfo.current = {
                startX: touch.pageX,
                startY: touch.pageY,
                initialWidth: hotspot.width ?? 20,
                initialHeight: hotspot.height ?? 8,
                initialX: hotspot.x,
                initialY: hotspot.y,
                containerRect: container.getBoundingClientRect()
              };
              setIsResizing(true);
              document.body.style.cursor = 'nwse-resize';
              document.body.style.userSelect = 'none';
              e.preventDefault();
              e.stopPropagation();
            }}
            className="absolute bg-white border border-gray-500 rounded-sm cursor-nwse-resize"
            style={{
              right: '-2px',
              bottom: '-2px',
              width: `${handleSizePx}px`,
              height: `${handleSizePx}px`,
            }}
            title="Изменить размер"
          />
        </>
      )}
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
  onUpdatePosition,
  scale,
  panActive
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const dragInfo = useRef(null);
  const [isEditing, setIsEditing] = useState(false);

  const handleMouseDown = (e) => {
    // Только левая кнопка мыши
    if (e.button !== 0) return;
    // Во время панорамирования не перехватываем события — пусть дойдут до канвы
    if (panActive) return;
    
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

  // Touch-старт перетаскивания ноды (мобильные устройства)
  const handleTouchStartNode = (e) => {
    if (panActive) return;
    if (isDragging) return;
    const touch = e.touches && e.touches[0];
    if (!touch) return;

    e.preventDefault();
    e.stopPropagation();

    dragInfo.current = {
      startX: touch.pageX,
      startY: touch.pageY,
      nodeStartX: node.position.x,
      nodeStartY: node.position.y
    };

    setIsDragging(true);
    document.body.style.cursor = 'grabbing';
    document.body.style.userSelect = 'none';
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
      
      const k = scale || 1;
      const deltaX = (e.pageX - dragInfo.current.startX) / k;
      const deltaY = (e.pageY - dragInfo.current.startY) / k;
      
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

    // Добавляем обработчики мыши
    document.addEventListener('mousemove', handleMouseMove, { passive: false });
    document.addEventListener('mouseup', handleMouseUp, { passive: false });
    document.addEventListener('contextmenu', handleContextMenu, { passive: false });

    // Обработчики touch для мобильных
    const handleTouchMoveNode = (te) => {
      if (!dragInfo.current) return;
      const t = te.touches && te.touches[0];
      if (!t) return;
      const k = scale || 1;
      const deltaX = (t.pageX - dragInfo.current.startX) / k;
      const deltaY = (t.pageY - dragInfo.current.startY) / k;
      const newX = Math.max(10, Math.min(1900, dragInfo.current.nodeStartX + deltaX));
      const newY = Math.max(10, Math.min(1400, dragInfo.current.nodeStartY + deltaY));
      onUpdatePosition(node.id, { x: newX, y: newY });
      te.preventDefault();
    };

    const handleTouchEndNode = () => {
      handleMouseUp();
    };

    document.addEventListener('touchmove', handleTouchMoveNode, { passive: false });
    document.addEventListener('touchend', handleTouchEndNode, { passive: true });
    
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
      document.removeEventListener('touchmove', handleTouchMoveNode as any);
      document.removeEventListener('touchend', handleTouchEndNode as any);
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
        onTouchStart={handleTouchStartNode}
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
        onTouchStart={handleTouchStartNode}
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
        onTouchStart={handleTouchStartNode}
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
  suppressSave?: boolean;
  initialMode?: 'viewer' | 'constructor';
  onSaveProject: (projectData: { nodes?: any; edges?: any; images?: any; title?: string; description?: string; thumbnail?: string; isPublic?: boolean; isPublished?: boolean; onlyMeta?: boolean }) => void;
  onBackToGallery: () => void;
}

const WebtoonsGraphEditor = ({ initialProject, currentUser, isReadOnly, suppressSave = false, initialMode = 'constructor', onSaveProject, onBackToGallery }: WebtoonsGraphEditorProps) => {
  const { t, language } = useLanguage() as any;
  const [mode, setMode] = useState(initialMode);
  const [images, setImages] = useState(() => {
    // Сначала пробуем получить изображения из отдельного объекта images
    if (initialProject?.images && Object.keys(initialProject.images).length > 0) {
      console.log('🖼️ Инициализация изображений из initialProject.images:', {
        count: Object.keys(initialProject.images).length,
        ids: Object.keys(initialProject.images)
      });
      return initialProject.images;
    }
    
    console.log('🖼️ Нет изображений для инициализации');
    return {};
  });
  const [projectTitle, setProjectTitle] = useState(initialProject?.title || t.editor.newComic);
  const [projectDescription, setProjectDescription] = useState(initialProject?.description || t.editor.comicDescription);
  const [projectThumbnail, setProjectThumbnail] = useState(initialProject?.thumbnail || '');
  const [isUploadingThumbnail, setIsUploadingThumbnail] = useState(false);
  const [thumbnailPreviewUrl, setThumbnailPreviewUrl] = useState<string | ''>('');
  const [genreId, setGenreId] = useState<string | undefined>((initialProject as any)?.genre_id);
  const [genres, setGenres] = useState<any[]>([]);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  // Режим публикации: draft (видит только автор) или public (видят все)
  const [publishState, setPublishState] = useState<'draft' | 'public'>(
    initialProject && (initialProject as any).is_public && (initialProject as any).is_published ? 'public' : 'draft'
  );
  const initialPublishRef = React.useRef(publishState);
  const firstChangeRef = React.useRef(false);
  const initialGenreRef = React.useRef<string | undefined>(genreId);

  // загрузка жанров из БД для селекта
  React.useEffect(() => {
    (async () => {
      try {
        const list = await projectsService.getGenres();
        setGenres(list || []);
      } catch (e) {
        console.warn('Не удалось загрузить жанры', e);
      }
    })();
  }, []);
  
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
  const [zoom, setZoom] = useState(1);
  const [isWheelOverCanvas, setIsWheelOverCanvas] = useState(false);
  const graphScrollRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const mobileFileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploadQueue, setUploadQueue] = useState<{ id: string; name: string; progress: number }[]>([]);
  const [comments, setComments] = useState<any[]>([]);
  const [commentText, setCommentText] = useState('');
  const [isCommentSubmitting, setIsCommentSubmitting] = useState(false);
  // Режимы инструментов
  const [linkMode, setLinkMode] = useState(false);
  const [panMode, setPanMode] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const panInfoRef = useRef<any>(null);
  const [isSpaceDown, setIsSpaceDown] = useState(false);
  // Детектируем мобильный (coarse) указатель для адаптивного UI
  const [isCoarse, setIsCoarse] = useState(false);
  const [isMobileGalleryOpen, setIsMobileGalleryOpen] = useState(false);
  const [isMobileHotspotEditorOpen, setIsMobileHotspotEditorOpen] = useState(false);
  // Мобильный разделитель (верх: граф, низ: предпросмотр)
  const [mobileSplitRatio, setMobileSplitRatio] = useState(0.55); // доля высоты для графа [0.3..0.85]
  const isSplittingRef = useRef(false);
  const splitStartRef = useRef<{ startY: number; startRatio: number } | null>(null);
  React.useEffect(() => {
    if (typeof window === 'undefined' || !(window as any).matchMedia) return;
    const m = window.matchMedia('(pointer: coarse)');
    const update = () => setIsCoarse(!!m.matches);
    update();
    m.addEventListener?.('change', update);
    return () => m.removeEventListener?.('change', update);
  }, []);

  // Сохраняем/восстанавливаем положение разделителя (только для mobile)
  React.useEffect(() => {
    if (!isCoarse) return;
    const saved = localStorage.getItem('mobileSplitRatio');
    if (saved) {
      const v = parseFloat(saved);
      if (!Number.isNaN(v) && v > 0.3 && v < 0.85) setMobileSplitRatio(v);
    }
  }, [isCoarse]);
  React.useEffect(() => {
    if (isCoarse) localStorage.setItem('mobileSplitRatio', String(mobileSplitRatio));
  }, [isCoarse, mobileSplitRatio]);

  // Открывать мобильный редактор хот-спотов при выборе choice-ноды
  React.useEffect(() => {
    if (!isCoarse) return;
    if (!selectedNodeId) {
      setIsMobileHotspotEditorOpen(false);
      return;
    }
    const node = nodes[selectedNodeId];
    if (node?.type === 'choice') {
      setIsMobileHotspotEditorOpen(true);
    } else {
      setIsMobileHotspotEditorOpen(false);
    }
  }, [isCoarse, selectedNodeId, nodes]);

  // =====================
  // Undo / Redo (локальная история)
  // =====================
  const historyRef = useRef<any[]>([]);
  const redoRef = useRef<any[]>([]);
  const historyTimerRef = useRef<any>(null);
  const MAX_HISTORY = 30;

  const makeSnapshot = useCallback(() => ({
    nodes: JSON.parse(JSON.stringify(nodes)),
    edges: JSON.parse(JSON.stringify(edges)),
    images: JSON.parse(JSON.stringify(images)),
  }), [nodes, edges, images]);

  const applySnapshot = useCallback((snap) => {
    if (!snap) return;
    setNodes(JSON.parse(JSON.stringify(snap.nodes || {})));
    setEdges(JSON.parse(JSON.stringify(snap.edges || [])));
    setImages(JSON.parse(JSON.stringify(snap.images || {})));
  }, []);

  const pushHistoryDebounced = useCallback(() => {
    if (mode !== 'constructor') return; // в режиме просмотра не пишем историю
    if (historyTimerRef.current) clearTimeout(historyTimerRef.current);
    historyTimerRef.current = setTimeout(() => {
      const current = makeSnapshot();
      const last = historyRef.current[historyRef.current.length - 1];
      // Простая защита от дубликатов
      if (last && JSON.stringify(last) === JSON.stringify(current)) return;
      historyRef.current.push(current);
      if (historyRef.current.length > MAX_HISTORY) historyRef.current.shift();
      // Любое новое действие очищает redo-стек
      redoRef.current = [];
    }, 400); // 400–500 мс достаточно, чтобы не спамить при drag
  }, [makeSnapshot, mode]);

  // Инициализируем стартовую точку в истории
  React.useEffect(() => {
    if (mode !== 'constructor') return;
    historyRef.current = [makeSnapshot()];
    redoRef.current = [];
    return () => {
      if (historyTimerRef.current) clearTimeout(historyTimerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Пишем историю на изменения графа (в конструкторе)
  React.useEffect(() => {
    if (mode !== 'constructor') return;
    pushHistoryDebounced();
  }, [nodes, edges, images, mode, pushHistoryDebounced]);

  // Хоткеи Ctrl+Z / Ctrl+Shift+Z (по scancode, работает во всех раскладках)
  React.useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (mode !== 'constructor') return;
      if (e.code === 'Space') {
        // включаем временное панорамирование пробелом
        setIsSpaceDown(true);
        // избегаем прокрутки страницы пробелом
        e.preventDefault();
      }
      const isCtrlOrMeta = e.ctrlKey || e.metaKey;
      if (!isCtrlOrMeta) return;
      const code = e.code; // KeyZ/KeyY независимо от раскладки
      if (code === 'KeyZ' && !e.shiftKey) {
        e.preventDefault();
        const stack = historyRef.current;
        if (stack.length <= 1) return; // нечего откатывать
        const current = stack.pop();
        redoRef.current.push(current);
        const prev = stack[stack.length - 1];
        applySnapshot(prev);
      } else if (code === 'KeyY' || (code === 'KeyZ' && e.shiftKey)) {
        e.preventDefault();
        const redoStack = redoRef.current;
        if (redoStack.length === 0) return;
        const snap = redoStack.pop();
        if (snap) {
          // Текущую в историю
          historyRef.current.push(makeSnapshot());
          applySnapshot(snap);
        }
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') setIsSpaceDown(false);
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [applySnapshot, makeSnapshot, mode]);

  // Очищаем историю при размонтировании редактора (выход в галерею). Переключение viewer/constructor компонент не размонтирует — история сохранится
  React.useEffect(() => {
    return () => {
      historyRef.current = [];
      redoRef.current = [];
      if (historyTimerRef.current) clearTimeout(historyTimerRef.current);
    };
  }, []);

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

  // Меняем режим, если изменился initialMode
  React.useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  // Автосохранение контента (без статусов публикации)
  React.useEffect(() => {
    if (mode !== 'constructor') return; // в просмотре не сохраняем
    if (suppressSave || isReadOnly) return;
    if (isUploadingThumbnail) return;
    if (!initialProject && Object.keys(nodes).length === 1 && edges.length === 0) return;

    const timeoutId = setTimeout(() => {
      // если ещё не было изменений, фиксируем факт первого изменения
      if (!firstChangeRef.current) firstChangeRef.current = true;
      onSaveProject({
        nodes,
        edges,
        images,
        title: projectTitle,
        description: projectDescription,
        thumbnail: projectThumbnail,
        genre_id: genreId
      });
    }, 1500); // слегка увеличили паузу, чтобы не триггерить частые сохранения при перетаскивании

    return () => clearTimeout(timeoutId);
  }, [mode, nodes, edges, images, projectTitle, projectDescription, projectThumbnail, genreId, onSaveProject, suppressSave, isReadOnly, isUploadingThumbnail]);

  // Лёгкое сохранение статуса публикации (без новой версии)
  React.useEffect(() => {
    if (mode !== 'constructor') return;
    if (suppressSave || isReadOnly) return;
    if (!initialProject) return;
    // сохраняем публичность только после первого изменения
    if (!firstChangeRef.current) return;
    const timeoutId = setTimeout(() => {
      onSaveProject({
        isPublic: publishState === 'public',
        isPublished: publishState === 'public',
        onlyMeta: true
      });
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [mode, publishState, suppressSave, isReadOnly, initialProject, onSaveProject]);

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
  const handleThumbnailUpload = async (event) => {
    const file = event.target.files?.[0];
    // Очищаем input чтобы можно было загрузить тот же файл повторно
    event.target.value = '';
    if (!file || !file.type.startsWith('image/')) return;

    // Локальный превью до загрузки
    const objectUrl = URL.createObjectURL(file);
    setThumbnailPreviewUrl(objectUrl);
    setIsUploadingThumbnail(true);

    try {
      if (!initialProject?.id) {
        console.warn('Нет id проекта для загрузки превью');
        return;
      }
      const res = await storageService.uploadThumbnail(initialProject.id, file);
      if (res.url) {
        setProjectThumbnail(res.url);
      } else {
        console.error('Не удалось загрузить превью:', res.error);
      }
    } catch (e) {
      console.error('Thumbnail upload error:', e);
    } finally {
      setIsUploadingThumbnail(false);
      // Очищаем object URL когда получили финальный URL
      setTimeout(() => {
        if (objectUrl) URL.revokeObjectURL(objectUrl);
        setThumbnailPreviewUrl('');
      }, 0);
    }
  };

  // Восстановление позиции скролла при загрузке проекта (или центрирование на START при первом открытии)
  React.useEffect(() => {
    if (!graphScrollRef.current || !initialProject) return;
    const savedScrollKey = `scroll-${initialProject.id}`;
    const savedScroll = localStorage.getItem(savedScrollKey);
    if (savedScroll) {
      try {
        const { x, y } = JSON.parse(savedScroll);
        graphScrollRef.current.scrollLeft = x;
        graphScrollRef.current.scrollTop = y;
        setScrollPosition({ x, y });
        return;
      } catch (error) {
        console.error('Ошибка восстановления позиции скролла:', error);
      }
    }
    // Если сохранённой позиции нет — центрируемся на START
    setTimeout(() => centerOnNode('start'), 0);
  }, [initialProject]);

  // Сохранение позиции скролла
  const handleScroll = React.useCallback(() => {
    if (!graphScrollRef.current || !initialProject) return;
    const { scrollLeft, scrollTop } = graphScrollRef.current;
    const newPosition = { x: scrollLeft, y: scrollTop };
    setScrollPosition(newPosition);
    const savedScrollKey = `scroll-${initialProject.id}`;
    localStorage.setItem(savedScrollKey, JSON.stringify(newPosition));
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

  // Глобальный перехват wheel: зумим при Ctrl + колесо, только когда курсор над канвой
  React.useEffect(() => {
    const container = graphScrollRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      if (!isWheelOverCanvas || !e.ctrlKey) return;
      e.preventDefault();
      e.stopPropagation();

      const rect = container.getBoundingClientRect();
      const offsetX = e.clientX - rect.left;
      const offsetY = e.clientY - rect.top;
      const currentZoom = zoom || 1;
      const worldX = (container.scrollLeft + offsetX) / currentZoom;
      const worldY = (container.scrollTop + offsetY) / currentZoom;
      const delta = -e.deltaY;
      const factor = delta > 0 ? 1.1 : 0.9;
      const nextZoom = Math.min(2, Math.max(0.5, currentZoom * factor));
      setZoom(nextZoom);
      container.scrollLeft = Math.max(0, worldX * nextZoom - offsetX);
      container.scrollTop = Math.max(0, worldY * nextZoom - offsetY);
    };

    // Вешаем на window, чтобы перехватывать в любом случае
    window.addEventListener('wheel', handleWheel, { passive: false, capture: true });
    return () => window.removeEventListener('wheel', handleWheel, { capture: true } as any);
  }, [zoom, isWheelOverCanvas]);

  // Кнопки Undo/Redo в UI
  const uiUndo = React.useCallback(() => {
    if (mode !== 'constructor') return;
    const stack = historyRef.current;
    if (!stack || stack.length <= 1) return;
    const current = stack.pop();
    redoRef.current.push(current);
    const prev = stack[stack.length - 1];
    applySnapshot(prev);
  }, [mode, applySnapshot]);

  const uiRedo = React.useCallback(() => {
    if (mode !== 'constructor') return;
    const redoStack = redoRef.current;
    if (!redoStack || redoStack.length === 0) return;
    const snap = redoStack.pop();
    if (snap) {
      historyRef.current.push(makeSnapshot());
      applySnapshot(snap);
    }
  }, [mode, applySnapshot, makeSnapshot]);

  // Панорамирование мышью: правая кнопка, Space+drag, либо включённый panMode
  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!graphScrollRef.current) return;
    const isRightButton = e.button === 2;
    const panActivated = panMode || isSpaceDown || isRightButton;
    if (!panActivated) return; // если не панорамируем — не перехватываем; ноды обрабатывают drag сами
    e.preventDefault();
    e.stopPropagation();
    const container = graphScrollRef.current;
    panInfoRef.current = {
      startX: e.pageX,
      startY: e.pageY,
      startLeft: container.scrollLeft,
      startTop: container.scrollTop
    };
    setIsPanning(true);
    document.body.style.cursor = 'grabbing';
    document.body.style.userSelect = 'none';
  };

  React.useEffect(() => {
    if (!isPanning) return;
    const handleMouseMove = (e: MouseEvent) => {
      if (!panInfoRef.current || !graphScrollRef.current) return;
      const container = graphScrollRef.current;
      const dx = e.pageX - panInfoRef.current.startX;
      const dy = e.pageY - panInfoRef.current.startY;
      container.scrollLeft = panInfoRef.current.startLeft - dx;
      container.scrollTop = panInfoRef.current.startTop - dy;
    };
    const endPan = () => {
      setIsPanning(false);
      panInfoRef.current = null;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    const handleContextMenu = (e: MouseEvent) => {
      if (isPanning) {
        e.preventDefault();
        endPan();
      }
    };
    document.addEventListener('mousemove', handleMouseMove, { passive: true });
    document.addEventListener('mouseup', endPan, { passive: true });
    document.addEventListener('contextmenu', handleContextMenu, { passive: false });
    return () => {
      document.removeEventListener('mousemove', handleMouseMove as any);
      document.removeEventListener('mouseup', endPan as any);
      document.removeEventListener('contextmenu', handleContextMenu as any);
    };
  }, [isPanning]);

  // Touch жесты: двухпальцевый pan и pinch‑to‑zoom
  const pinchInfoRef = useRef<any>(null);
  const onTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!graphScrollRef.current) return;
    if (e.touches.length >= 2) {
      e.preventDefault();
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const cx = (t1.clientX + t2.clientX) / 2;
      const cy = (t1.clientY + t2.clientY) / 2;
      const dx = t1.clientX - t2.clientX;
      const dy = t1.clientY - t2.clientY;
      const dist = Math.hypot(dx, dy);
      const container = graphScrollRef.current;
      const rect = container.getBoundingClientRect();
      const offsetX = cx - rect.left;
      const offsetY = cy - rect.top;
      pinchInfoRef.current = {
        startCenterX: cx,
        startCenterY: cy,
        startOffsetX: offsetX,
        startOffsetY: offsetY,
        startLeft: container.scrollLeft,
        startTop: container.scrollTop,
        startZoom: zoom,
        startDist: dist,
        worldX: (container.scrollLeft + offsetX) / (zoom || 1),
        worldY: (container.scrollTop + offsetY) / (zoom || 1)
      };
    }
  };
  const onTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!graphScrollRef.current) return;
    if (e.touches.length >= 2 && pinchInfoRef.current) {
      e.preventDefault();
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const cx = (t1.clientX + t2.clientX) / 2;
      const cy = (t1.clientY + t2.clientY) / 2;
      const dx = t1.clientX - t2.clientX;
      const dy = t1.clientY - t2.clientY;
      const dist = Math.hypot(dx, dy);
      const scaleFactor = dist / (pinchInfoRef.current.startDist || 1);
      const nextZoom = Math.min(2, Math.max(0.5, (pinchInfoRef.current.startZoom || 1) * scaleFactor));
      setZoom(nextZoom);
      const container = graphScrollRef.current;
      const rect = container.getBoundingClientRect();
      const offsetX = cx - rect.left;
      const offsetY = cy - rect.top;
      // Панорамирование по смещению центра жеста
      const centerDx = cx - pinchInfoRef.current.startCenterX;
      const centerDy = cy - pinchInfoRef.current.startCenterY;
      // Сохранение фокуса по world координате
      container.scrollLeft = Math.max(0, pinchInfoRef.current.worldX * nextZoom - offsetX - centerDx);
      container.scrollTop = Math.max(0, pinchInfoRef.current.worldY * nextZoom - offsetY - centerDy);
    }
  };
  const onTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length < 2) {
      pinchInfoRef.current = null;
    }
  };

  const handleImageUpload = (event) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;
    // Сбрасываем, чтобы можно было выбрать те же файлы повторно
    if (event.target) (event.target as HTMLInputElement).value = '';

    files.forEach((file) => {
      const tmpId = `up_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      setUploadQueue(prev => [...prev, { id: tmpId, name: file.name, progress: 0 }]);

      const reader = new FileReader();
      reader.onprogress = (e) => {
        if (e.lengthComputable) {
          const pct = Math.round((e.loaded / e.total) * 100);
          setUploadQueue(prev => prev.map(it => it.id === tmpId ? { ...it, progress: pct } : it));
        }
      };
      reader.onload = (e) => {
        const imageId = `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const newImage = {
          id: imageId,
          name: file.name.replace(/\.[^/.]+$/, ""),
          src: (e?.target as any)?.result,
          originalName: file.name
        };
        setImages(prev => ({ ...prev, [imageId]: newImage }));
        setUploadQueue(prev => prev.filter(it => it.id !== tmpId));
      };
      reader.onerror = () => {
        setUploadQueue(prev => prev.filter(it => it.id !== tmpId));
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
  const updateHotspot = useCallback((choiceNodeId: string, edgeId: string, partial: { x?: number; y?: number; width?: number; height?: number; shape?: 'rect' | 'ellipse' }) => {
    setNodes(prev => {
      const prevNode = prev[choiceNodeId];
      const prevHotspot = prevNode?.data?.hotspots?.[edgeId] || {};
      const nextHotspot = {
        ...prevHotspot,
        x: partial.x !== undefined ? partial.x : (prevHotspot.x ?? 10),
        y: partial.y !== undefined ? partial.y : (prevHotspot.y ?? 10),
        width: partial.width !== undefined ? partial.width : (prevHotspot.width ?? 20),
        height: partial.height !== undefined ? partial.height : (prevHotspot.height ?? 8),
        shape: partial.shape !== undefined ? partial.shape : (prevHotspot.shape ?? 'rect')
      };

      const updatedNode = {
        ...prevNode,
        data: {
          ...prevNode.data,
          hotspots: {
            ...prevNode.data.hotspots,
            [edgeId]: nextHotspot
          }
        }
      };

      return { ...prev, [choiceNodeId]: updatedNode };
    });
  }, []);

  // Функция получения сохраненной позиции хотспота
  const getHotspotPosition = (choiceNodeId: string, edgeId: string, defaultX: number, defaultY: number) => {
    const savedHotspot = nodes[choiceNodeId]?.data?.hotspots?.[edgeId];
    const result = {
      x: savedHotspot?.x ?? defaultX,
      y: savedHotspot?.y ?? defaultY,
      width: savedHotspot?.width ?? 20,
      height: savedHotspot?.height ?? 8,
      shape: savedHotspot?.shape ?? 'rect'
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
    const linkingActive = linkMode || isShiftClick;
    if (isCtrlClick) {
      detachNodeFromParents(nodeId);
      return;
    }
    
    if (!linkingActive) {
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
          image: images[currentNode.data.imageId] || images[currentNode.data.backgroundImage],
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
              const targetImage = targetNode && targetNode.type === 'image'
                ? (images[targetNode.data.imageId] || images[targetNode.data.backgroundImage])
                : null;
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
                shape: position.shape,
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
    // Подгружаем комментарии
    if (initialProject?.id) {
      projectsService.getComments(initialProject.id).then(setComments).catch(() => setComments([]));
    }
  };

  // Подгружаем комментарии при первом открытии, если сразу в режиме просмотра
  React.useEffect(() => {
    if (mode === 'viewer' && initialProject?.id) {
      projectsService.getComments(initialProject.id).then(setComments).catch(() => setComments([]));
    }
  }, [mode, initialProject?.id]);

  // Автоматически строим путь просмотра при входе в режим viewer
  React.useEffect(() => {
    if (mode === 'viewer') {
      setViewerPath(buildViewerPath());
    }
    // Перестраиваем при изменениях графа
  }, [mode, nodes, edges, images]);

  // Обработчики разделителя (mobile): глобальный move/up
  React.useEffect(() => {
    if (!isCoarse) return;
    const handleMove = (clientY: number) => {
      if (!isSplittingRef.current || !splitStartRef.current) return;
      const dy = clientY - splitStartRef.current.startY;
      const deltaRatio = dy / (window.innerHeight || 1);
      const next = Math.max(0.3, Math.min(0.85, splitStartRef.current.startRatio + deltaRatio));
      setMobileSplitRatio(next);
    };
    const onMouseMove = (e: MouseEvent) => { if (isSplittingRef.current) { e.preventDefault(); handleMove(e.clientY); } };
    const onMouseUp = () => { if (isSplittingRef.current) { isSplittingRef.current = false; splitStartRef.current = null; document.body.style.userSelect = ''; } };
    const onTouchMove = (e: TouchEvent) => { if (isSplittingRef.current && e.touches[0]) { e.preventDefault(); handleMove(e.touches[0].clientY); } };
    const onTouchEnd = () => { if (isSplittingRef.current) { isSplittingRef.current = false; splitStartRef.current = null; document.body.style.userSelect = ''; } };
    document.addEventListener('mousemove', onMouseMove, { passive: false });
    document.addEventListener('mouseup', onMouseUp, { passive: true });
    document.addEventListener('touchmove', onTouchMove, { passive: false });
    document.addEventListener('touchend', onTouchEnd, { passive: true });
    return () => {
      document.removeEventListener('mousemove', onMouseMove as any);
      document.removeEventListener('mouseup', onMouseUp as any);
      document.removeEventListener('touchmove', onTouchMove as any);
      document.removeEventListener('touchend', onTouchEnd as any);
    };
  }, [isCoarse]);

  if (mode === 'viewer') {
    return (
      <div className="min-h-screen bg-black">
        <div className="bg-gray-900 text-white p-4 sticky top-0 z-10">
          <div className="flex items-center justify-between max-w-4xl mx-auto">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setMode('constructor')}
                className="flex items-center gap-2 px-3 py-1 bg-gray-700 rounded hover:bg-gray-600 transition-colors"
              >
                <ArrowLeft size={16} />
                {t.viewer.backToConstructor}
              </button>
              <button
                onClick={onBackToGallery}
                className="flex items-center gap-2 px-3 py-1 bg-gray-700 rounded hover:bg-gray-600 transition-colors"
              >
                <ArrowLeft size={16} />
                {t.editor.backToGallery}
              </button>
            </div>
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
                                onHotspotUpdate={updateHotspot}
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
          {/* Комментарии (MVP) */}
          {initialProject?.id && (
            <div className="max-w-4xl mx-auto px-4 py-6 text-white/90">
              <h3 className="text-lg font-semibold mb-3">Комментарии</h3>
              <div className="space-y-4">
                {/* Список комментариев */}
                <div className="space-y-3">
                  {comments.length === 0 ? (
                    <div className="text-white/50 text-sm">Пока нет комментариев</div>
                  ) : comments.map((c) => (
                    <div key={c.id} className="bg-gray-900 rounded p-3 border border-white/10">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {c.author?.avatar_url && (
                            <img src={c.author.avatar_url} className="w-6 h-6 rounded-full" />
                          )}
                          <div className="text-sm text-white/80">{c.author?.username || 'User'}</div>
                          <div className="text-xs text-white/40">{new Date(c.created_at).toLocaleString()}</div>
                        </div>
                        {(currentUser?.id === c.user_id || currentUser?.id === initialProject.authorId) && (
                          <button
                            className="text-xs text-red-400 hover:text-red-300"
                            onClick={async () => {
                              const ok = await projectsService.deleteComment(c.id);
                              if (ok) {
                                const fresh = await projectsService.getComments(initialProject.id);
                                setComments(fresh);
                              }
                            }}
                          >
                            Удалить
                          </button>
                        )}
                      </div>
                      <div className="text-sm whitespace-pre-wrap">{c.content}</div>
                    </div>
                  ))}
                </div>

                {/* Форма добавления */}
                <div className="bg-gray-900 rounded p-3 border border-white/10">
                  <textarea
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Оставьте комментарий"
                    className="w-full bg-gray-800 text-white rounded p-2 text-sm outline-none border border-white/10 focus:border-blue-500"
                    rows={3}
                  />
                  <div className="mt-2 flex justify-end">
                    <button
                      disabled={!commentText.trim() || isCommentSubmitting}
                      onClick={async () => {
                        if (!commentText.trim()) return;
                        setIsCommentSubmitting(true);
                        try {
                          const created = await projectsService.addComment(initialProject.id, commentText.trim());
                          if (created) {
                            const fresh = await projectsService.getComments(initialProject.id);
                            setComments(fresh);
                            setCommentText('');
                          } else {
                            alert('Комментарий не сохранён. Войдите в аккаунт или попробуйте ещё раз.');
                          }
                        } catch (e) {
                          console.error('addComment error', e);
                          alert('Ошибка добавления комментария');
                        }
                        setIsCommentSubmitting(false);
                      }}
                      className={`px-3 py-1.5 rounded text-sm ${(!commentText.trim() || isCommentSubmitting) ? 'bg-white/10 text-white/40' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                    >
                      {isCommentSubmitting ? 'Отправка…' : 'Отправить'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b p-4">
        <div className="flex flex-wrap items-center justify-between gap-2 max-w-full mx-auto">
          <div className="flex items-center gap-4">
            {!isCoarse && (
            <button
              onClick={async () => {
                // Перед уходом пытаемся сохранить текущее состояние (для автора)
                if (!isReadOnly && !suppressSave) {
                  onSaveProject({
                    nodes,
                    edges,
                    images,
                    title: projectTitle,
                    description: projectDescription,
                    thumbnail: projectThumbnail
                  });
                  // короткая пауза, чтобы передать сохранение в очередь
                  await new Promise(r => setTimeout(r, 50));
                }
                onBackToGallery();
              }}
              className="flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <ArrowLeft size={16} />
              {t.editor.backToGallery}
            </button>
            )}
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
          <div className="flex flex-wrap items-center gap-3">
            <LanguageSwitcher />
            {/* Публичность/публикация (доступно если не подавлено сохранение) */}
            {!suppressSave && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPublishState('draft')}
                  className={`px-3 py-1.5 rounded border text-sm ${publishState==='draft' ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
                  title={t.editor.meta.draft}
                >
                  {t.editor.meta.draft}
                </button>
                <button
                  onClick={() => setPublishState('public')}
                  className={`px-3 py-1.5 rounded border text-sm ${publishState==='public' ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
                  title={t.editor.meta.public}
                >
                  {t.editor.meta.public}
                </button>
              </div>
            )}
          {/* Выбор жанра (перенос на новую строку) */}
          <div className="basis-full h-0" />
          <select
            value={genreId || ''}
            onChange={(e) => {
              const val = e.target.value || undefined;
              setGenreId(val);
              // жанр — это тоже изменение: пометим первый чендж
              if (!firstChangeRef.current) firstChangeRef.current = true;
              // Принудительно сохраняем метаданные при выборе жанра (быстрый апдейт)
              onSaveProject({
                genre_id: val,
                onlyMeta: true
              });
            }}
            className="px-2 py-1 border rounded text-sm"
            title="Жанр"
          >
            <option value="">Жанр не выбран</option>
            {genres.map(g => (
              <option key={g.id} value={g.id}>{g.icon ? g.icon + ' ' : ''}{getLocalizedGenreName(g.slug || g.name, language)}</option>
            ))}
          </select>
            {!isCoarse && (
              <button
                onClick={switchToViewer}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Eye size={16} />
                {t.editor.viewComic}
              </button>
            )}
          </div>
        </div>
      </div>

       <div className={`grid ${isCoarse ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-4'} gap-6 p-6 max-w-full`}>
        {/* Левая колонка: скрыта на мобильном для двухпанельного режима */}
        {!isCoarse && (
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

            {/* Прогресс загрузки */}
            {uploadQueue.length > 0 && (
              <div className="space-y-2 mb-3">
                {uploadQueue.map(item => (
                  <div key={item.id} className="flex items-center gap-2">
                    <div className="text-xs text-gray-600 truncate flex-1">{item.name}</div>
                    <div className="w-28 h-2 bg-gray-200 rounded overflow-hidden">
                      <div className="h-full bg-blue-500" style={{ width: `${item.progress}%` }} />
                    </div>
                    <div className="text-xs w-8 text-right text-gray-600">{item.progress}%</div>
                  </div>
                ))}
              </div>
            )}

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
                className={`w-full flex items-center gap-2 p-2 rounded transition-colors ${isUploadingThumbnail ? 'bg-purple-200 text-purple-400 cursor-not-allowed' : 'bg-purple-100 text-purple-800 hover:bg-purple-200'}`}
                disabled={isReadOnly || isUploadingThumbnail}
              >
                <Upload size={16} />
                {isUploadingThumbnail ? 'Загрузка превью…' : t.editor.tools.uploadThumbnail}
              </button>
              
              {/* Отображение текущего превью */}
              {(projectThumbnail || thumbnailPreviewUrl) && (
                <div className="relative">
                  <img 
                    src={thumbnailPreviewUrl || projectThumbnail} 
                    alt="Превью комикса" 
                    className="w-full h-20 object-cover rounded border-2 border-purple-200"
                  />
                  {!isReadOnly && !isUploadingThumbnail && (
                    <button
                      onClick={() => setProjectThumbnail('')}
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600"
                      title={t.editor.tools.deleteThumbnail}
                    >
                      ×
                    </button>
                  )}
                  {isUploadingThumbnail && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center rounded">
                      <div className="w-3/4 h-2 bg-white/30 rounded overflow-hidden">
                        <div className="h-full w-1/2 bg-white/80 animate-pulse" />
                      </div>
                    </div>
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
        )}

        <div className="lg:col-span-3 space-y-4">
          <div className="bg-white rounded-lg shadow-sm p-4 relative border" style={isCoarse ? { height: `${Math.round(mobileSplitRatio * 100)}vh`, overflow: 'hidden' } : { height: undefined }}>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xl font-semibold hidden lg:block">{t.editor.graph.title}</h2>
              <div className="flex items-center gap-2">
                {/* Назад в галерею (иконка) */}
                <button
                  onClick={async () => {
                    if (!isReadOnly && !suppressSave) {
                      onSaveProject({ nodes, edges, images, title: projectTitle, description: projectDescription, thumbnail: projectThumbnail });
                      await new Promise(r => setTimeout(r, 50));
                    }
                    onBackToGallery();
                  }}
                  className="p-2 rounded border bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                  title={t.editor.backToGallery}
                >
                  <ArrowLeft size={18} />
                </button>
                {/* Галерея */}
                <button onClick={() => setIsMobileGalleryOpen(true)} className="p-2 rounded border bg-white text-gray-700 border-gray-300 hover:bg-gray-50" title="Галерея">
                  <ImageIcon size={18} />
                </button>
                {/* Просмотр */}
                <button onClick={switchToViewer} className="p-2 rounded border bg-white text-gray-700 border-gray-300 hover:bg-gray-50" title={t.editor.viewComic}>
                  <Eye size={18} />
                </button>
                {/* Связать */}
                <button onClick={() => setLinkMode(v => !v)} className={`p-2 rounded border ${linkMode ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`} title={linkMode ? 'Связать: режим ВКЛ' : 'Связать: режим ВЫКЛ'}>
                  <Link2 size={18} />
                </button>
                {/* Разорвать */}
                <button onClick={() => { if (selectedNodeId) detachNodeFromParents(selectedNodeId); }} disabled={!selectedNodeId || (selectedNodeId && (nodes[selectedNodeId]?.type === 'start' || getNodeConnections(selectedNodeId).incoming.length === 0))} className={`p-2 rounded border ${(!selectedNodeId || (selectedNodeId && (nodes[selectedNodeId]?.type === 'start' || getNodeConnections(selectedNodeId).incoming.length === 0))) ? 'bg-white text-gray-400 border-gray-200 cursor-not-allowed' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`} title="Разорвать входящую связь у выделенной ноды">
                  <Link2Off size={18} />
                </button>
                {/* Undo/Redo */}
                <button onClick={uiUndo} className="p-2 rounded border bg-white text-gray-700 border-gray-300 hover:bg-gray-50 flex items-center justify-center" title="Отменить (Ctrl+Z)">
                  <Undo2 size={16} />
                </button>
                <button onClick={uiRedo} className="p-2 rounded border bg-white text-gray-700 border-gray-300 hover:bg-gray-50 flex items-center justify-center" title="Повторить (Ctrl+Y или Ctrl+Shift+Z)">
                  <Redo2 size={16} />
                </button>
              </div>
            </div>
            <div 
                ref={graphScrollRef}
                onMouseEnter={() => setIsWheelOverCanvas(true)}
                onMouseLeave={() => setIsWheelOverCanvas(false)}
                className="w-full h-full border border-gray-200 rounded overflow-auto bg-gray-50 relative"
                onMouseDown={handleCanvasMouseDown}
                onContextMenu={(e) => {
                  // Блокируем контекстное меню, если хотим панорамировать правой кнопкой
                  if (panMode) {
                    e.preventDefault();
                  }
                }}
                onTouchStart={onTouchStart}
                onTouchMove={onTouchMove}
                onTouchEnd={onTouchEnd}
              >
              <div className="relative" style={{ width: '2000px', height: '1500px', transformOrigin: '0 0', transform: `scale(${zoom})` }}>
                
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
                   width={2000}
                   height={1500}
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
                        scale={zoom}
                        panActive={panMode || isSpaceDown || isPanning}
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

              {/* Разделитель для mobile: drag up/down (между графом и предпросмотром) */}
              {isCoarse && (
                <div
                  role="separator"
                  aria-orientation="horizontal"
                  className="h-4 -mx-4 cursor-row-resize flex items-center justify-center"
                  onMouseDown={(e) => { isSplittingRef.current = true; splitStartRef.current = { startY: e.clientY, startRatio: mobileSplitRatio }; document.body.style.userSelect = 'none'; }}
                  onTouchStart={(e) => { const t = e.touches[0]; isSplittingRef.current = true; splitStartRef.current = { startY: t.clientY, startRatio: mobileSplitRatio }; document.body.style.userSelect = 'none'; }}
                >
                  <div className="w-14 h-1.5 rounded bg-gray-300" />
                </div>
              )}
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

            {/* Мобильная шторка галереи изображений */}
            {isCoarse && (
              <div className={`fixed inset-x-0 bottom-0 z-40 transition-transform duration-300 ${isMobileGalleryOpen ? 'translate-y-0' : 'translate-y-full'}`}>
                <div className="bg-white rounded-t-2xl shadow-xl border-t p-4 max-h-[70vh] overflow-y-auto">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold">{t.editor.tools.imagePool}</h3>
                    <button onClick={() => setIsMobileGalleryOpen(false)} className="px-3 py-1 text-sm rounded bg-gray-100">Закрыть</button>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {/* Кнопка добавления изображений */}
                    <input ref={mobileFileInputRef} type="file" multiple accept="image/*" onChange={handleImageUpload} className="hidden" />
                    <button onClick={() => mobileFileInputRef.current?.click()} className="aspect-square rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center text-2xl text-gray-400 hover:text-gray-600 hover:border-gray-400">
                      +
                    </button>
                    {Object.values(images).map((image: any) => (
                      <button key={image.id} className="border rounded overflow-hidden" onClick={() => { createImageNode(image.id); setIsMobileGalleryOpen(false); }}>
                        <img src={image.src} alt={image.name} className="w-full h-16 object-cover" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
            {/* Плавающая фиолетовая кнопка пул изображений удалена */}
          </div>
          
          {/* Панель предпросмотра выделенной ноды */}
          <div className="bg-white rounded-lg shadow-sm p-4 border" style={isCoarse ? { height: `${Math.max(30, Math.min(85, Math.round((1 - mobileSplitRatio) * 100)))}vh` } : undefined}>
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
                                        shape: position.shape,
                                        label: label,
                                        targetNodeId: edge.to,
                                        optionIndex: index,
                                        isSelected: false,
                                        onClick: undefined, // В режиме конструктора не кликабельны
                                        title: `Хотспот: ${label} (перетащите для изменения позиции)`
                                      }}
                                      choiceNodeId={selectedNodeId}
                                      onHotspotUpdate={updateHotspot}
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

      {/* Мобильный полноэкранный редактор хот-спотов (MVP) */}
      {isCoarse && isMobileHotspotEditorOpen && selectedNodeId && nodes[selectedNodeId]?.type === 'choice' && (
        <div className="fixed inset-0 z-50 bg-black/70">
          <div className="absolute inset-0 bg-white p-3 flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <div className="font-semibold">Редактор хот‑спотов</div>
              <button onClick={() => setIsMobileHotspotEditorOpen(false)} className="px-3 py-1 rounded bg-gray-100">Готово</button>
            </div>
            <div className="relative flex-1 overflow-auto">
              {(() => {
                const previousImageNode = getPreviousImageNode(selectedNodeId);
                if (previousImageNode && images[previousImageNode.data.imageId]) {
                  const backgroundImage = images[previousImageNode.data.imageId];
                  return (
                    <div className="relative">
                      <img src={backgroundImage.src} alt={backgroundImage.name} className="w-full h-auto object-contain" />
                      <div className="absolute inset-0">
                        {edges.filter(edge => edge.from === selectedNodeId).map((edge, index) => {
                          const targetNode = nodes[edge.to];
                          const label = targetNode?.data?.caption || nodes[selectedNodeId].data.options[index] || `Вариант ${index + 1}`;
                          const defaultX = 10 + (index * 25);
                          const defaultY = 10 + (index * 15);
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
                                shape: position.shape,
                                label: label,
                                targetNodeId: edge.to,
                                optionIndex: index,
                                isSelected: false,
                                onClick: undefined,
                                title: `Хотспот: ${label}`
                              }}
                              choiceNodeId={selectedNodeId}
                              onHotspotUpdate={updateHotspot}
                              isInViewMode={false}
                            />
                          );
                        })}
                      </div>
                    </div>
                  );
                }
                return (
                  <div className="w-full h-full flex items-center justify-center text-gray-500">Нет фонового изображения</div>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WebtoonsGraphEditor;