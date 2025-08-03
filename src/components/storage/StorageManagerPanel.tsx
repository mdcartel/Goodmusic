'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Alert, AlertDescription } from '../ui/alert';
import { 
  HardDrive, 
  FolderOpen, 
  Trash2, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  Settings,
  BarChart3,
  FileText,
  Zap
} from 'lucide-react';

interface StorageUsage {
  used: number;
  available: number;
  total: number;
  percentage: number;
  warningLevel: 'low' | 'medium' | 'high' | 'critical';
}

interface StorageStats {
  totalFiles: number;
  totalSize: number;
  duplicateFiles: number;
  duplicateSize: number;
  corruptFiles: number;
  organizationScore: number;
}

interface StorageHealth {
  overall: 'excellent' | 'good' | 'fair' | 'poor';
  issues: Array<{
    type: 'duplicates' | 'corruption' | 'organization' | 'space';
    severity: 'low' | 'medium' | 'high';
    description: string;
    recommendation: string;
  }>;
  stats: StorageStats;
  usage: StorageUsage;
}

interface FileIntegrityReport {
  totalFiles: number;
  validFiles: number;
  corruptFiles: number;
  missingFiles: number;
  orphanedFiles: number;
  fixedFiles: number;
  errors: string[];
}

interface Recommendation {
  type: 'cleanup' | 'organization' | 'optimization';
  priority: 'low' | 'medium' | 'high';
  description: string;
  action: string;
  estimatedBenefit?: string;
}

export const StorageManagerPanel: React.FC = () => {
  const [storageHealth, setStorageHealth] = useState<StorageHealth | null>(null);
  const [integrityReport, setIntegrityReport] = useState<FileIntegrityReport | null>(null);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPerformingAction, setIsPerformingAction] = useState(false);
  const [actionStatus, setActionStatus] = useState<string>('');

  useEffect(() => {
    loadStorageData();
  }, []);

  const loadStorageData = async () => {
    setIsLoading(true);
    try {
      // In a real implementation, these would be API calls
      // For now, we'll use mock data
      const mockStorageHealth: StorageHealth = {
        overall: 'good',
        issues: [
          {
            type: 'duplicates',
            severity: 'medium',
            description: 'Found 15 duplicate files wasting 245 MB',
            recommendation: 'Run duplicate cleanup to free up space'
          },
          {
            type: 'organization',
            severity: 'low',
            description: 'File organization score is 78%',
            recommendation: 'Run file organization to improve structure'
          }
        ],
        stats: {
          totalFiles: 1250,
          totalSize: 8500000000, // 8.5 GB
          duplicateFiles: 15,
          duplicateSize: 245000000, // 245 MB
          corruptFiles: 2,
          organizationScore: 78
        },
        usage: {
          used: 8500000000,
          available: 1500000000,
          total: 10000000000,
          percentage: 85,
          warningLevel: 'high'
        }
      };

      const mockIntegrityReport: FileIntegrityReport = {
        totalFiles: 1250,
        validFiles: 1245,
        corruptFiles: 2,
        missingFiles: 3,
        orphanedFiles: 8,
        fixedFiles: 0,
        errors: []
      };

      const mockRecommendations: Recommendation[] = [
        {
          type: 'cleanup',
          priority: 'high',
          description: 'Remove duplicate files to free up space',
          action: 'Run duplicate cleanup',
          estimatedBenefit: 'Save 245 MB'
        },
        {
          type: 'organization',
          priority: 'medium',
          description: 'Improve file organization structure',
          action: 'Organize files by artist/album',
          estimatedBenefit: 'Better file management'
        },
        {
          type: 'optimization',
          priority: 'low',
          description: 'Clean up empty directories',
          action: 'Remove empty folders',
          estimatedBenefit: 'Cleaner directory structure'
        }
      ];

      setStorageHealth(mockStorageHealth);
      setIntegrityReport(mockIntegrityReport);
      setRecommendations(mockRecommendations);
    } catch (error) {
      console.error('Failed to load storage data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getHealthColor = (health: string) => {
    switch (health) {
      case 'excellent': return 'text-green-600';
      case 'good': return 'text-blue-600';
      case 'fair': return 'text-yellow-600';
      case 'poor': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getWarningColor = (level: string) => {
    switch (level) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getSeverityBadge = (severity: string) => {
    const colors = {
      high: 'bg-red-100 text-red-800',
      medium: 'bg-yellow-100 text-yellow-800',
      low: 'bg-blue-100 text-blue-800'
    };
    return colors[severity as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const handleCleanupDuplicates = async () => {
    setIsPerformingAction(true);
    setActionStatus('Removing duplicate files...');
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 3000));
      setActionStatus('Successfully removed 15 duplicate files, saved 245 MB');
      await loadStorageData();
    } catch (error) {
      setActionStatus('Failed to remove duplicates');
    } finally {
      setIsPerformingAction(false);
    }
  };

  const handleOrganizeFiles = async () => {
    setIsPerformingAction(true);
    setActionStatus('Organizing files...');
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 4000));
      setActionStatus('Successfully organized 156 files');
      await loadStorageData();
    } catch (error) {
      setActionStatus('Failed to organize files');
    } finally {
      setIsPerformingAction(false);
    }
  };

  const handleCheckIntegrity = async () => {
    setIsPerformingAction(true);
    setActionStatus('Checking file integrity...');
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      setActionStatus('Integrity check completed');
      await loadStorageData();
    } catch (error) {
      setActionStatus('Failed to check integrity');
    } finally {
      setIsPerformingAction(false);
    }
  };

  const handlePerformMaintenance = async () => {
    setIsPerformingAction(true);
    setActionStatus('Performing maintenance...');
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 5000));
      setActionStatus('Maintenance completed successfully');
      await loadStorageData();
    } catch (error) {
      setActionStatus('Maintenance failed');
    } finally {
      setIsPerformingAction(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading storage information...</span>
      </div>
    );
  }

  if (!storageHealth || !integrityReport) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Failed to load storage information. Please try again.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Storage Management</h2>
          <p className="text-muted-foreground">
            Monitor and optimize your music library storage
          </p>
        </div>
        <Button 
          onClick={loadStorageData} 
          variant="outline" 
          size="sm"
          disabled={isPerformingAction}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Action Status */}
      {actionStatus && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>{actionStatus}</AlertDescription>
        </Alert>
      )}

      {/* Storage Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Storage Usage</CardTitle>
            <HardDrive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatBytes(storageHealth.usage.used)}
            </div>
            <p className="text-xs text-muted-foreground">
              of {formatBytes(storageHealth.usage.total)} used
            </p>
            <Progress 
              value={storageHealth.usage.percentage} 
              className="mt-2"
              indicatorClassName={getWarningColor(storageHealth.usage.warningLevel)}
            />
            <p className="text-xs mt-1">
              {storageHealth.usage.percentage.toFixed(1)}% full
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overall Health</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold capitalize ${getHealthColor(storageHealth.overall)}`}>
              {storageHealth.overall}
            </div>
            <p className="text-xs text-muted-foreground">
              {storageHealth.issues.length} issues found
            </p>
            <div className="mt-2">
              <Badge variant="outline" className="text-xs">
                {storageHealth.stats.totalFiles} files
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Organization</CardTitle>
            <FolderOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {storageHealth.stats.organizationScore}%
            </div>
            <p className="text-xs text-muted-foreground">
              Organization score
            </p>
            <Progress 
              value={storageHealth.stats.organizationScore} 
              className="mt-2"
            />
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="integrity">File Integrity</TabsTrigger>
          <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
          <TabsTrigger value="actions">Actions</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Issues */}
          {storageHealth.issues.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <AlertTriangle className="h-5 w-5 mr-2" />
                  Storage Issues
                </CardTitle>
                <CardDescription>
                  Issues that need attention
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {storageHealth.issues.map((issue, index) => (
                  <div key={index} className="flex items-start space-x-3 p-3 border rounded-lg">
                    <Badge className={getSeverityBadge(issue.severity)}>
                      {issue.severity}
                    </Badge>
                    <div className="flex-1">
                      <p className="font-medium">{issue.description}</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {issue.recommendation}
                      </p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Statistics */}
          <Card>
            <CardHeader>
              <CardTitle>Storage Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {storageHealth.stats.totalFiles}
                  </div>
                  <p className="text-sm text-muted-foreground">Total Files</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">
                    {storageHealth.stats.duplicateFiles}
                  </div>
                  <p className="text-sm text-muted-foreground">Duplicates</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {storageHealth.stats.corruptFiles}
                  </div>
                  <p className="text-sm text-muted-foreground">Corrupt Files</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {formatBytes(storageHealth.stats.duplicateSize)}
                  </div>
                  <p className="text-sm text-muted-foreground">Wasted Space</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="integrity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="h-5 w-5 mr-2" />
                File Integrity Report
              </CardTitle>
              <CardDescription>
                Status of all files in your music library
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                <div className="text-center p-4 border rounded-lg">
                  <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-green-600">
                    {integrityReport.validFiles}
                  </div>
                  <p className="text-sm text-muted-foreground">Valid Files</p>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <XCircle className="h-8 w-8 text-red-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-red-600">
                    {integrityReport.corruptFiles}
                  </div>
                  <p className="text-sm text-muted-foreground">Corrupt Files</p>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <AlertTriangle className="h-8 w-8 text-yellow-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-yellow-600">
                    {integrityReport.missingFiles}
                  </div>
                  <p className="text-sm text-muted-foreground">Missing Files</p>
                </div>
              </div>
              
              <div className="flex justify-center">
                <Button 
                  onClick={handleCheckIntegrity}
                  disabled={isPerformingAction}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${isPerformingAction ? 'animate-spin' : ''}`} />
                  Check Integrity
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recommendations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recommendations</CardTitle>
              <CardDescription>
                Suggested actions to improve your storage
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {recommendations.map((rec, index) => (
                <div key={index} className="flex items-start space-x-3 p-4 border rounded-lg">
                  <Badge className={getSeverityBadge(rec.priority)}>
                    {rec.priority}
                  </Badge>
                  <div className="flex-1">
                    <h4 className="font-medium">{rec.description}</h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      {rec.action}
                    </p>
                    {rec.estimatedBenefit && (
                      <p className="text-sm text-green-600 mt-1">
                        Benefit: {rec.estimatedBenefit}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="actions" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Trash2 className="h-5 w-5 mr-2" />
                  Cleanup Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  onClick={handleCleanupDuplicates}
                  disabled={isPerformingAction}
                  className="w-full"
                >
                  Remove Duplicates
                </Button>
                <Button 
                  onClick={handleOrganizeFiles}
                  disabled={isPerformingAction}
                  variant="outline"
                  className="w-full"
                >
                  <FolderOpen className="h-4 w-4 mr-2" />
                  Organize Files
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Zap className="h-5 w-5 mr-2" />
                  Maintenance
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  onClick={handlePerformMaintenance}
                  disabled={isPerformingAction}
                  className="w-full"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Full Maintenance
                </Button>
                <p className="text-sm text-muted-foreground">
                  Performs comprehensive cleanup and optimization
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};