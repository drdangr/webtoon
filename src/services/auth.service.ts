import { supabase } from '../lib/supabase';
import type { Profile, ProfileInsert, ProfileUpdate } from '../lib/database.types';
import type { User, Session } from '@supabase/supabase-js';

class AuthService {
  /**
   * Регистрация нового пользователя
   */
  async signUp(email: string, password: string, username: string) {
    try {
      // Проверяем уникальность username
      const { data: existingUser } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', username.toLowerCase())
        .single();
      
      if (existingUser) {
        throw new Error('Это имя пользователя уже занято');
      }

      // Создаем пользователя в Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username: username.toLowerCase(),
            display_name: username
          }
        }
      });

      if (authError) throw authError;

      // Создаем профиль пользователя
      if (authData.user) {
        const profileData: ProfileInsert = {
          id: authData.user.id,
          username: username.toLowerCase(),
          full_name: username,
          avatar_url: `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=random&size=200`,
          social_links: {},
          subscription_tier: 'free'
        };

        const { error: profileError } = await supabase
          .from('profiles')
          .insert(profileData);

        if (profileError) {
          console.error('Error creating profile:', profileError);
          // Не бросаем ошибку, так как пользователь уже создан
        }
      }

      return authData;
    } catch (error: any) {
      console.error('SignUp error:', error);
      throw error;
    }
  }

  /**
   * Вход по email и паролю
   */
  async signIn(email: string, password: string) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // Проверяем существование профиля
      await this.ensureProfile(data.user);

      return data;
    } catch (error: any) {
      console.error('SignIn error:', error);
      throw error;
    }
  }

  /**
   * Вход через GitHub
   */
  async signInWithGitHub() {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        }
      });

      if (error) throw error;
      return data;
    } catch (error: any) {
      console.error('GitHub SignIn error:', error);
      throw error;
    }
  }

  /**
   * Вход через Google (если настроен)
   */
  async signInWithGoogle() {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        }
      });

      if (error) throw error;
      return data;
    } catch (error: any) {
      console.error('Google SignIn error:', error);
      throw error;
    }
  }

  /**
   * Выход из системы
   */
  async signOut() {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error: any) {
      console.error('SignOut error:', error);
      throw error;
    }
  }

  /**
   * Получение текущего пользователя
   */
  async getCurrentUser(): Promise<User | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    } catch (error: any) {
      console.error('GetCurrentUser error:', error);
      return null;
    }
  }

  /**
   * Получение текущей сессии
   */
  async getSession(): Promise<Session | null> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      return session;
    } catch (error: any) {
      console.error('GetSession error:', error);
      return null;
    }
  }

  /**
   * Получение профиля пользователя
   */
  async getProfile(userId: string): Promise<Profile | null> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // Профиль не найден
          return null;
        }
        throw error;
      }

      return data;
    } catch (error: any) {
      console.error('GetProfile error:', error);
      return null;
    }
  }

  /**
   * Получение профиля по username
   */
  async getProfileByUsername(username: string): Promise<Profile | null> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('username', username.toLowerCase())
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        throw error;
      }

      return data;
    } catch (error: any) {
      console.error('GetProfileByUsername error:', error);
      return null;
    }
  }

  /**
   * Обновление профиля пользователя
   */
  async updateProfile(userId: string, updates: ProfileUpdate): Promise<Profile | null> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error: any) {
      console.error('UpdateProfile error:', error);
      throw error;
    }
  }

  /**
   * Проверка и создание профиля если его нет
   */
  async ensureProfile(user: User | null): Promise<Profile | null> {
    if (!user) return null;

    try {
      // Проверяем существует ли профиль
      let profile = await this.getProfile(user.id);

      if (!profile) {
        // Создаем профиль если его нет
        const username = user.user_metadata?.username || 
                        user.email?.split('@')[0] || 
                        `user${Date.now()}`;

        const profileData: ProfileInsert = {
          id: user.id,
          username: username.toLowerCase(),
          full_name: user.user_metadata?.full_name || username,
          avatar_url: user.user_metadata?.avatar_url || 
                     `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=random&size=200`,
          social_links: {},
          subscription_tier: 'free'
        };

        const { data, error } = await supabase
          .from('profiles')
          .insert(profileData)
          .select()
          .single();

        if (error) {
          console.error('Error creating profile:', error);
          return null;
        }

        profile = data;
      }

      return profile;
    } catch (error: any) {
      console.error('EnsureProfile error:', error);
      return null;
    }
  }

  /**
   * Подписка на изменения состояния авторизации
   */
  onAuthStateChange(callback: (event: string, session: Session | null) => void) {
    return supabase.auth.onAuthStateChange(callback);
  }

  /**
   * Сброс пароля
   */
  async resetPassword(email: string) {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;
    } catch (error: any) {
      console.error('ResetPassword error:', error);
      throw error;
    }
  }

  /**
   * Обновление пароля
   */
  async updatePassword(newPassword: string) {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;
    } catch (error: any) {
      console.error('UpdatePassword error:', error);
      throw error;
    }
  }
}

export const authService = new AuthService();
