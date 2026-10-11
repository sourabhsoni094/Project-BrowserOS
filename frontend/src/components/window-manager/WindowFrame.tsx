import React, { useRef, useCallback } from 'react';
import { WindowState, ResizeDirection } from '../../types/window.types';
import { useWindowManager } from '../../stores/window.store';
import { Minus, Square, Copy, X } from 'lucide-react';
import { getAppById } from '../../applications/appRegistry';

interface WindowFrameProps {
  window: WindowState;
  children: React.ReactNode;
}

const TOP_BAR_HEIGHT = 36;
const TASKBAR_HEIGHT = 56;

export const WindowFrame: React.FC<WindowFrameProps> = ({ window: win, children }) => {
  const {
    closeWindow,
    minimizeWindow,
    toggleMaximize,
    focusWindow,
    updatePosition,
    updateSize,
  } = useWindowManager();

  const app = getAppById(win.appId);
  const Icon = app?.icon;

  const frameRef = useRef<HTMLDivElement>(null);

  // Handle Mouse Dragging
  const handleTitleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      // Don't drag if clicking buttons
      if ((e.target as HTMLElement).closest('button')) return;
      if (win.isMaximized || window.innerWidth < 768) return;

      focusWindow(win.id);

      const startX = e.clientX;
      const startY = e.clientY;
      const initialPos = { ...win.position };

      const handleMouseMove = (moveEvent: MouseEvent) => {
        const deltaX = moveEvent.clientX - startX;
        const deltaY = moveEvent.clientY - startY;

        // Viewport boundaries
        const newX = Math.max(-win.size.width + 100, Math.min(window.innerWidth - 100, initialPos.x + deltaX));
        const newY = Math.max(TOP_BAR_HEIGHT, Math.min(window.innerHeight - TASKBAR_HEIGHT - 30, initialPos.y + deltaY));

        updatePosition(win.id, { x: newX, y: newY });
      };

      const handleMouseUp = () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };

      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    },
    [win.id, win.position, win.size, win.isMaximized, focusWindow, updatePosition]
  );

  // Handle Touch Dragging on Mobile/Tablets
  const handleTitleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if ((e.target as HTMLElement).closest('button')) return;
      if (win.isMaximized || window.innerWidth < 768) return;

      focusWindow(win.id);
      const touch = e.touches[0];
      const startX = touch.clientX;
      const startY = touch.clientY;
      const initialPos = { ...win.position };

      const handleTouchMove = (moveEvent: TouchEvent) => {
        const moveTouch = moveEvent.touches[0];
        const deltaX = moveTouch.clientX - startX;
        const deltaY = moveTouch.clientY - startY;

        const newX = Math.max(0, Math.min(window.innerWidth - 60, initialPos.x + deltaX));
        const newY = Math.max(TOP_BAR_HEIGHT, Math.min(window.innerHeight - TASKBAR_HEIGHT - 30, initialPos.y + deltaY));

        updatePosition(win.id, { x: newX, y: newY });
      };

      const handleTouchEnd = () => {
        window.removeEventListener('touchmove', handleTouchMove);
        window.removeEventListener('touchend', handleTouchEnd);
      };

      window.addEventListener('touchmove', handleTouchMove);
      window.addEventListener('touchend', handleTouchEnd);
    },
    [win.id, win.position, win.isMaximized, focusWindow, updatePosition]
  );

  // Handle Resizing
  const handleResizeMouseDown = useCallback(
    (direction: ResizeDirection, e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      if (win.isMaximized) return;

      focusWindow(win.id);

      const startX = e.clientX;
      const startY = e.clientY;
      const initialSize = { ...win.size };
      const initialPos = { ...win.position };

      const handleMouseMove = (moveEvent: MouseEvent) => {
        const deltaX = moveEvent.clientX - startX;
        const deltaY = moveEvent.clientY - startY;

        let newWidth = initialSize.width;
        let newHeight = initialSize.height;
        let newX = initialPos.x;
        let newY = initialPos.y;

        // Horizontal resizing
        if (direction.includes('e')) {
          newWidth = Math.max(win.minSize.width, initialSize.width + deltaX);
        } else if (direction.includes('w')) {
          const possibleWidth = initialSize.width - deltaX;
          if (possibleWidth >= win.minSize.width) {
            newWidth = possibleWidth;
            newX = initialPos.x + deltaX;
          }
        }

        // Vertical resizing
        if (direction.includes('s')) {
          newHeight = Math.max(win.minSize.height, initialSize.height + deltaY);
        } else if (direction.includes('n')) {
          const possibleHeight = initialSize.height - deltaY;
          if (possibleHeight >= win.minSize.height) {
            newHeight = possibleHeight;
            newY = Math.max(TOP_BAR_HEIGHT, initialPos.y + deltaY);
          }
        }

        updateSize(win.id, { width: newWidth, height: newHeight }, { x: newX, y: newY });
      };

      const handleMouseUp = () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };

      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    },
    [win.id, win.size, win.position, win.minSize, win.isMaximized, focusWindow, updateSize]
  );

  if (win.isMinimized) return null;

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  const isEffectiveMaximized = win.isMaximized || isMobile;

  return (
    <div
      ref={frameRef}
      onMouseDown={() => focusWindow(win.id)}
      style={{
        transform: `translate3d(${isEffectiveMaximized ? 0 : win.position.x}px, ${isEffectiveMaximized ? TOP_BAR_HEIGHT : win.position.y}px, 0)`,
        width: isEffectiveMaximized ? '100vw' : `${win.size.width}px`,
        height: isEffectiveMaximized ? `calc(100vh - ${TOP_BAR_HEIGHT + TASKBAR_HEIGHT}px)` : `${win.size.height}px`,
        zIndex: win.zIndex,
        borderRadius: isEffectiveMaximized ? '0px' : undefined,
      }}
      className={`fixed top-0 left-0 flex flex-col ${isEffectiveMaximized ? 'rounded-none' : 'rounded-xl'} overflow-hidden transition-shadow duration-150 select-none ${
        win.isFocused
          ? 'shadow-2xl shadow-blue-500/10 ring-1 ring-slate-600/80 border border-slate-600/70'
          : 'shadow-lg ring-1 ring-slate-800/80 border border-slate-800/60 opacity-95'
      }`}
    >
      {/* Title Bar */}
      <div
        onMouseDown={handleTitleMouseDown}
        onTouchStart={handleTitleTouchStart}
        onDoubleClick={() => !isMobile && toggleMaximize(win.id)}
        className={`h-10 px-3.5 flex items-center justify-between border-b backdrop-blur-xl transition-colors ${isEffectiveMaximized ? 'cursor-default' : 'cursor-move'} ${
          win.isFocused
            ? 'bg-slate-900/95 border-slate-700/80 text-slate-100'
            : 'bg-slate-950/90 border-slate-800/80 text-slate-400'
        }`}
      >
        {/* Left: App Identity */}
        <div className="flex items-center space-x-2.5 pointer-events-none">
          {Icon && <Icon className="w-4 h-4 text-blue-400" />}
          <span className="text-xs font-semibold tracking-wide truncate max-w-[200px] sm:max-w-xs">
            {win.title}
          </span>
        </div>

        {/* Right: Window Controls */}
        <div className="flex items-center space-x-1.5">
          {/* Minimize */}
          <button
            onClick={() => minimizeWindow(win.id)}
            title="Minimize"
            className="w-7 h-7 rounded-lg hover:bg-slate-800/80 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>

          {/* Maximize / Restore (desktop only) */}
          {!isMobile && (
            <button
              onClick={() => toggleMaximize(win.id)}
              title={win.isMaximized ? 'Restore' : 'Maximize'}
              className="w-7 h-7 rounded-lg hover:bg-slate-800/80 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
            >
              {win.isMaximized ? <Copy className="w-3 h-3" /> : <Square className="w-3 h-3" />}
            </button>
          )}

          {/* Close */}
          <button
            onClick={() => closeWindow(win.id)}
            title="Close"
            className="w-7 h-7 rounded-lg hover:bg-red-500/20 hover:text-red-400 flex items-center justify-center text-slate-400 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Window Body */}
      <div className="flex-1 bg-slate-950 overflow-hidden relative flex flex-col">
        {children}
      </div>

      {/* Resize Handles (8 directions) - only visible when not effective maximized */}
      {!isEffectiveMaximized && (
        <>
          <div
            onMouseDown={(e) => handleResizeMouseDown('n', e)}
            className="absolute top-0 left-2 right-2 h-1.5 cursor-n-resize"
          />
          <div
            onMouseDown={(e) => handleResizeMouseDown('s', e)}
            className="absolute bottom-0 left-2 right-2 h-1.5 cursor-s-resize"
          />
          <div
            onMouseDown={(e) => handleResizeMouseDown('e', e)}
            className="absolute top-2 bottom-2 right-0 w-1.5 cursor-e-resize"
          />
          <div
            onMouseDown={(e) => handleResizeMouseDown('w', e)}
            className="absolute top-2 bottom-2 left-0 w-1.5 cursor-w-resize"
          />
          <div
            onMouseDown={(e) => handleResizeMouseDown('nw', e)}
            className="absolute top-0 left-0 w-3 h-3 cursor-nw-resize"
          />
          <div
            onMouseDown={(e) => handleResizeMouseDown('ne', e)}
            className="absolute top-0 right-0 w-3 h-3 cursor-ne-resize"
          />
          <div
            onMouseDown={(e) => handleResizeMouseDown('sw', e)}
            className="absolute bottom-0 left-0 w-3 h-3 cursor-sw-resize"
          />
          <div
            onMouseDown={(e) => handleResizeMouseDown('se', e)}
            className="absolute bottom-0 right-0 w-3 h-3 cursor-se-resize"
          />
        </>
      )}
    </div>
  );
};
