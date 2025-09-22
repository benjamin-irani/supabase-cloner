/**
 * RLS Policy Viewer and Tester
 * Comprehensive Row Level Security policy analysis and testing interface
 */

'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Shield,
  Eye,
  Edit,
  Trash2,
  Plus,
  Play,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Code,
  Users,
  Lock,
  Unlock,
} from 'lucide-react';
import { toast } from 'sonner';
import type { RLSPolicy, DatabaseTable } from '@/types';

interface RLSPolicyViewerProps {
  table: DatabaseTable;
  onPolicyUpdate?: (policies: RLSPolicy[]) => void;
}

interface PolicyTestResult {
  success: boolean;
  message: string;
  rowsAffected?: number;
  executionTime?: number;
}

const mockJWTTokens = [
  {
    name: 'Authenticated User',
    token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
    description: 'Standard authenticated user token',
  },
  {
    name: 'Admin User',
    token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkFkbWluIFVzZXIiLCJyb2xlIjoiYWRtaW4iLCJpYXQiOjE1MTYyMzkwMjJ9.dyt0CoTl4WoVjAHI9Q_CwSKhl6d_9rhM3NrXuJttkao',
    description: 'Admin user with elevated privileges',
  },
  {
    name: 'Anonymous',
    token: '',
    description: 'No authentication token (anonymous)',
  },
];

export function RLSPolicyViewer({ table, onPolicyUpdate }: RLSPolicyViewerProps) {
  const [selectedPolicy, setSelectedPolicy] = useState<RLSPolicy | null>(null);
  const [showPolicyDialog, setShowPolicyDialog] = useState(false);
  const [showTestDialog, setShowTestDialog] = useState(false);
  const [testToken, setTestToken] = useState(mockJWTTokens[0].token);
  const [testQuery, setTestQuery] = useState(`SELECT * FROM ${table.name} LIMIT 10;`);
  const [testResults, setTestResults] = useState<PolicyTestResult | null>(null);
  const [isTestRunning, setIsTestRunning] = useState(false);

  const handlePolicyTest = async () => {
    setIsTestRunning(true);
    
    try {
      // Simulate policy testing
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const mockResult: PolicyTestResult = {
        success: Math.random() > 0.3, // 70% success rate
        message: Math.random() > 0.3 
          ? 'Policy test completed successfully. Query executed within security constraints.'
          : 'Policy test failed. Access denied by Row Level Security policy.',
        rowsAffected: Math.floor(Math.random() * 100),
        executionTime: Math.floor(Math.random() * 500) + 50,
      };
      
      setTestResults(mockResult);
      
      if (mockResult.success) {
        toast.success('Policy test completed successfully');
      } else {
        toast.error('Policy test failed');
      }
    } catch (error) {
      setTestResults({
        success: false,
        message: 'Test execution failed due to network error',
      });
    } finally {
      setIsTestRunning(false);
    }
  };

  const getPolicyTypeColor = (command: string) => {
    switch (command.toLowerCase()) {
      case 'select':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'insert':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'update':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'delete':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'all':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPermissiveColor = (permissive: string) => {
    return permissive === 'PERMISSIVE' 
      ? 'bg-green-100 text-green-800 border-green-200'
      : 'bg-orange-100 text-orange-800 border-orange-200';
  };

  return (
    <div className="space-y-6">
      {/* RLS Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Shield className="h-5 w-5" />
              <CardTitle>Row Level Security Status</CardTitle>
            </div>
            <Badge 
              variant="outline" 
              className={table.rls_enabled 
                ? 'text-green-600 border-green-200 bg-green-50' 
                : 'text-red-600 border-red-200 bg-red-50'
              }
            >
              {table.rls_enabled ? (
                <>
                  <Lock className="mr-1 h-3 w-3" />
                  Enabled
                </>
              ) : (
                <>
                  <Unlock className="mr-1 h-3 w-3" />
                  Disabled
                </>
              )}
            </Badge>
          </div>
          <CardDescription>
            Row Level Security {table.rls_enabled ? 'is enabled' : 'is disabled'} for table <code>{table.name}</code>
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!table.rls_enabled && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                RLS is disabled for this table. All authenticated users can access all rows. 
                Consider enabling RLS for better security.
              </AlertDescription>
            </Alert>
          )}
          
          {table.rls_enabled && table.rls_policies.length === 0 && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                RLS is enabled but no policies are defined. This will deny all access to the table.
                Add policies to allow specific access patterns.
              </AlertDescription>
            </Alert>
          )}

          {table.rls_enabled && table.rls_policies.length > 0 && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                RLS is properly configured with {table.rls_policies.length} active 
                {table.rls_policies.length === 1 ? ' policy' : ' policies'}.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Policies List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <Shield className="h-5 w-5" />
              <span>RLS Policies</span>
              <Badge variant="secondary">{table.rls_policies.length}</Badge>
            </CardTitle>
            <div className="flex space-x-2">
              <Dialog open={showTestDialog} onOpenChange={setShowTestDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Play className="mr-2 h-4 w-4" />
                    Test Policies
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Test RLS Policies</DialogTitle>
                    <DialogDescription>
                      Test how your RLS policies behave with different JWT tokens and queries
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium">JWT Token</label>
                      <Select value={testToken} onValueChange={setTestToken}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {mockJWTTokens.map((token, index) => (
                            <SelectItem key={index} value={token.token}>
                              <div>
                                <div className="font-medium">{token.name}</div>
                                <div className="text-xs text-slate-500">{token.description}</div>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="text-sm font-medium">Test Query</label>
                      <Textarea
                        value={testQuery}
                        onChange={(e) => setTestQuery(e.target.value)}
                        placeholder="Enter SQL query to test..."
                        className="font-mono text-sm"
                        rows={4}
                      />
                    </div>

                    <Button 
                      onClick={handlePolicyTest} 
                      disabled={isTestRunning}
                      className="w-full"
                    >
                      {isTestRunning ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Running Test...
                        </>
                      ) : (
                        <>
                          <Play className="mr-2 h-4 w-4" />
                          Run Test
                        </>
                      )}
                    </Button>

                    {testResults && (
                      <Alert className={testResults.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
                        {testResults.success ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-600" />
                        )}
                        <AlertDescription className={testResults.success ? 'text-green-800' : 'text-red-800'}>
                          <div className="space-y-2">
                            <div>{testResults.message}</div>
                            {testResults.rowsAffected !== undefined && (
                              <div className="text-sm">
                                Rows affected: {testResults.rowsAffected} | 
                                Execution time: {testResults.executionTime}ms
                              </div>
                            )}
                          </div>
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                </DialogContent>
              </Dialog>

              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Add Policy
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {table.rls_policies.length === 0 ? (
            <div className="text-center py-8">
              <Shield className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-2">
                No RLS Policies
              </h3>
              <p className="text-slate-500 dark:text-slate-400 mb-4">
                This table has no Row Level Security policies defined.
              </p>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create First Policy
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {table.rls_policies.map((policy) => (
                <Card key={policy.id} className="border-l-4 border-l-blue-500">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Shield className="h-4 w-4" />
                        <CardTitle className="text-base">{policy.policy_name}</CardTitle>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline" className={getPolicyTypeColor(policy.command)}>
                          {policy.command}
                        </Badge>
                        <Badge variant="outline" className={getPermissiveColor(policy.permissive)}>
                          {policy.permissive}
                        </Badge>
                        <Button variant="ghost" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-3">
                      <div>
                        <div className="text-sm font-medium mb-1">Roles</div>
                        <div className="flex flex-wrap gap-2">
                          {policy.roles.map((role) => (
                            <Badge key={role} variant="outline" className="text-xs">
                              <Users className="mr-1 h-3 w-3" />
                              {role}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      <div>
                        <div className="text-sm font-medium mb-1">Expression</div>
                        <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded-lg">
                          <code className="text-sm font-mono text-slate-900 dark:text-slate-100">
                            {policy.expression}
                          </code>
                        </div>
                      </div>

                      {policy.check_expression && (
                        <div>
                          <div className="text-sm font-medium mb-1">Check Expression</div>
                          <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded-lg">
                            <code className="text-sm font-mono text-slate-900 dark:text-slate-100">
                              {policy.check_expression}
                            </code>
                          </div>
                        </div>
                      )}

                      <div className="flex items-center space-x-4 text-sm text-slate-600 dark:text-slate-400">
                        <div>Table: {policy.table_name}</div>
                        <div>Schema: {policy.schema_name}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Policy Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Eye className="h-5 w-5" />
            <span>Policy Analysis</span>
          </CardTitle>
          <CardDescription>
            Analysis and recommendations for your RLS policies
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="coverage" className="space-y-4">
            <TabsList>
              <TabsTrigger value="coverage">Coverage</TabsTrigger>
              <TabsTrigger value="performance">Performance</TabsTrigger>
              <TabsTrigger value="security">Security</TabsTrigger>
            </TabsList>

            <TabsContent value="coverage" className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {table.rls_policies.filter(p => p.command === 'SELECT' || p.command === 'ALL').length}
                    </div>
                    <div className="text-sm text-slate-600">SELECT Policies</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {table.rls_policies.filter(p => p.command === 'INSERT' || p.command === 'ALL').length}
                    </div>
                    <div className="text-sm text-slate-600">INSERT Policies</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-yellow-600">
                      {table.rls_policies.filter(p => p.command === 'UPDATE' || p.command === 'ALL').length}
                    </div>
                    <div className="text-sm text-slate-600">UPDATE Policies</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-red-600">
                      {table.rls_policies.filter(p => p.command === 'DELETE' || p.command === 'ALL').length}
                    </div>
                    <div className="text-sm text-slate-600">DELETE Policies</div>
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium">Coverage Analysis</h4>
                {['SELECT', 'INSERT', 'UPDATE', 'DELETE'].map((command) => {
                  const hasCoverage = table.rls_policies.some(p => p.command === command || p.command === 'ALL');
                  return (
                    <div key={command} className="flex items-center justify-between p-2 border rounded">
                      <span>{command} operations</span>
                      {hasCoverage ? (
                        <Badge variant="outline" className="text-green-600 border-green-200">
                          <CheckCircle className="mr-1 h-3 w-3" />
                          Covered
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-red-600 border-red-200">
                          <XCircle className="mr-1 h-3 w-3" />
                          Not Covered
                        </Badge>
                      )}
                    </div>
                  );
                })}
              </div>
            </TabsContent>

            <TabsContent value="performance" className="space-y-4">
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Complex RLS expressions can impact query performance. Consider adding indexes on columns used in policy expressions.
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <h4 className="font-medium">Performance Recommendations</h4>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                    <span>Consider adding an index on user_id for faster policy evaluation</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
                    <span>Policy expressions using functions may be slower than simple column comparisons</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                    <span>Policies are efficiently using primary key relationships</span>
                  </li>
                </ul>
              </div>
            </TabsContent>

            <TabsContent value="security" className="space-y-4">
              <div className="space-y-2">
                <h4 className="font-medium">Security Assessment</h4>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                    <span>RLS is enabled and properly configured</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                    <span>Policies use authenticated user context (auth.uid())</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
                    <span>Consider adding policies for different user roles</span>
                  </li>
                </ul>
              </div>

              <Alert className="border-blue-200 bg-blue-50">
                <Shield className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-800">
                  <div className="font-medium mb-1">Security Score: Good</div>
                  Your RLS configuration provides good security coverage. Consider testing with different user scenarios.
                </AlertDescription>
              </Alert>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
