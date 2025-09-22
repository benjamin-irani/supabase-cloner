/**
 * Migration Wizard Component
 * Step-by-step interface for configuring and starting project migrations
 */

'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store';
import { SupabaseManagementAPI } from '@/lib/supabase';
import { MigrationEngine } from '@/lib/migration-engine';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import {
  ArrowLeft,
  ArrowRight,
  Database,
  Copy,
  Settings,
  Shield,
  Zap,
  CheckCircle,
  AlertTriangle,
  Info,
  Clock,
  HardDrive,
  Network,
} from 'lucide-react';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import type { SupabaseProject, MigrationConfiguration } from '@/types';

interface MigrationWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onMigrationStarted?: (jobId: string) => void;
  preselectedProject?: SupabaseProject;
}

type WizardStep = 'source' | 'target' | 'configuration' | 'review' | 'progress';

const regions = [
  { value: 'us-east-1', label: 'US East (N. Virginia)', flag: '🇺🇸' },
  { value: 'us-west-1', label: 'US West (N. California)', flag: '🇺🇸' },
  { value: 'eu-west-1', label: 'EU West (Ireland)', flag: '🇪🇺' },
  { value: 'ap-southeast-1', label: 'Asia Pacific (Singapore)', flag: '🇸🇬' },
  { value: 'ap-northeast-1', label: 'Asia Pacific (Tokyo)', flag: '🇯🇵' },
];

const tiers = [
  { value: 'free', label: 'Free', description: 'Perfect for hobby projects', price: '$0/month' },
  { value: 'pro', label: 'Pro', description: 'For production applications', price: '$25/month' },
  { value: 'team', label: 'Team', description: 'For growing teams', price: '$599/month' },
];

export function MigrationWizard({ 
  isOpen, 
  onClose, 
  onMigrationStarted, 
  preselectedProject 
}: MigrationWizardProps) {
  const { data: session } = useSession();
  const { selectedOrganization, user } = useAuthStore();
  
  // Wizard state
  const [currentStep, setCurrentStep] = useState<WizardStep>('source');
  const [isLoading, setIsLoading] = useState(false);
  const [projects, setProjects] = useState<SupabaseProject[]>([]);
  
  // Form data
  const [sourceProject, setSourceProject] = useState<SupabaseProject | null>(preselectedProject || null);
  const [targetProjectName, setTargetProjectName] = useState('');
  const [targetRegion, setTargetRegion] = useState('us-east-1');
  const [targetTier, setTargetTier] = useState('free');
  const [configuration, setConfiguration] = useState<MigrationConfiguration>({
    clone_type: 'full_clone',
    target_region: 'us-east-1',
    target_compute_tier: 'free',
    parallel_threads: 4,
    batch_size: 1000,
    enable_compression: true,
    include_storage: true,
    include_edge_functions: true,
    include_auth_config: true,
    preserve_user_data: true,
  });
  
  // Migration state
  const [migrationEngine, setMigrationEngine] = useState<MigrationEngine | null>(null);
  const [migrationJobId, setMigrationJobId] = useState<string | null>(null);
  const [estimatedDuration, setEstimatedDuration] = useState(0);

  useEffect(() => {
    if (isOpen && selectedOrganization && session?.accessToken) {
      loadProjects();
      initializeMigrationEngine();
    }
  }, [isOpen, selectedOrganization, session?.accessToken]);

  useEffect(() => {
    if (sourceProject) {
      setTargetProjectName(`${sourceProject.name}-clone`);
      estimateMigrationDuration();
    }
  }, [sourceProject, configuration]);

  const loadProjects = async () => {
    if (!selectedOrganization || !session?.accessToken) return;

    setIsLoading(true);
    try {
      const managementAPI = new SupabaseManagementAPI(session.accessToken as string);
      const response = await managementAPI.getProjects(selectedOrganization.id);
      
      if (response.success && response.data) {
        setProjects(response.data);
      } else {
        // Use mock data for demonstration
        const mockProjects: SupabaseProject[] = [
          {
            id: '1',
            ref: 'abcdefghijklmnopqrst',
            name: 'production-api',
            organization_id: selectedOrganization.id,
            created_at: '2024-01-15T10:00:00Z',
            updated_at: '2024-09-20T15:30:00Z',
            status: 'ACTIVE_HEALTHY',
            region: 'us-east-1',
            database: { version: '15.1', host: 'db.abcdefghijklmnopqrst.supabase.co', port: 5432 },
            api_url: 'https://abcdefghijklmnopqrst.supabase.co',
            db_dns_name: 'db.abcdefghijklmnopqrst.supabase.co',
            jwt_secret: 'jwt-secret',
            service_role_key: 'service-role-key',
            anon_key: 'anon-key',
          },
          {
            id: '2',
            ref: 'zyxwvutsrqponmlkjihg',
            name: 'staging-frontend',
            organization_id: selectedOrganization.id,
            created_at: '2024-02-10T14:20:00Z',
            updated_at: '2024-09-22T09:15:00Z',
            status: 'ACTIVE_HEALTHY',
            region: 'us-west-1',
            database: { version: '15.1', host: 'db.zyxwvutsrqponmlkjihg.supabase.co', port: 5432 },
            api_url: 'https://zyxwvutsrqponmlkjihg.supabase.co',
            db_dns_name: 'db.zyxwvutsrqponmlkjihg.supabase.co',
            jwt_secret: 'jwt-secret',
            service_role_key: 'service-role-key',
            anon_key: 'anon-key',
          },
        ];
        setProjects(mockProjects);
      }
    } catch (error) {
      toast.error('Failed to load projects');
    } finally {
      setIsLoading(false);
    }
  };

  const initializeMigrationEngine = () => {
    if (session?.accessToken) {
      const engine = new MigrationEngine(session.accessToken as string);
      setMigrationEngine(engine);
    }
  };

  const estimateMigrationDuration = () => {
    if (!sourceProject) return;

    // Mock estimation based on project size and configuration
    let baseTime = 300; // 5 minutes base
    
    if (configuration.clone_type === 'full_clone') {
      baseTime *= 3; // Full clone takes 3x longer
    }
    
    if (configuration.include_storage) {
      baseTime += 600; // Add 10 minutes for storage
    }
    
    if (configuration.include_edge_functions) {
      baseTime += 180; // Add 3 minutes for functions
    }

    // Adjust for parallel processing
    baseTime = baseTime / configuration.parallel_threads;

    setEstimatedDuration(baseTime);
  };

  const handleNext = () => {
    const steps: WizardStep[] = ['source', 'target', 'configuration', 'review', 'progress'];
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex < steps.length - 1) {
      setCurrentStep(steps[currentIndex + 1]);
    }
  };

  const handleBack = () => {
    const steps: WizardStep[] = ['source', 'target', 'configuration', 'review', 'progress'];
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1]);
    }
  };

  const handleStartMigration = async () => {
    if (!sourceProject || !migrationEngine || !selectedOrganization) {
      toast.error('Missing required information');
      return;
    }

    setIsLoading(true);
    try {
      const jobId = await migrationEngine.startMigration({
        sourceProject,
        targetProjectName,
        targetRegion,
        targetTier,
        configuration,
        organizationId: selectedOrganization.id,
      }, user?.email || 'unknown');

      setMigrationJobId(jobId);
      setCurrentStep('progress');
      onMigrationStarted?.(jobId);
      toast.success('Migration started successfully');

    } catch (error) {
      toast.error('Failed to start migration');
      console.error('Migration start error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 'source':
        return sourceProject !== null;
      case 'target':
        return targetProjectName.trim() !== '' && targetRegion && targetTier;
      case 'configuration':
        return true;
      case 'review':
        return true;
      default:
        return false;
    }
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const renderSourceStep = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium mb-2">Select Source Project</h3>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Choose the project you want to clone or migrate from.
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-16 bg-slate-100 dark:bg-slate-800 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {projects.map((project) => (
            <Card
              key={project.id}
              className={`cursor-pointer transition-all ${
                sourceProject?.id === project.id
                  ? 'ring-2 ring-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                  : 'hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
              onClick={() => setSourceProject(project)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Database className="h-5 w-5 text-slate-600" />
                    <div>
                      <div className="font-medium">{project.name}</div>
                      <div className="text-sm text-slate-500">
                        {project.region} • PostgreSQL {project.database.version}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline" className={
                      project.status === 'ACTIVE_HEALTHY' 
                        ? 'text-green-600 border-green-200'
                        : 'text-yellow-600 border-yellow-200'
                    }>
                      {project.status === 'ACTIVE_HEALTHY' ? 'Healthy' : project.status}
                    </Badge>
                    {sourceProject?.id === project.id && (
                      <CheckCircle className="h-5 w-5 text-emerald-600" />
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {projects.length === 0 && !isLoading && (
        <div className="text-center py-8">
          <Database className="h-12 w-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-2">
            No Projects Found
          </h3>
          <p className="text-slate-500 dark:text-slate-400">
            No projects are available in this organization.
          </p>
        </div>
      )}
    </div>
  );

  const renderTargetStep = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium mb-2">Configure Target Project</h3>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Set up the destination for your cloned project.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <Label htmlFor="target-name">Project Name</Label>
          <Input
            id="target-name"
            value={targetProjectName}
            onChange={(e) => setTargetProjectName(e.target.value)}
            placeholder="Enter target project name"
            className="mt-1"
          />
          <p className="text-xs text-slate-500 mt-1">
            Must be unique within your organization
          </p>
        </div>

        <div>
          <Label>Region</Label>
          <Select value={targetRegion} onValueChange={setTargetRegion}>
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {regions.map((region) => (
                <SelectItem key={region.value} value={region.value}>
                  <div className="flex items-center space-x-2">
                    <span>{region.flag}</span>
                    <span>{region.label}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Pricing Tier</Label>
          <div className="mt-2 space-y-3">
            {tiers.map((tier) => (
              <Card
                key={tier.value}
                className={`cursor-pointer transition-all ${
                  targetTier === tier.value
                    ? 'ring-2 ring-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                    : 'hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
                onClick={() => setTargetTier(tier.value)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{tier.label}</div>
                      <div className="text-sm text-slate-500">{tier.description}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">{tier.price}</div>
                      {targetTier === tier.value && (
                        <CheckCircle className="h-4 w-4 text-emerald-600 ml-auto mt-1" />
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderConfigurationStep = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium mb-2">Migration Configuration</h3>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Configure how your project will be migrated.
        </p>
      </div>

      <div className="space-y-6">
        <div>
          <Label>Clone Type</Label>
          <div className="mt-2 space-y-3">
            {[
              { value: 'full_clone', label: 'Full Clone', description: 'Complete project with all data' },
              { value: 'schema_only', label: 'Schema Only', description: 'Structure without data' },
              { value: 'data_subset', label: 'Data Subset', description: 'Partial data migration' },
            ].map((type) => (
              <Card
                key={type.value}
                className={`cursor-pointer transition-all ${
                  configuration.clone_type === type.value
                    ? 'ring-2 ring-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                    : 'hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
                onClick={() => setConfiguration({ ...configuration, clone_type: type.value as any })}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{type.label}</div>
                      <div className="text-sm text-slate-500">{type.description}</div>
                    </div>
                    {configuration.clone_type === type.value && (
                      <CheckCircle className="h-5 w-5 text-emerald-600" />
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <Separator />

        <div>
          <Label>Performance Settings</Label>
          <div className="mt-4 space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm">Parallel Threads</span>
                <span className="text-sm font-medium">{configuration.parallel_threads}</span>
              </div>
              <Slider
                value={[configuration.parallel_threads]}
                onValueChange={(value) => setConfiguration({ ...configuration, parallel_threads: value[0] })}
                min={1}
                max={10}
                step={1}
                className="w-full"
              />
              <p className="text-xs text-slate-500 mt-1">
                Higher values = faster migration but more resource usage
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm">Batch Size</span>
                <span className="text-sm font-medium">{configuration.batch_size.toLocaleString()}</span>
              </div>
              <Slider
                value={[configuration.batch_size]}
                onValueChange={(value) => setConfiguration({ ...configuration, batch_size: value[0] })}
                min={100}
                max={10000}
                step={100}
                className="w-full"
              />
            </div>
          </div>
        </div>

        <Separator />

        <div>
          <Label>Include Components</Label>
          <div className="mt-4 space-y-4">
            {[
              { key: 'include_storage', label: 'Storage Buckets & Objects', icon: HardDrive },
              { key: 'include_edge_functions', label: 'Edge Functions', icon: Zap },
              { key: 'include_auth_config', label: 'Authentication Configuration', icon: Shield },
              { key: 'preserve_user_data', label: 'Preserve User Data', icon: Database },
              { key: 'enable_compression', label: 'Enable Compression', icon: Network },
            ].map(({ key, label, icon: Icon }) => (
              <div key={key} className="flex items-center space-x-3">
                <Checkbox
                  id={key}
                  checked={configuration[key as keyof MigrationConfiguration] as boolean}
                  onCheckedChange={(checked) => 
                    setConfiguration({ ...configuration, [key]: checked })
                  }
                />
                <Icon className="h-4 w-4 text-slate-600" />
                <Label htmlFor={key} className="font-normal">{label}</Label>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderReviewStep = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium mb-2">Review Migration</h3>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Review your migration configuration before starting.
        </p>
      </div>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Source Project</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-3">
              <Database className="h-5 w-5 text-slate-600" />
              <div>
                <div className="font-medium">{sourceProject?.name}</div>
                <div className="text-sm text-slate-500">
                  {sourceProject?.region} • {sourceProject?.database.version}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Target Project</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div><strong>Name:</strong> {targetProjectName}</div>
              <div><strong>Region:</strong> {regions.find(r => r.value === targetRegion)?.label}</div>
              <div><strong>Tier:</strong> {tiers.find(t => t.value === targetTier)?.label}</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Configuration</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div><strong>Clone Type:</strong> {configuration.clone_type.replace('_', ' ')}</div>
              <div><strong>Parallel Threads:</strong> {configuration.parallel_threads}</div>
              <div><strong>Batch Size:</strong> {configuration.batch_size.toLocaleString()}</div>
              <div><strong>Include Storage:</strong> {configuration.include_storage ? 'Yes' : 'No'}</div>
              <div><strong>Include Functions:</strong> {configuration.include_edge_functions ? 'Yes' : 'No'}</div>
            </div>
          </CardContent>
        </Card>

        <Alert>
          <Clock className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-1">
              <div><strong>Estimated Duration:</strong> {formatDuration(estimatedDuration)}</div>
              <div className="text-sm">
                Actual time may vary based on data size and network conditions.
              </div>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );

  const renderProgressStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-medium mb-2">Migration In Progress</h3>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Your project is being migrated. This may take several minutes.
        </p>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
            <div className="text-lg font-medium mb-2">Migration Started</div>
            <div className="text-sm text-slate-600 dark:text-slate-400">
              Job ID: {migrationJobId}
            </div>
          </div>
        </CardContent>
      </Card>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          You can monitor the detailed progress on the Migrations page. 
          You&apos;ll receive notifications when the migration completes.
        </AlertDescription>
      </Alert>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Copy className="h-5 w-5" />
            <span>Migration Wizard</span>
          </DialogTitle>
          <DialogDescription>
            Clone and migrate your Supabase project with enterprise-grade reliability
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Progress Steps */}
          <div className="flex items-center justify-between">
            {['Source', 'Target', 'Config', 'Review', 'Progress'].map((step, index) => {
              const stepKeys: WizardStep[] = ['source', 'target', 'configuration', 'review', 'progress'];
              const currentIndex = stepKeys.indexOf(currentStep);
              const isActive = index === currentIndex;
              const isCompleted = index < currentIndex;
              
              return (
                <div key={step} className="flex items-center">
                  <div className={`
                    flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium
                    ${isActive 
                      ? 'bg-emerald-600 text-white' 
                      : isCompleted 
                        ? 'bg-emerald-100 text-emerald-600' 
                        : 'bg-slate-100 text-slate-400'
                    }
                  `}>
                    {isCompleted ? <CheckCircle className="h-4 w-4" /> : index + 1}
                  </div>
                  <span className={`ml-2 text-sm ${isActive ? 'font-medium' : 'text-slate-500'}`}>
                    {step}
                  </span>
                  {index < 4 && (
                    <div className={`w-8 h-0.5 mx-4 ${isCompleted ? 'bg-emerald-200' : 'bg-slate-200'}`} />
                  )}
                </div>
              );
            })}
          </div>

          {/* Step Content */}
          <div className="min-h-[400px]">
            {currentStep === 'source' && renderSourceStep()}
            {currentStep === 'target' && renderTargetStep()}
            {currentStep === 'configuration' && renderConfigurationStep()}
            {currentStep === 'review' && renderReviewStep()}
            {currentStep === 'progress' && renderProgressStep()}
          </div>

          {/* Navigation */}
          {currentStep !== 'progress' && (
            <div className="flex items-center justify-between pt-6 border-t">
              <Button
                variant="outline"
                onClick={handleBack}
                disabled={currentStep === 'source'}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>

              <div className="flex space-x-2">
                <Button variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                
                {currentStep === 'review' ? (
                  <Button 
                    onClick={handleStartMigration} 
                    disabled={isLoading}
                    className="min-w-[120px]"
                  >
                    {isLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Starting...
                      </>
                    ) : (
                      <>
                        <Copy className="mr-2 h-4 w-4" />
                        Start Migration
                      </>
                    )}
                  </Button>
                ) : (
                  <Button 
                    onClick={handleNext} 
                    disabled={!canProceed()}
                  >
                    Next
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
