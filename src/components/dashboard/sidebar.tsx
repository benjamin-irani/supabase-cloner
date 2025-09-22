/**
 * Dashboard Sidebar
 * Navigation sidebar for the dashboard
 */

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Database,
  LayoutDashboard,
  Search,
  Copy,
  Activity,
  Settings,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  History,
  AlertTriangle,
  BarChart3,
} from 'lucide-react';
import { useMigrationStore } from '@/store';

const navigationItems = [
  {
    title: 'Overview',
    href: '/dashboard',
    icon: LayoutDashboard,
    description: 'Project overview and statistics',
  },
  {
    title: 'Projects',
    href: '/dashboard/projects',
    icon: Database,
    description: 'Browse and manage projects',
  },
  {
    title: 'Explorer',
    href: '/dashboard/explorer',
    icon: Search,
    description: 'Explore project structures',
  },
  {
    title: 'Migrations',
    href: '/dashboard/migrations',
    icon: Copy,
    description: 'Clone and migrate projects',
    badge: 'activeMigrations',
  },
  {
    title: 'History',
    href: '/dashboard/history',
    icon: History,
    description: 'Migration history and logs',
  },
  {
    title: 'Monitoring',
    href: '/dashboard/monitoring',
    icon: Activity,
    description: 'System monitoring and metrics',
  },
  {
    title: 'Analytics',
    href: '/dashboard/analytics',
    icon: BarChart3,
    description: 'Usage analytics and reports',
  },
];

const bottomNavigationItems = [
  {
    title: 'Settings',
    href: '/dashboard/settings',
    icon: Settings,
    description: 'Application settings',
  },
  {
    title: 'Help',
    href: '/dashboard/help',
    icon: HelpCircle,
    description: 'Documentation and support',
  },
];

export function DashboardSidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const pathname = usePathname();
  const { activeMigrations } = useMigrationStore();

  const getBadgeValue = (badgeKey: string) => {
    switch (badgeKey) {
      case 'activeMigrations':
        return activeMigrations.length > 0 ? activeMigrations.length : null;
      default:
        return null;
    }
  };

  return (
    <div
      className={cn(
        'bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 flex flex-col transition-all duration-300',
        isCollapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Header */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between">
          {!isCollapsed && (
            <div className="flex items-center space-x-2">
              <div className="p-1.5 bg-emerald-500 rounded-lg">
                <Database className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="font-semibold text-slate-900 dark:text-slate-100">
                  SupaClone
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Enterprise Edition
                </p>
              </div>
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="h-8 w-8 p-0"
          >
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 py-4">
        <nav className="space-y-1 px-3">
          {navigationItems.map((item) => {
            const isActive = pathname === item.href;
            const badgeValue = item.badge ? getBadgeValue(item.badge) : null;

            return (
              <Link key={item.href} href={item.href}>
                <div
                  className={cn(
                    'flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald-900 dark:text-emerald-100'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-700'
                  )}
                  title={isCollapsed ? item.description : undefined}
                >
                  <item.icon className="h-5 w-5 flex-shrink-0" />
                  {!isCollapsed && (
                    <>
                      <span className="flex-1">{item.title}</span>
                      {badgeValue && (
                        <Badge
                          variant="secondary"
                          className="h-5 px-1.5 text-xs"
                        >
                          {badgeValue}
                        </Badge>
                      )}
                    </>
                  )}
                </div>
              </Link>
            );
          })}
        </nav>

        <Separator className="my-4 mx-3" />

        {/* System Status */}
        {!isCollapsed && (
          <div className="px-6 py-2">
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">
              System Status
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600 dark:text-slate-400">
                  Active Migrations
                </span>
                <span className="font-medium text-slate-900 dark:text-slate-100">
                  {activeMigrations.length}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600 dark:text-slate-400">
                  System Health
                </span>
                <div className="flex items-center space-x-1">
                  <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                  <span className="font-medium text-green-600">Healthy</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <div className="border-t border-slate-200 dark:border-slate-700 p-3">
        <nav className="space-y-1">
          {bottomNavigationItems.map((item) => {
            const isActive = pathname === item.href;

            return (
              <Link key={item.href} href={item.href}>
                <div
                  className={cn(
                    'flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-slate-100 text-slate-900 dark:bg-slate-700 dark:text-slate-100'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-700'
                  )}
                  title={isCollapsed ? item.description : undefined}
                >
                  <item.icon className="h-5 w-5 flex-shrink-0" />
                  {!isCollapsed && <span>{item.title}</span>}
                </div>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
