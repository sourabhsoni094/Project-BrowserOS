import React from 'react';
import { LucideIcon } from 'lucide-react';

export type AppCategory = 'Development' | 'System' | 'AI' | 'Utilities';

export interface AppProps {
  windowId: string;
  customProps?: Record<string, any>;
}

export interface AppDefinition {
  id: string;
  title: string;
  icon: LucideIcon;
  category: AppCategory;
  description: string;
  defaultWidth: number;
  defaultHeight: number;
  minWidth?: number;
  minHeight?: number;
  component: React.ComponentType<AppProps>;
}
