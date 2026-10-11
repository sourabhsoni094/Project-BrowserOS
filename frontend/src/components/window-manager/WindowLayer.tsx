import React from 'react';
import { useWindowManager } from '../../stores/window.store';
import { WindowFrame } from './WindowFrame';
import { getAppById } from '../../applications/appRegistry';

export const WindowLayer: React.FC = () => {
  const { windows } = useWindowManager();

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {windows.map((win) => {
        const app = getAppById(win.appId);
        if (!app) return null;
        const AppComponent = app.component;

        return (
          <div key={win.id} className="pointer-events-auto">
            <WindowFrame window={win}>
              <AppComponent windowId={win.id} {...win.customProps} />
            </WindowFrame>
          </div>
        );
      })}
    </div>
  );
};
