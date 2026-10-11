export interface UserPreferences {
  id: string;
  userId: string;
  theme: string;
  wallpaper: string;
  fontSize: number;
}

export interface User {
  id: string;
  username: string;
  email: string;
  avatarUrl?: string | null;
  preferences?: UserPreferences | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface AuthResponse {
  success: boolean;
  data: {
    token: string;
    user: User;
  };
  error?: string;
}

export interface MeResponse {
  success: boolean;
  data: User;
  error?: string;
}
