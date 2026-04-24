'use client';

import { useState } from 'react';
import { Mic, Calendar, BarChart3 } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function TabsLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();

  const tabs = [
    {
      id: 'today',
      name: '今日记录',
      icon: Mic,
      href: '/',
    },
    {
      id: 'logs',
      name: '日志',
      icon: Calendar,
      href: '/logs',
    },
    {
      id: 'reports',
      name: '报告',
      icon: BarChart3,
      href: '/reports',
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-amber-50 to-orange-50 dark:from-gray-900 dark:to-amber-950">
      {/* Main content area with page transition */}
      <main className="flex-1 overflow-y-auto pb-20">
        <div key={pathname} className="page-enter">
          {children}
        </div>
      </main>

      {/* Bottom Tab Bar */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/90 dark:bg-gray-900/90 backdrop-blur-lg border-t border-gray-200 dark:border-gray-800 z-50">
        <div className="flex items-center justify-around h-20">
          {tabs.map((tab) => {
            const isActive = pathname === tab.href;
            const Icon = tab.icon;

            return (
              <Link
                key={tab.id}
                href={tab.href}
                className={`flex flex-col items-center justify-center flex-1 h-full transition-all duration-200 ${
                  isActive
                    ? 'text-amber-700 dark:text-amber-400'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                <div className={`relative p-3 rounded-full transition-all duration-200 ${
                  isActive
                    ? 'bg-amber-100 dark:bg-amber-900/30'
                    : ''
                }`}>
                  <Icon className="w-6 h-6" />
                  {isActive && (
                    <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-1.5 h-1.5 bg-amber-600 dark:bg-amber-400 rounded-full" />
                  )}
                </div>
                <span className={`text-xs mt-1 font-medium ${
                  isActive ? 'opacity-100' : 'opacity-80'
                }`}>
                  {tab.name}
                </span>
              </Link>
            );
          })}
        </div>

        {/* Safe area for mobile devices */}
        <div className="h-safe-bottom bg-white/90 dark:bg-gray-900/90" />
      </nav>
    </div>
  );
}