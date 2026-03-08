'use client';

import { signIn } from 'next-auth/react';
import { useState } from 'react';
import { Flame, Github, Loader2 } from 'lucide-react';

export default function SignInPage() {
  const [isLoading, setIsLoading] = useState(false);

  const handleGitHubSignIn = async () => {
    setIsLoading(true);
    await signIn('github', { callbackUrl: '/dashboard' });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-950 px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <Flame className="w-10 h-10 text-orange-500" />
          <span className="text-3xl font-bold text-gray-900 dark:text-white">
            Afterburn
          </span>
        </div>

        {/* Sign in card */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 p-8">
          <h1 className="text-2xl font-bold text-center text-gray-900 dark:text-white mb-2">
            Welcome back
          </h1>
          <p className="text-center text-gray-500 dark:text-gray-400 mb-8">
            Sign in to access your dashboard
          </p>

          {/* GitHub Sign In */}
          <button
            onClick={handleGitHubSignIn}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg font-medium hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors disabled:opacity-50"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Github className="w-5 h-5" />
            )}
            Continue with GitHub
          </button>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200 dark:border-gray-800"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400">
                or
              </span>
            </div>
          </div>

          {/* Demo mode info */}
          <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
            <p className="text-sm text-orange-800 dark:text-orange-200">
              <strong>Free tier:</strong> Sync unlimited reports, view history, and track trends.
              <a href="#" className="underline ml-1">Learn about Pro features</a>
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-6">
          By signing in, you agree to our{' '}
          <a href="#" className="text-orange-600 hover:underline">Terms</a>
          {' '}and{' '}
          <a href="#" className="text-orange-600 hover:underline">Privacy Policy</a>
        </p>
      </div>
    </div>
  );
}
