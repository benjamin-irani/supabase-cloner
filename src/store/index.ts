/**
 * Global State Management
 * Using Zustand for lightweight, efficient state management
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type { 
  User, 
  Organization, 
  SupabaseProject, 
  MigrationJob,
  DashboardState,
  ProjectExplorerState,
  SystemMetrics 
} from '@/types';

// Authentication Store
interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  accessToken: string | null;
  organizations: Organization[];
  selectedOrganization: Organization | null;
  login: (user: User, accessToken: string) => void;
  logout: () => void;
  setOrganizations: (organizations: Organization[]) => void;
  selectOrganization: (organization: Organization) => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  devtools(
    persist(
      (set, get) => ({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        accessToken: null,
        organizations: [],
        selectedOrganization: null,

        login: (user, accessToken) => set({
          user,
          accessToken,
          isAuthenticated: true,
          isLoading: false,
        }),

        logout: () => set({
          user: null,
          accessToken: null,
          isAuthenticated: false,
          organizations: [],
          selectedOrganization: null,
        }),

        setOrganizations: (organizations) => {
          const current = get();
          set({ 
            organizations,
            selectedOrganization: current.selectedOrganization || organizations[0] || null
          });
        },

        selectOrganization: (organization) => set({
          selectedOrganization: organization,
        }),

        setLoading: (isLoading) => set({ isLoading }),
      }),
      {
        name: 'auth-store',
        partialize: (state) => ({
          user: state.user,
          accessToken: state.accessToken,
          isAuthenticated: state.isAuthenticated,
        }),
      }
    ),
    { name: 'auth-store' }
  )
);

// Dashboard Store
interface DashboardStore extends DashboardState {
  projects: SupabaseProject[];
  filteredProjects: SupabaseProject[];
  isLoading: boolean;
  error: string | null;
  setProjects: (projects: SupabaseProject[]) => void;
  setSelectedProject: (projectId: string | null) => void;
  setViewMode: (mode: 'grid' | 'list') => void;
  setFilters: (filters: Partial<DashboardState['filters']>) => void;
  setSearch: (search: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  refreshProjects: () => Promise<void>;
}

export const useDashboardStore = create<DashboardStore>()(
  devtools(
    (set, get) => ({
      // State
      projects: [],
      filteredProjects: [],
      selectedOrganization: null,
      selectedProject: null,
      viewMode: 'grid',
      filters: {
        status: [],
        region: [],
        tier: [],
      },
      search: '',
      isLoading: false,
      error: null,

      // Actions
      setProjects: (projects) => {
        const state = get();
        const filtered = filterProjects(projects, state.search, state.filters);
        set({ projects, filteredProjects: filtered });
      },

      setSelectedProject: (projectId) => set({ selectedProject: projectId }),

      setViewMode: (viewMode) => set({ viewMode }),

      setFilters: (newFilters) => {
        const state = get();
        const filters = { ...state.filters, ...newFilters };
        const filteredProjects = filterProjects(state.projects, state.search, filters);
        set({ filters, filteredProjects });
      },

      setSearch: (search) => {
        const state = get();
        const filteredProjects = filterProjects(state.projects, search, state.filters);
        set({ search, filteredProjects });
      },

      setLoading: (isLoading) => set({ isLoading }),

      setError: (error) => set({ error }),

      refreshProjects: async () => {
        // Implementation would fetch projects from API
        set({ isLoading: true, error: null });
        try {
          // Fetch projects logic here
          set({ isLoading: false });
        } catch (error) {
          set({ 
            isLoading: false, 
            error: error instanceof Error ? error.message : 'Failed to fetch projects'
          });
        }
      },
    }),
    { name: 'dashboard-store' }
  )
);

// Project Explorer Store
interface ProjectExplorerStore extends ProjectExplorerState {
  currentProject: SupabaseProject | null;
  schemas: any[];
  tables: any[];
  isLoading: boolean;
  error: string | null;
  setCurrentProject: (project: SupabaseProject | null) => void;
  setSelectedSchema: (schema: string) => void;
  setSelectedTable: (table: string | null) => void;
  setViewMode: (mode: 'table' | 'erd' | 'code') => void;
  toggleExpandedItem: (itemId: string) => void;
  loadSchemas: () => Promise<void>;
  loadTables: (schema: string) => Promise<void>;
}

export const useProjectExplorerStore = create<ProjectExplorerStore>()(
  devtools(
    (set, get) => ({
      // State
      currentProject: null,
      selectedSchema: 'public',
      selectedTable: null,
      viewMode: 'table',
      expandedItems: [],
      schemas: [],
      tables: [],
      isLoading: false,
      error: null,

      // Actions
      setCurrentProject: (currentProject) => set({ 
        currentProject,
        selectedSchema: 'public',
        selectedTable: null,
        schemas: [],
        tables: [],
      }),

      setSelectedSchema: (selectedSchema) => set({ 
        selectedSchema,
        selectedTable: null,
      }),

      setSelectedTable: (selectedTable) => set({ selectedTable }),

      setViewMode: (viewMode) => set({ viewMode }),

      toggleExpandedItem: (itemId) => {
        const state = get();
        const expandedItems = state.expandedItems.includes(itemId)
          ? state.expandedItems.filter(id => id !== itemId)
          : [...state.expandedItems, itemId];
        set({ expandedItems });
      },

      loadSchemas: async () => {
        set({ isLoading: true, error: null });
        try {
          // Implementation would load schemas from database
          set({ isLoading: false });
        } catch (error) {
          set({ 
            isLoading: false, 
            error: error instanceof Error ? error.message : 'Failed to load schemas'
          });
        }
      },

      loadTables: async (schema) => {
        set({ isLoading: true, error: null });
        try {
          // Implementation would load tables from database
          set({ isLoading: false });
        } catch (error) {
          set({ 
            isLoading: false, 
            error: error instanceof Error ? error.message : 'Failed to load tables'
          });
        }
      },
    }),
    { name: 'project-explorer-store' }
  )
);

// Migration Store
interface MigrationStore {
  activeMigrations: MigrationJob[];
  migrationHistory: MigrationJob[];
  isLoading: boolean;
  error: string | null;
  addMigration: (migration: MigrationJob) => void;
  updateMigration: (migrationId: string, updates: Partial<MigrationJob>) => void;
  removeMigration: (migrationId: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  startMigration: (config: any) => Promise<string>;
  cancelMigration: (migrationId: string) => Promise<void>;
  retryMigration: (migrationId: string) => Promise<void>;
}

export const useMigrationStore = create<MigrationStore>()(
  devtools(
    (set, get) => ({
      // State
      activeMigrations: [],
      migrationHistory: [],
      isLoading: false,
      error: null,

      // Actions
      addMigration: (migration) => {
        const state = get();
        set({
          activeMigrations: [...state.activeMigrations, migration],
        });
      },

      updateMigration: (migrationId, updates) => {
        const state = get();
        const activeMigrations = state.activeMigrations.map(migration =>
          migration.id === migrationId ? { ...migration, ...updates } : migration
        );
        
        const migrationHistory = state.migrationHistory.map(migration =>
          migration.id === migrationId ? { ...migration, ...updates } : migration
        );

        set({ activeMigrations, migrationHistory });
      },

      removeMigration: (migrationId) => {
        const state = get();
        const migration = state.activeMigrations.find(m => m.id === migrationId);
        
        set({
          activeMigrations: state.activeMigrations.filter(m => m.id !== migrationId),
          migrationHistory: migration 
            ? [...state.migrationHistory, migration]
            : state.migrationHistory,
        });
      },

      setLoading: (isLoading) => set({ isLoading }),

      setError: (error) => set({ error }),

      startMigration: async (config) => {
        set({ isLoading: true, error: null });
        try {
          // Implementation would start migration via API
          const migrationId = 'migration-' + Date.now();
          set({ isLoading: false });
          return migrationId;
        } catch (error) {
          set({ 
            isLoading: false, 
            error: error instanceof Error ? error.message : 'Failed to start migration'
          });
          throw error;
        }
      },

      cancelMigration: async (migrationId) => {
        try {
          // Implementation would cancel migration via API
          const state = get();
          state.updateMigration(migrationId, { status: 'cancelled' });
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Failed to cancel migration'
          });
          throw error;
        }
      },

      retryMigration: async (migrationId) => {
        try {
          // Implementation would retry migration via API
          const state = get();
          state.updateMigration(migrationId, { status: 'pending' });
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Failed to retry migration'
          });
          throw error;
        }
      },
    }),
    { name: 'migration-store' }
  )
);

// System Metrics Store
interface SystemMetricsStore {
  metrics: SystemMetrics | null;
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  updateMetrics: (metrics: SystemMetrics) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  startMetricsCollection: () => void;
  stopMetricsCollection: () => void;
}

export const useSystemMetricsStore = create<SystemMetricsStore>()(
  devtools(
    (set, get) => ({
      // State
      metrics: null,
      isLoading: false,
      error: null,
      lastUpdated: null,

      // Actions
      updateMetrics: (metrics) => set({ 
        metrics, 
        lastUpdated: new Date(),
        error: null,
      }),

      setLoading: (isLoading) => set({ isLoading }),

      setError: (error) => set({ error }),

      startMetricsCollection: () => {
        // Implementation would start real-time metrics collection
        console.log('Starting metrics collection...');
      },

      stopMetricsCollection: () => {
        // Implementation would stop metrics collection
        console.log('Stopping metrics collection...');
      },
    }),
    { name: 'system-metrics-store' }
  )
);

// Utility function to filter projects
function filterProjects(
  projects: SupabaseProject[],
  search: string,
  filters: DashboardState['filters']
): SupabaseProject[] {
  return projects.filter(project => {
    // Search filter
    if (search && !project.name.toLowerCase().includes(search.toLowerCase())) {
      return false;
    }

    // Status filter
    if (filters.status.length > 0 && !filters.status.includes(project.status)) {
      return false;
    }

    // Region filter
    if (filters.region.length > 0 && !filters.region.includes(project.region)) {
      return false;
    }

    // Note: Tier filter would require additional project metadata
    // if (filters.tier.length > 0 && !filters.tier.includes(project.tier)) {
    //   return false;
    // }

    return true;
  });
}
