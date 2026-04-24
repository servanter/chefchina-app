import { useState, useEffect, useCallback } from 'react';
import { login as apiLogin, register as apiRegister, updateUser, User } from '../lib/api';
import {
  getUserId,
  saveUserId,
  getUserEmail,
  saveUserEmail,
  getUserName,
  saveUserName,
  getUserBio,
  saveUserBio,
  getUserAvatar,
  saveUserAvatar,
  saveAuthToken,
  clearAll,
} from '../lib/storage';

const DEFAULT_BIO = 'Food lover & home cook';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isLoggedIn: boolean;
}

export const useAuth = () => {
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isLoggedIn: false,
  });

  // Restore session from storage
  useEffect(() => {
    const restore = async () => {
      try {
        const userId = await getUserId();
        const email = await getUserEmail();
        const name = await getUserName();
        const bio = await getUserBio();
        const avatar = await getUserAvatar();

        if (userId && email) {
          setState({
            user: {
              id: userId,
              email,
              name: name ?? email.split('@')[0],
              avatar_url: avatar && avatar.length > 0
                ? avatar
                : `https://i.pravatar.cc/150?u=${userId}`,
              bio: bio ?? DEFAULT_BIO,
              favorites_count: 0,
              comments_count: 0,
            },
            isLoading: false,
            isLoggedIn: true,
          });
        } else {
          setState({ user: null, isLoading: false, isLoggedIn: false });
        }
      } catch {
        setState({ user: null, isLoading: false, isLoggedIn: false });
      }
    };
    restore();
  }, []);

  const persistUser = useCallback(async (user: User, token?: string) => {
    await saveUserId(user.id);
    await saveUserEmail(user.email);
    if (user.name) await saveUserName(user.name);
    if (user.bio) await saveUserBio(user.bio);
    if (user.avatar_url) await saveUserAvatar(user.avatar_url);
    if (token) await saveAuthToken(token);
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      setState((prev) => ({ ...prev, isLoading: true }));
      try {
        const { user, token } = await apiLogin(email, password);
        await persistUser(user, token);
        setState({ user, isLoading: false, isLoggedIn: true });
        return user;
      } catch (e) {
        setState((prev) => ({ ...prev, isLoading: false }));
        throw e;
      }
    },
    [persistUser],
  );

  const register = useCallback(
    async (email: string, password: string) => {
      setState((prev) => ({ ...prev, isLoading: true }));
      try {
        const { user, token } = await apiRegister(email, password);
        await persistUser(user, token);
        setState({ user, isLoading: false, isLoggedIn: true });
        return user;
      } catch (e) {
        setState((prev) => ({ ...prev, isLoading: false }));
        throw e;
      }
    },
    [persistUser],
  );

  const logout = useCallback(async () => {
    await clearAll();
    setState({ user: null, isLoading: false, isLoggedIn: false });
  }, []);

  const updateProfile = useCallback(
    async (data: { name?: string; bio?: string; avatar?: string }) => {
      if (!state.user) return;
      try {
        const updated = await updateUser(state.user.id, data);
        if (data.name !== undefined) await saveUserName(data.name);
        if (data.bio !== undefined) await saveUserBio(data.bio);
        if (data.avatar !== undefined) await saveUserAvatar(data.avatar);
        setState((prev) => ({
          ...prev,
          user: prev.user ? { ...prev.user, ...updated } : prev.user,
        }));
        return updated;
      } catch (e) {
        throw e;
      }
    },
    [state.user],
  );

  const syncLocale = useCallback(async (locale: string) => {
    if (!state.user) return;
    try {
      await updateUser(state.user.id, { locale });
    } catch {
      // non-critical, ignore
    }
  }, [state.user]);

  return {
    user: state.user,
    isLoading: state.isLoading,
    isLoggedIn: state.isLoggedIn,
    login,
    register,
    logout,
    updateProfile,
    syncLocale,
  };
};
