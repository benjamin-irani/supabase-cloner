/**
 * Authentication Provider
 * Wraps the app with NextAuth SessionProvider and manages auth state
 */

'use client';

import { SessionProvider } from 'next-auth/react';
import { useSession } from 'next-auth/react';
import { useEffect } from 'react';
import { useAuthStore } from '@/store';
import { SupabaseManagementAPI } from '@/lib/supabase';
import type { User, Organization } from '@/types';

interface AuthProviderProps {
  children: React.ReactNode;
}

function AuthStateManager({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const { 
    login, 
    logout, 
    setOrganizations, 
    setLoading,
    isAuthenticated 
  } = useAuthStore();

  useEffect(() => {
    setLoading(status === 'loading');

    if (status === 'authenticated' && session?.user && session.accessToken) {
      // Create user object from session
      const user: User = {
        id: session.user.email || '',
        email: session.user.email || '',
        name: session.user.name || '',
        avatar_url: session.user.image || undefined,
        organizations: [],
        permissions: [],
        last_login: new Date().toISOString(),
        mfa_enabled: false,
      };

      // Login user and fetch organizations
      login(user, session.accessToken as string);
      fetchUserOrganizations(session.accessToken as string);
    } else if (status === 'unauthenticated') {
      logout();
    }
  }, [session, status, login, logout, setLoading]);

  const fetchUserOrganizations = async (accessToken: string) => {
    try {
      const managementAPI = new SupabaseManagementAPI(accessToken);
      const response = await managementAPI.getOrganizations();
      
      if (response.success && response.data) {
        setOrganizations(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch organizations:', error);
    }
  };

  return <>{children}</>;
}

export function AuthProvider({ children }: AuthProviderProps) {
  return (
    <SessionProvider>
      <AuthStateManager>
        {children}
      </AuthStateManager>
    </SessionProvider>
  );
}
