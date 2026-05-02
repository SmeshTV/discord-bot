import { useState, useEffect, createContext, useContext, ReactNode, useRef } from 'react';
import { User as SupabaseUser, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { getOrCreateUser, User as LolaUser } from '../lib/database';
import { logger } from '../lib/logger';

export interface UserPermissions {
  isAdmin: boolean;
  isEventMaker: boolean;
  isSpecial: boolean;
  roles: string[];
  roleNames: { [key: string]: string };
}

interface AuthContextType {
  user: LolaUser | null;
  supabaseUser: SupabaseUser | null;
  session: Session | null;
  permissions: UserPermissions | null;
  loading: boolean;
  error: string | null;
  signInWithDiscord: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
  syncDiscordXp: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const FUNCTIONS_URL = `${import.meta.env.VITE_SUPABASE_URL.replace(/\/$/, '')}/functions/v1`;

const CACHE_KEYS = {
  session: 'lola_auth_session',
  permissions: 'lola_user_permissions',
  user: 'lola_user_data',
};

function getCachedSession(): { session: Session | null; user: SupabaseUser | null } | null {
  try {
    const cached = localStorage.getItem(CACHE_KEYS.session);
    if (cached) {
      const data = JSON.parse(cached);
      if (data?.session?.access_token) {
        return { session: data.session, user: data.user };
      }
    }
  } catch {}
  return null;
}

function getCachedPermissions(): UserPermissions | null {
  try {
    const cached = localStorage.getItem(CACHE_KEYS.permissions);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch {}
  return null;
}

function getCachedUser(): LolaUser | null {
  try {
    const cached = localStorage.getItem(CACHE_KEYS.user);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch {}
  return null;
}

function cacheSession(session: Session | null, user: SupabaseUser | null): void {
  try {
    if (session && user) {
      localStorage.setItem(CACHE_KEYS.session, JSON.stringify({ session, user }));
    } else {
      localStorage.removeItem(CACHE_KEYS.session);
    }
  } catch {}
}

function cachePermissions(permissions: UserPermissions | null): void {
  try {
    if (permissions) {
      localStorage.setItem(CACHE_KEYS.permissions, JSON.stringify(permissions));
    } else {
      localStorage.removeItem(CACHE_KEYS.permissions);
    }
  } catch {}
}

function cacheUser(user: LolaUser | null): void {
  try {
    if (user) {
      localStorage.setItem(CACHE_KEYS.user, JSON.stringify(user));
    } else {
      localStorage.removeItem(CACHE_KEYS.user);
    }
  } catch {}
}

async function fetchRoles(userId: string): Promise<UserPermissions | null> {
  try {
    const res = await fetch(`${FUNCTIONS_URL}/get-discord-roles`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });

    if (!res.ok) {
      logger.error(`Edge Function error: ${res.status}`);
      return null;
    }
    const data = await res.json();

    // Edge Function возвращает roles (массив ID) и roleNames (объект ID → название)
    if (data.roles && Array.isArray(data.roles)) {
      const roleIds: string[] = [];
      const roleNames: { [key: string]: string } = data.roleNames || {};
      
      for (const r of data.roles) {
        const roleId = typeof r === 'string' ? r : r.id;
        if (!roleIds.includes(roleId)) {
          roleIds.push(roleId);
        }
        // Если roleNames из ответа пустой, используем ID как fallback
        if (!roleNames[roleId]) {
          roleNames[roleId] = roleId;
        }
      }
      data.roles = roleIds;
      data.roleNames = roleNames;
    } else {
      data.roleNames = {};
    }
    return data;
  } catch (e) {
    logger.error('fetchRoles error:', e);
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const cachedSession = getCachedSession();
  const cachedPermissions = getCachedPermissions();
  const cachedUser = getCachedUser();
  
  const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(cachedSession?.user ?? null);
  const [session, setSession] = useState<Session | null>(cachedSession?.session ?? null);
  const [lolaUser, setLolaUser] = useState<LolaUser | null>(cachedUser ?? null);
  const [permissions, setPermissions] = useState<UserPermissions | null>(cachedPermissions ?? null);
  const [loading, setLoading] = useState(!cachedSession);
  const [error, setError] = useState<string | null>(null);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const handleOAuthCallback = async () => {
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');
      
      if (accessToken || refreshToken) {
        supabase.auth.setSession({
          access_token: accessToken || '',
          refresh_token: refreshToken || '',
        }).then(({ data, error }) => {
          if (!error && data.session) {
            setSession(data.session);
            setSupabaseUser(data.session.user);
            cacheSession(data.session, data.session.user);
          }
          window.location.hash = '';
        });
        return true;
      }
      return false;
    };
    
    const init = async () => {
      const isOAuth = await handleOAuthCallback();
      if (!isOAuth && cachedSession) {
        const { data: { session: freshSession } } = await supabase.auth.getSession();
        if (freshSession) {
          setSession(freshSession);
          setSupabaseUser(freshSession.user);
          cacheSession(freshSession, freshSession.user);
        } else {
          setSession(null);
          setSupabaseUser(null);
          cacheSession(null, null);
          cachePermissions(null);
          cacheUser(null);
        }
      }
    };

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setSupabaseUser(session?.user ?? null);
      cacheSession(session, session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!supabaseUser) {
      setLolaUser(null);
      setPermissions(null);
      cachePermissions(null);
      cacheUser(null);
      setLoading(false);
      return;
    }

    const loadLolaUser = async () => {
      setLoading(true);
      // Discord OAuth возвращает разные ключи в зависимости от версии API
      // Приоритет: name (Discord) > full_name > user_name > email prefix
      const username = supabaseUser.user_metadata?.name
        || supabaseUser.user_metadata?.user_name
        || supabaseUser.user_metadata?.full_name
        || supabaseUser.email?.split('@')[0]
        || 'User';
      const avatarUrl = supabaseUser.user_metadata?.avatar_url
        || supabaseUser.user_metadata?.avatar
        || supabaseUser.user_metadata?.picture;

      // Настоящий Discord ID (snowflake)
      // Приоритет: metadata.provider_id -> metadata.sub -> user.id
      const discordId = supabaseUser.user_metadata?.provider_id 
        || (supabaseUser.app_metadata?.provider === 'discord' ? supabaseUser.identities?.[0]?.id : null)
        || supabaseUser.user_metadata?.sub;

      const user = await getOrCreateUser(supabaseUser.id, discordId, username, avatarUrl);
      setLolaUser(user);
      cacheUser(user);

      // Загружаем роли автоматически через бота
      if (discordId) {
        try {
          const perms = await fetchRoles(discordId);
          if (perms) {
            setPermissions(perms);
            cachePermissions(perms);
          } else {
            // Если функция вернула null, ставим базовые пустые права
            setPermissions({
              isAdmin: false,
              isEventMaker: false,
              isSpecial: false,
              roles: [],
              roleNames: {}
            });
          }
        } catch (err) {
          logger.error('Error in fetchRoles:', err);
          setPermissions({
            isAdmin: false,
            isEventMaker: false,
            isSpecial: false,
            roles: [],
            roleNames: {}
          });
        }
      } else {
        setPermissions({
          isAdmin: false,
          isEventMaker: false,
          isSpecial: false,
          roles: [],
          roleNames: {}
        });
      }

      setLoading(false);
    };

    loadLolaUser();
  }, [supabaseUser]);

  const signInWithDiscord = async () => {
    try {
      setError(null);
      const redirectUrl = window.location.origin;
      
      console.log('Discord OAuth redirect to:', redirectUrl);
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'discord',
        options: {
          redirectTo: redirectUrl,
        },
      });
      
      if (error) {
        console.error('OAuth error:', error);
        setError('Ошибка: ' + error.message);
      }
    } catch (err) {
      console.error('Sign in error:', err);
      setError(err instanceof Error ? err.message : 'Ошибка авторизации');
    }
  };

  const signOut = async () => {
    try {
      setError(null);
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка выхода');
    }
  };

  const refreshUser = async () => {
    if (!supabaseUser) return;
    const username = supabaseUser.user_metadata?.name
      || supabaseUser.user_metadata?.user_name
      || supabaseUser.user_metadata?.full_name
      || supabaseUser.email?.split('@')[0]
      || 'User';
    const avatarUrl = supabaseUser.user_metadata?.avatar_url
      || supabaseUser.user_metadata?.avatar
      || supabaseUser.user_metadata?.picture;
    const discordId = supabaseUser.user_metadata?.provider_id || null;
    const user = await getOrCreateUser(supabaseUser.id, discordId, username, avatarUrl);
    setLolaUser(user);

    if (discordId) {
      const perms = await fetchRoles(discordId);
      if (perms) setPermissions(perms);
    }
  };

  const syncDiscordXp = async () => {
    if (!supabaseUser) return;
    const discordId = supabaseUser.user_metadata?.provider_id || supabaseUser.id;
    try {
      const res = await fetch(`${FUNCTIONS_URL}/sync-juniper-xp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ discordId }),
      });
      if (res.ok) {
        await refreshUser();
      }
    } catch (e) {
      logger.error('syncDiscordXp error:', e);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user: lolaUser,
        supabaseUser,
        session,
        permissions,
        loading,
        error,
        signInWithDiscord,
        signOut,
        refreshUser,
        syncDiscordXp,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
