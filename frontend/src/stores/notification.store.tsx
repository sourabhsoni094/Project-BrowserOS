import React, { createContext, useContext, useState, useCallback } from 'react';

export type NotificationType = 'info' | 'success' | 'warning' | 'error';

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  timestamp: string;
  read: boolean;
  appId?: string;
}

interface NotificationContextType {
  notifications: NotificationItem[];
  toasts: NotificationItem[];
  unreadCount: number;
  notify: (notification: Omit<NotificationItem, 'id' | 'timestamp' | 'read'>) => void;
  dismissToast: (id: string) => void;
  markAllAsRead: () => void;
  clearAllNotifications: () => void;
  removeNotification: (id: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([
    {
      id: 'welcome-notif',
      title: 'Welcome to BrowserOS',
      message: 'Your virtual cloud desktop is ready. PostgreSQL VFS active.',
      type: 'info',
      timestamp: new Date().toISOString(),
      read: false,
    },
  ]);

  const [toasts, setToasts] = useState<NotificationItem[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const notify = useCallback(
    ({ title, message, type, appId }: Omit<NotificationItem, 'id' | 'timestamp' | 'read'>) => {
      const newNotif: NotificationItem = {
        id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        title,
        message,
        type,
        timestamp: new Date().toISOString(),
        read: false,
        appId,
      };

      // Add to persistent notification history
      setNotifications((prev) => [newNotif, ...prev].slice(0, 50));

      // Add to toast queue
      setToasts((prev) => [...prev, newNotif]);

      // Auto-dismiss toast after 4 seconds
      setTimeout(() => {
        dismissToast(newNotif.id);
      }, 4000);
    },
    [dismissToast]
  );

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        toasts,
        unreadCount,
        notify,
        dismissToast,
        markAllAsRead,
        clearAllNotifications,
        removeNotification,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};
