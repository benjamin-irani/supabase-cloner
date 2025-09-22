/**
 * Sign In Page
 * OAuth 2.0 authentication with Supabase Management API
 */

'use client';

import { useState, useEffect } from 'react';
import { signIn, getSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Shield, Database, Zap } from 'lucide-react';

export default function SignInPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    // Check if user is already authenticated
    getSession().then((session) => {
      if (session) {
        router.push('/dashboard');
      }
    });
  }, [router]);

  const handleSignIn = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const result = await signIn('supabase-management', {
        callbackUrl: '/dashboard',
        redirect: false,
      });

      if (result?.error) {
        setError('Authentication failed. Please try again.');
      } else if (result?.url) {
        router.push(result.url);
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <div className="p-2 bg-emerald-500 rounded-lg">
              <Database className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
              SupaClone
            </h1>
          </div>
          <p className="text-slate-600 dark:text-slate-400">
            Enterprise-grade Supabase project cloning and migration
          </p>
        </div>

        {/* Sign In Card */}
        <Card className="border-0 shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Welcome Back</CardTitle>
            <CardDescription>
              Sign in with your Supabase account to manage your projects
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button
              onClick={handleSignIn}
              disabled={isLoading}
              className="w-full h-12 text-base font-medium"
              size="lg"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <Shield className="mr-2 h-4 w-4" />
                  Sign in with Supabase
                </>
              )}
            </Button>

            <div className="text-xs text-slate-500 dark:text-slate-400 text-center">
              By signing in, you agree to our Terms of Service and Privacy Policy
            </div>
          </CardContent>
        </Card>

        {/* Features */}
        <div className="grid grid-cols-1 gap-4 mt-8">
          <div className="flex items-start space-x-3 p-4 bg-white dark:bg-slate-800 rounded-lg border">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <Shield className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="font-medium text-slate-900 dark:text-slate-100">
                Secure Authentication
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                OAuth 2.0 with PKCE flow for maximum security
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3 p-4 bg-white dark:bg-slate-800 rounded-lg border">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-900 rounded-lg">
              <Database className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h3 className="font-medium text-slate-900 dark:text-slate-100">
                Complete Project Access
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Access all your organizations and projects
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3 p-4 bg-white dark:bg-slate-800 rounded-lg border">
            <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
              <Zap className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h3 className="font-medium text-slate-900 dark:text-slate-100">
                Enterprise Features
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Advanced migration, monitoring, and audit capabilities
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
