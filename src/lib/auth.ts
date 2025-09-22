/**
 * NextAuth Configuration
 * Handles OAuth 2.0 flow with Supabase Management API
 */

import { NextAuthOptions } from 'next-auth';
import { config } from './config';
import { SecurityManager, AuditLogger, RateLimiter } from './security-client';

// Custom OAuth provider for Supabase Management API
const SupabaseManagementProvider = {
  id: 'supabase-management',
  name: 'Supabase',
  type: 'oauth' as const,
  authorization: {
    url: 'https://api.supabase.com/v1/oauth/authorize',
    params: {
      scope: 'read write',
      response_type: 'code',
    },
  },
  token: {
    url: 'https://api.supabase.com/v1/oauth/token',
  },
  userinfo: 'https://api.supabase.com/v1/profile',
  clientId: config.auth.supabaseOAuthClientId,
  clientSecret: config.auth.supabaseOAuthClientSecret,
  profile(profile: any) {
    return {
      id: profile.id,
      name: profile.full_name || profile.name,
      email: profile.email,
      image: profile.avatar_url,
    };
  },
};

// Mock provider for development when OAuth credentials are not available
const DevelopmentMockProvider = {
  id: 'development-mock',
  name: 'Development Demo',
  type: 'credentials' as const,
  credentials: {
    email: { label: 'Email', type: 'email', placeholder: 'demo@example.com' },
    password: { label: 'Password', type: 'password', placeholder: 'demo' }
  },
  async authorize(credentials: any) {
    // Simple demo authentication
    if (credentials?.email === 'demo@example.com' && credentials?.password === 'demo') {
      return {
        id: 'demo-user-id',
        name: 'Demo User',
        email: 'demo@example.com',
        image: null,
      };
    }
    return null;
  },
};

// Determine which providers to use
const getProviders = () => {
  const providers = [];
  
  // Use real OAuth provider if credentials are available
  if (config.auth.supabaseOAuthClientId !== 'demo_client_id' && 
      config.auth.supabaseOAuthClientSecret !== 'demo_client_secret') {
    providers.push(SupabaseManagementProvider);
  }
  
  // Always include development provider for testing
  if (process.env.NODE_ENV === 'development') {
    providers.push(DevelopmentMockProvider);
  }
  
  return providers;
};

export const authOptions: NextAuthOptions = {
  providers: getProviders(),
  callbacks: {
    async jwt({ token, account, profile, trigger }) {
      try {
        console.log('JWT callback triggered:', { trigger, hasAccount: !!account, hasProfile: !!profile });
        
        // Handle token refresh
        if (trigger === 'update' && token.refreshToken) {
          try {
            const refreshResult = await authUtils.refreshAccessToken(token.refreshToken as string);
            if (refreshResult) {
              token.accessToken = refreshResult.accessToken;
              token.expiresAt = refreshResult.expiresAt;
            }
          } catch (refreshError) {
            console.error('Token refresh failed:', refreshError);
          }
        }

        // Persist the OAuth access_token to the token right after signin
        if (account) {
          console.log('OAuth account received:', { 
            provider: account.provider, 
            type: account.type,
            hasAccessToken: !!account.access_token,
            hasRefreshToken: !!account.refresh_token
          });
          
          try {
            // Encrypt sensitive tokens (using async encryption)
            token.accessToken = await SecurityManager.encrypt(account.access_token || '');
            token.refreshToken = await SecurityManager.encrypt(account.refresh_token || '');
            token.expiresAt = account.expires_at;
            
            // Log authentication event
            AuditLogger.logSecurityEvent({
              type: 'auth',
              action: 'token_issued',
              userId: token.email as string,
              details: { provider: account.provider },
            });
            
            console.log('OAuth tokens encrypted and stored');
          } catch (encryptError) {
            console.error('Token encryption failed:', encryptError);
            // Fallback to unencrypted tokens for now
            token.accessToken = account.access_token || '';
            token.refreshToken = account.refresh_token || '';
            token.expiresAt = account.expires_at;
          }
        }
        
        console.log('JWT token updated:', { 
          hasAccessToken: !!token.accessToken, 
          hasRefreshToken: !!token.refreshToken,
          expiresAt: token.expiresAt 
        });
        
        return token;
      } catch (error) {
        console.error('JWT callback error:', error);
        return token;
      }
    },
    async session({ session, token }) {
      try {
        // Decrypt tokens for session (using async decryption)
        session.accessToken = await SecurityManager.decrypt(token.accessToken as string);
        session.refreshToken = await SecurityManager.decrypt(token.refreshToken as string);
        session.expiresAt = token.expiresAt as number;

        // Check token expiration
        if (session.expiresAt && Date.now() > session.expiresAt * 1000) {
          // Token expired, attempt refresh
          const refreshResult = await authUtils.refreshAccessToken(session.refreshToken);
          if (refreshResult) {
            session.accessToken = refreshResult.accessToken;
            session.expiresAt = refreshResult.expiresAt;
          } else {
            // Refresh failed, return session without tokens
            session.accessToken = '';
            session.refreshToken = '';
          }
        }

        return session;
      } catch (error) {
        console.error('Session callback error:', error);
        // Return session with empty tokens instead of null
        session.accessToken = '';
        session.refreshToken = '';
        return session;
      }
    },
    async signIn({ user, account, profile, credentials }) {
      try {
        console.log('SignIn callback triggered:', { 
          hasUser: !!user, 
          hasAccount: !!account, 
          hasProfile: !!profile,
          userEmail: user?.email,
          accountProvider: account?.provider,
          accountType: account?.type
        });

        // Rate limiting check
        const rateLimit = RateLimiter.checkRateLimit(
          `signin:${user.email}`, 
          5, // 5 attempts
          300000 // 5 minutes
        );

        if (!rateLimit.allowed) {
          console.log('Rate limit exceeded for signin');
          AuditLogger.logSecurityEvent({
            type: 'auth',
            action: 'rate_limit_exceeded',
            userId: user.email,
            details: { resetTime: rateLimit.resetTime },
          });
          return false;
        }

        // Validate user email format
        if (!user.email || !SecurityManager.sanitizeInput(user.email)) {
          console.log('Invalid email for signin:', user.email);
          AuditLogger.logSecurityEvent({
            type: 'auth',
            action: 'invalid_email',
            userId: user.email,
            details: { email: user.email },
          });
          return false;
        }

        // Additional security validation
        if (account?.access_token) {
          console.log('Validating access token...');
          const isValid = await authUtils.validateAccessToken(account.access_token);
          if (!isValid) {
            console.log('Invalid access token');
            AuditLogger.logSecurityEvent({
              type: 'auth',
              action: 'invalid_token',
              userId: user.email,
              details: { provider: account.provider },
            });
            return false;
          }
        }

        // Log successful sign in
        console.log('SignIn successful for user:', user.email);
        AuditLogger.logSecurityEvent({
          type: 'auth',
          action: 'signin_success',
          userId: user.email,
          details: { provider: account?.provider },
        });

        return true;
      } catch (error) {
        console.error('SignIn callback error:', error);
        AuditLogger.logSecurityEvent({
          type: 'auth',
          action: 'signin_error',
          userId: user.email,
          details: { error: error instanceof Error ? error.message : 'Unknown error' },
        });
        return false;
      }
    },
    async redirect({ url, baseUrl }) {
      console.log('Redirect callback triggered:', { url, baseUrl });
      
      // If URL is relative, make it absolute
      if (url.startsWith('/')) {
        const redirectUrl = `${baseUrl}${url}`;
        console.log('Redirecting to relative URL:', redirectUrl);
        return redirectUrl;
      }
      
      // If URL is on the same origin, allow it
      if (url.startsWith(baseUrl)) {
        console.log('Redirecting to same origin:', url);
        return url;
      }
      
      // Default to dashboard
      console.log('Default redirect to dashboard');
      return `${baseUrl}/dashboard`;
    },
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  jwt: {
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  debug: process.env.NODE_ENV === 'development',
};

/**
 * Authentication utilities
 */
export const authUtils = {
  /**
   * Check if user has access to organization
   */
  hasOrganizationAccess: (userId: string, organizationId: string): boolean => {
    // Implementation would check user permissions
    return true;
  },

  /**
   * Check if user can perform migration operations
   */
  canPerformMigration: (userId: string, organizationId: string): boolean => {
    // Implementation would check user role and permissions
    return true;
  },

  /**
   * Validate access token
   */
  validateAccessToken: async (token: string): Promise<boolean> => {
    try {
      const response = await fetch('https://api.supabase.com/v1/profile', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      return response.ok;
    } catch {
      return false;
    }
  },

  /**
   * Refresh access token
   */
  refreshAccessToken: async (refreshToken: string): Promise<{
    accessToken: string;
    expiresAt: number;
  } | null> => {
    try {
      const response = await fetch('https://api.supabase.com/v1/oauth/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
          client_id: process.env.SUPABASE_OAUTH_CLIENT_ID!,
          client_secret: process.env.SUPABASE_OAUTH_CLIENT_SECRET!,
        }),
      });

      if (!response.ok) return null;

      const data = await response.json();
      return {
        accessToken: data.access_token,
        expiresAt: Date.now() + data.expires_in * 1000,
      };
    } catch {
      return null;
    }
  },
};
