/**
 * Dashboard Header
 * Top header with user menu, notifications, and global actions
 */

'use client';

import { useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useAuthStore } from '@/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Search,
  Bell,
  Plus,
  Settings,
  LogOut,
  User,
  Building,
  ChevronDown,
} from 'lucide-react';

export function DashboardHeader() {
  const { data: session } = useSession();
  const { selectedOrganization, organizations, selectOrganization } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState('');

  const handleOrganizationChange = (orgId: string) => {
    const org = organizations.find(o => o.id === orgId);
    if (org) {
      selectOrganization(org);
    }
  };

  const handleSignOut = async () => {
    await signOut({ callbackUrl: '/auth/signin' });
  };

  const userInitials = session?.user?.name
    ?.split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase() || '??';

  return (
    <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Left Section - Search and Organization Selector */}
        <div className="flex items-center space-x-4 flex-1">
          {/* Organization Selector */}
          {organizations.length > 0 && (
            <div className="flex items-center space-x-2">
              <Building className="h-4 w-4 text-slate-500" />
              <Select
                value={selectedOrganization?.id || ''}
                onValueChange={handleOrganizationChange}
              >
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Select organization">
                    {selectedOrganization?.name}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {organizations.map((org) => (
                    <SelectItem key={org.id} value={org.id}>
                      <div className="flex items-center justify-between w-full">
                        <span>{org.name}</span>
                        <Badge variant="outline" className="ml-2 text-xs">
                          {org.tier}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Global Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search projects, tables, functions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Right Section - Actions and User Menu */}
        <div className="flex items-center space-x-4">
          {/* Quick Actions */}
          <Button size="sm" className="hidden sm:flex">
            <Plus className="h-4 w-4 mr-2" />
            New Migration
          </Button>

          {/* Notifications */}
          <Button variant="ghost" size="sm" className="relative">
            <Bell className="h-4 w-4" />
            <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 text-xs">
              3
            </Badge>
          </Button>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center space-x-2 p-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={session?.user?.image || undefined} />
                  <AvatarFallback className="text-sm">
                    {userInitials}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden sm:block text-left">
                  <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                    {session?.user?.name || 'User'}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {session?.user?.email}
                  </div>
                </div>
                <ChevronDown className="h-4 w-4 text-slate-400" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <User className="mr-2 h-4 w-4" />
                <span>Profile</span>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Settings className="mr-2 h-4 w-4" />
                <span>Settings</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Sign out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Breadcrumb/Context Bar */}
      {selectedOrganization && (
        <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
          <div className="flex items-center space-x-2 text-sm text-slate-600 dark:text-slate-400">
            <Building className="h-4 w-4" />
            <span>{selectedOrganization.name}</span>
            <span>•</span>
            <Badge variant="outline">
              {selectedOrganization.projects?.length || 0} projects
            </Badge>
            <span>•</span>
            <Badge variant="outline" className="capitalize">
              {selectedOrganization.tier} plan
            </Badge>
          </div>
        </div>
      )}
    </header>
  );
}
