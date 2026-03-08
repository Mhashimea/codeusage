'use client';

import { useSession } from 'next-auth/react';
import { Bell, Copy, Check } from 'lucide-react';
import { useState } from 'react';

export default function Header() {
  const { data: session } = useSession();
  const [copied, setCopied] = useState(false);

  const copyLicenseKey = async () => {
    if (session?.user?.licenseKey) {
      await navigator.clipboard.writeText(session.user.licenseKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <header className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-200 dark:bg-gray-900 dark:border-gray-800">
      <div className="flex items-center gap-4">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
          Dashboard
        </h1>
      </div>

      <div className="flex items-center gap-4">
        {/* License Key */}
        {session?.user?.licenseKey && (
          <button
            onClick={copyLicenseKey}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            title="Click to copy license key"
          >
            <code className="font-mono text-xs">
              {session.user.licenseKey.slice(0, 12)}...
            </code>
            {copied ? (
              <Check className="w-4 h-4 text-green-500" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </button>
        )}

        {/* Notifications */}
        <button className="relative p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-orange-500 rounded-full"></span>
        </button>

        {/* User avatar */}
        <div className="flex items-center gap-3">
          {session?.user?.image ? (
            <img
              src={session.user.image}
              alt={session.user.name ?? 'User'}
              className="w-8 h-8 rounded-full"
            />
          ) : (
            <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center text-white font-medium">
              {session?.user?.name?.[0] ?? 'U'}
            </div>
          )}
          <span className="text-sm font-medium text-gray-900 dark:text-white">
            {session?.user?.name ?? 'User'}
          </span>
        </div>
      </div>
    </header>
  );
}
