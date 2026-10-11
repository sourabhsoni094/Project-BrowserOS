import React, { createContext, useContext, useState, useCallback } from 'react';
import { WindowState, WindowPosition, WindowSize } from '../types/window.types';
import { getAppById } from '../applications/appRegistry';

interface WindowContextType {
  windows: WindowState[];
  activeWindowId: string | null;
  recentAppIds: string[];
  openWindow: (appId: string, customProps?: Record<string, any>) => void;
  closeWindow: (windowId: string) => void;
  minimizeWindow: (windowId: string) => void;
  toggleMaximize: (windowId: string) => void;
  focusWindow: (windowId: string) => void;
  toggleWindowFromDock: (appId: string) => void;
  updatePosition: (windowId: string, position: WindowPosition) => void;
  updateSize: (windowId: string, size: WindowSize, position?: WindowPosition) => void;
}

const WindowContext = createContext<WindowContextType | undefined>(undefined);

const TOP_BAR_HEIGHT = 36;
const TASKBAR_HEIGHT = 56;

export const WindowProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [windows, setWindows] = useState<WindowState[]>([]);
  const [activeWindowId, setActiveWindowId] = useState<string | null>(null);
  const [highestZ, setHighestZ] = useState<number>(10);
  const [recentAppIds, setRecentAppIds] = useState<string[]>(['terminal', 'file-manager', 'text-editor']);

  const focusWindow = useCallback((windowId: string) => {
    setHighestZ((prevZ) => {
      const nextZ = prevZ + 1;
      setWindows((prevWindows) =>
        prevWindows.map((win) => ({
          ...win,
          isMinimized: win.id === windowId ? false : win.isMinimized,
          isFocused: win.id === windowId,
          zIndex: win.id === windowId ? nextZ : win.zIndex,
        }))
      );
      return nextZ;
    });
    setActiveWindowId(windowId);
  }, []);

  // Listen to browser viewport resizing and orientation changes
  React.useEffect(() => {
    const handleResize = () => {
      const isMobile = window.innerWidth < 768;
      setWindows((prev) =>
        prev.map((win) => {
          if (win.isMaximized || isMobile) {
            return {
              ...win,
              isMaximized: isMobile ? true : win.isMaximized,
              position: { x: 0, y: TOP_BAR_HEIGHT },
              size: {
                width: window.innerWidth,
                height: Math.max(200, window.innerHeight - TOP_BAR_HEIGHT - TASKBAR_HEIGHT),
              },
            };
          }
          // Clamp non-maximized window within viewport
          const clampedWidth = Math.min(win.size.width, Math.max(300, window.innerWidth - 40));
          const clampedHeight = Math.min(win.size.height, Math.max(200, window.innerHeight - TOP_BAR_HEIGHT - TASKBAR_HEIGHT - 40));
          const clampedX = Math.max(0, Math.min(window.innerWidth - clampedWidth, win.position.x));
          const clampedY = Math.max(TOP_BAR_HEIGHT, Math.min(window.innerHeight - TASKBAR_HEIGHT - clampedHeight, win.position.y));
          return {
            ...win,
            position: { x: clampedX, y: clampedY },
            size: { width: clampedWidth, height: clampedHeight },
          };
        })
      );
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const openWindow = useCallback(
    (appId: string, customProps?: Record<string, any>) => {
      const app = getAppById(appId);
      if (!app) return;

      // Update recently used apps
      setRecentAppIds((prev) => [appId, ...prev.filter((id) => id !== appId)].slice(0, 8));

      // If already open, restore, focus, and update props
      const existing = windows.find((win) => win.appId === appId);
      if (existing) {
        setWindows((prev) =>
          prev.map((win) =>
            win.id === existing.id
              ? {
                  ...win,
                  isMinimized: false,
                  customProps: customProps ? { ...win.customProps, ...customProps } : win.customProps,
                }
              : win
          )
        );
        focusWindow(existing.id);
        return;
      }

      const isMobile = window.innerWidth < 768;
      const initialWidth = isMobile ? window.innerWidth : Math.min(app.defaultWidth, window.innerWidth - 40);
      const initialHeight = isMobile
        ? Math.max(300, window.innerHeight - TOP_BAR_HEIGHT - TASKBAR_HEIGHT)
        : Math.min(app.defaultHeight, window.innerHeight - TOP_BAR_HEIGHT - TASKBAR_HEIGHT - 40);

      // Calculate initial staggered position
      const windowOffset = (windows.length % 6) * 28;
      const initialX = isMobile ? 0 : Math.max(20, Math.min(window.innerWidth - initialWidth - 20, 80 + windowOffset));
      const initialY = isMobile
        ? TOP_BAR_HEIGHT
        : Math.max(TOP_BAR_HEIGHT + 10, Math.min(window.innerHeight - initialHeight - TASKBAR_HEIGHT - 10, TOP_BAR_HEIGHT + 20 + windowOffset));

      const newId = `${appId}-${Date.now()}`;
      const nextZ = highestZ + 1;
      setHighestZ(nextZ);

      const newWindow: WindowState = {
        id: newId,
        appId: app.id,
        title: app.title,
        position: { x: initialX, y: initialY },
        size: { width: initialWidth, height: initialHeight },
        minSize: {
          width: Math.min(app.minWidth || 320, window.innerWidth),
          height: Math.min(app.minHeight || 220, window.innerHeight - TOP_BAR_HEIGHT - TASKBAR_HEIGHT),
        },
        isMinimized: false,
        isMaximized: isMobile,
        isFocused: true,
        zIndex: nextZ,
        customProps,
      };

      setWindows((prev) => [
        ...prev.map((win) => ({ ...win, isFocused: false })),
        newWindow,
      ]);
      setActiveWindowId(newId);
    },
    [windows, highestZ, focusWindow]
  );

  const closeWindow = useCallback(
    (windowId: string) => {
      setWindows((prev) => {
        const filtered = prev.filter((win) => win.id !== windowId);
        // Find next top window to focus
        const remainingUnminimized = filtered.filter((w) => !w.isMinimized);
        if (remainingUnminimized.length > 0) {
          const topWindow = remainingUnminimized.reduce((prevTop, curr) =>
            curr.zIndex > prevTop.zIndex ? curr : prevTop
          );
          topWindow.isFocused = true;
          setActiveWindowId(topWindow.id);
        } else {
          setActiveWindowId(null);
        }
        return filtered;
      });
    },
    []
  );

  const minimizeWindow = useCallback(
    (windowId: string) => {
      setWindows((prev) => {
        const next = prev.map((win) =>
          win.id === windowId ? { ...win, isMinimized: true, isFocused: false } : win
        );
        const visible = next.filter((w) => !w.isMinimized);
        if (visible.length > 0) {
          const topWindow = visible.reduce((prevTop, curr) =>
            curr.zIndex > prevTop.zIndex ? curr : prevTop
          );
          topWindow.isFocused = true;
          setActiveWindowId(topWindow.id);
        } else {
          setActiveWindowId(null);
        }
        return next;
      });
    },
    []
  );

  const toggleMaximize = useCallback(
    (windowId: string) => {
      setWindows((prev) =>
        prev.map((win) => {
          if (win.id !== windowId) return win;

          if (win.isMaximized) {
            // Restore previous bounds
            const restored = win.prevBounds || {
              position: { x: 80, y: TOP_BAR_HEIGHT + 20 },
              size: { width: 700, height: 460 },
            };
            return {
              ...win,
              isMaximized: false,
              position: restored.position,
              size: restored.size,
            };
          } else {
            // Maximize to full available desktop area
            return {
              ...win,
              isMaximized: true,
              prevBounds: {
                position: win.position,
                size: win.size,
              },
              position: { x: 0, y: TOP_BAR_HEIGHT },
              size: {
                width: window.innerWidth,
                height: Math.max(300, window.innerHeight - TOP_BAR_HEIGHT - TASKBAR_HEIGHT),
              },
            };
          }
        })
      );
      focusWindow(windowId);
    },
    [focusWindow]
  );

  const toggleWindowFromDock = useCallback(
    (appId: string) => {
      const existing = windows.find((win) => win.appId === appId);
      if (!existing) {
        openWindow(appId);
      } else if (existing.isMinimized) {
        setWindows((prev) =>
          prev.map((win) => (win.id === existing.id ? { ...win, isMinimized: false } : win))
        );
        focusWindow(existing.id);
      } else if (existing.isFocused) {
        minimizeWindow(existing.id);
      } else {
        focusWindow(existing.id);
      }
    },
    [windows, openWindow, focusWindow, minimizeWindow]
  );

  const updatePosition = useCallback((windowId: string, position: WindowPosition) => {
    setWindows((prev) =>
      prev.map((win) => (win.id === windowId ? { ...win, position, isMaximized: false } : win))
    );
  }, []);

  const updateSize = useCallback(
    (windowId: string, size: WindowSize, position?: WindowPosition) => {
      setWindows((prev) =>
        prev.map((win) =>
          win.id === windowId
            ? {
                ...win,
                size,
                position: position || win.position,
                isMaximized: false,
              }
            : win
        )
      );
    },
    []
  );

  return (
    <WindowContext.Provider
      value={{
        windows,
        activeWindowId,
        recentAppIds,
        openWindow,
        closeWindow,
        minimizeWindow,
        toggleMaximize,
        focusWindow,
        toggleWindowFromDock,
        updatePosition,
        updateSize,
      }}
    >
      {children}
    </WindowContext.Provider>
  );
};

export const useWindowManager = () => {
  const context = useContext(WindowContext);
  if (!context) {
    throw new Error('useWindowManager must be used within a WindowProvider');
  }
  return context;
};
