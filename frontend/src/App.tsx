import React from 'react';
import { AuthProvider } from './stores/auth.store';
import { WindowProvider } from './stores/window.store';
import { NotificationProvider } from './stores/notification.store';
import { Desktop } from './components/desktop/Desktop';

const MainApp: React.FC = () => {
  return (
    <NotificationProvider>
      <WindowProvider>
        <Desktop />
      </WindowProvider>
    </NotificationProvider>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
};

export default App;
