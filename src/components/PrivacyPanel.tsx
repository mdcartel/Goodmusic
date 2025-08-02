'use client';

import { useState, useEffect } from 'react';
import { privacyManager, PrivacySettings, DataAuditReport } from '@/lib/privacyManager';
import { cn } from '@/lib/utils';
import { 
  Shield, 
  Trash2, 
  Download, 
  Eye, 
  EyeOff, 
  AlertTriangle,
  CheckCircle,
  X,
  RefreshCw
} from 'lucide-react';
import { Button } from '@/components';
import { useToast } from '@/contexts/ToastContext';

interface PrivacyPanelProps {
  isOpen: boolean;
  onClose: () => void;
  className?: string;
}

export default function PrivacyPanel({ isOpen, onClose, className }: PrivacyPanelProps) {
  const [privacySettings, setPrivacySettings] = useState<PrivacySettings | null>(null);
  const [auditReport, setAuditReport] = useState<DataAuditReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'settings' | 'data' | 'audit'>('settings');
  
  const toast = useToast();

  useEffect(() => {
    if (isOpen) {
      loadPrivacySettings();
      runDataAudit();
    }
  }, [isOpen]);

  const loadPrivacySettings = () => {
    try {
      const settings = privacyManager.getPrivacySettings();
      setPrivacySettings(settings);
    } catch (error) {
      console.error('Failed to load privacy settings:', error);
      toast.error('Failed to load privacy settings');
    }
  };

  const runDataAudit = () => {
    try {
      const report = privacyManager.auditStoredData();
      setAuditReport(report);
    } catch (error) {
      console.error('Failed to run data audit:', error);
      toast.error('Failed to audit data');
    }
  };

  const updatePrivacySettings = (updates: Partial<PrivacySettings>) => {
    if (!privacySettings) return;

    try {
      const success = privacyManager.updatePrivacySettings(updates);
      if (success) {
        setPrivacySettings({ ...privacySettings, ...updates });
        toast.success('Privacy settings updated');
      } else {
        toast.error('Failed to update privacy settings');
      }
    } catch (error) {
      console.error('Failed to update privacy settings:', error);
      toast.error('Failed to update privacy settings');
    }
  };

  const clearDataCategory = async (category: 'favorites' | 'history' | 'downloads' | 'chat' | 'preferences') => {
    if (!confirm(`Are you sure you want to clear all ${category}? This action cannot be undone.`)) {
      return;
    }

    setIsLoading(true);
    try {
      const success = privacyManager.clearDataCategory(category);
      if (success) {
        toast.success(`${category} cleared successfully`);
        runDataAudit(); // Refresh audit report
      } else {
        toast.error(`Failed to clear ${category}`);
      }
    } catch (error) {
      console.error(`Failed to clear ${category}:`, error);
      toast.error(`Failed to clear ${category}`);
    } finally {
      setIsLoading(false);
    }
  };

  const clearAllData = async () => {
    if (!confirm('Are you sure you want to clear ALL data? This will reset the app to its initial state and cannot be undone.')) {
      return;
    }

    setIsLoading(true);
    try {
      const success = privacyManager.clearAllUserData();
      if (success) {
        toast.success('All data cleared successfully');
        onClose(); // Close panel after clearing all data
      } else {
        toast.error('Failed to clear all data');
      }
    } catch (error) {
      console.error('Failed to clear all data:', error);
      toast.error('Failed to clear all data');
    } finally {
      setIsLoading(false);
    }
  };

  const exportData = () => {
    try {
      const exportedData = privacyManager.exportUserData();
      const blob = new Blob([exportedData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `vibepipe-data-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Data exported successfully');
    } catch (error) {
      console.error('Failed to export data:', error);
      toast.error('Failed to export data');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className={cn(
        "bg-gray-800 rounded-lg border border-gray-700 w-full max-w-4xl max-h-[90vh] overflow-hidden",
        className
      )}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <div className="flex items-center space-x-3">
            <Shield className="w-6 h-6 text-purple-400" />
            <h2 className="text-xl font-semibold text-white">Privacy & Data Management</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-gray-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-700">
          {[
            { id: 'settings', label: 'Privacy Settings', icon: Shield },
            { id: 'data', label: 'Data Management', icon: Trash2 },
            { id: 'audit', label: 'Privacy Audit', icon: Eye }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "flex items-center space-x-2 px-4 py-3 text-sm font-medium transition-colors",
                activeTab === tab.id
                  ? "text-purple-400 border-b-2 border-purple-400 bg-gray-700/50"
                  : "text-gray-400 hover:text-white hover:bg-gray-700/30"
              )}
            >
              <tab.icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[calc(90vh-120px)]">
          {activeTab === 'settings' && privacySettings && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">Data Collection Preferences</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                    <div>
                      <h4 className="text-white font-medium">Usage Analytics</h4>
                      <p className="text-gray-400 text-sm">Help improve the app by sharing anonymous usage data</p>
                    </div>
                    <button
                      onClick={() => updatePrivacySettings({
                        dataCollection: {
                          ...privacySettings.dataCollection,
                          allowUsageAnalytics: !privacySettings.dataCollection.allowUsageAnalytics
                        }
                      })}
                      className={cn(
                        "w-12 h-6 rounded-full transition-colors relative",
                        privacySettings.dataCollection.allowUsageAnalytics ? "bg-purple-600" : "bg-gray-600"
                      )}
                    >
                      <div className={cn(
                        "w-5 h-5 bg-white rounded-full transition-transform absolute top-0.5",
                        privacySettings.dataCollection.allowUsageAnalytics ? "translate-x-6" : "translate-x-0.5"
                      )} />
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                    <div>
                      <h4 className="text-white font-medium">Error Reporting</h4>
                      <p className="text-gray-400 text-sm">Automatically report crashes and errors (recommended)</p>
                    </div>
                    <button
                      onClick={() => updatePrivacySettings({
                        dataCollection: {
                          ...privacySettings.dataCollection,
                          allowErrorReporting: !privacySettings.dataCollection.allowErrorReporting
                        }
                      })}
                      className={cn(
                        "w-12 h-6 rounded-full transition-colors relative",
                        privacySettings.dataCollection.allowErrorReporting ? "bg-purple-600" : "bg-gray-600"
                      )}
                    >
                      <div className={cn(
                        "w-5 h-5 bg-white rounded-full transition-transform absolute top-0.5",
                        privacySettings.dataCollection.allowErrorReporting ? "translate-x-6" : "translate-x-0.5"
                      )} />
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-white mb-4">Data Retention</h3>
                <div className="space-y-4">
                  <div className="p-3 bg-gray-700 rounded-lg">
                    <h4 className="text-white font-medium mb-2">Automatic Cleanup</h4>
                    <p className="text-gray-400 text-sm mb-3">Automatically remove old data to save storage space</p>
                    <div className="flex items-center space-x-4">
                      <label className="text-sm text-gray-300">Keep history for:</label>
                      <select 
                        value={privacySettings.dataRetention.maxHistoryDays}
                        onChange={(e) => updatePrivacySettings({
                          dataRetention: {
                            ...privacySettings.dataRetention,
                            maxHistoryDays: parseInt(e.target.value)
                          }
                        })}
                        className="bg-gray-600 text-white px-3 py-1 rounded border border-gray-500"
                      >
                        <option value={30}>30 days</option>
                        <option value={60}>60 days</option>
                        <option value={90}>90 days</option>
                        <option value={180}>6 months</option>
                        <option value={365}>1 year</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'data' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">Data Management</h3>
                <p className="text-gray-400 mb-6">
                  Manage your stored data. All data is stored locally on your device and never sent to external servers.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { id: 'favorites', label: 'Favorites', description: 'Clear all favorite songs' },
                  { id: 'history', label: 'Play History', description: 'Clear recently played songs' },
                  { id: 'downloads', label: 'Download History', description: 'Clear download records' },
                  { id: 'chat', label: 'Chat History', description: 'Clear chatbot conversations' },
                  { id: 'preferences', label: 'Preferences', description: 'Reset all settings to defaults' }
                ].map(item => (
                  <div key={item.id} className="p-4 bg-gray-700 rounded-lg">
                    <h4 className="text-white font-medium mb-2">{item.label}</h4>
                    <p className="text-gray-400 text-sm mb-3">{item.description}</p>
                    <Button
                      onClick={() => clearDataCategory(item.id as any)}
                      disabled={isLoading}
                      variant="outline"
                      size="sm"
                      className="text-red-400 border-red-400 hover:bg-red-400 hover:text-white"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Clear {item.label}
                    </Button>
                  </div>
                ))}
              </div>

              <div className="border-t border-gray-600 pt-6">
                <div className="flex flex-col sm:flex-row gap-4">
                  <Button
                    onClick={exportData}
                    variant="outline"
                    className="flex-1"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export All Data
                  </Button>
                  
                  <Button
                    onClick={clearAllData}
                    disabled={isLoading}
                    variant="outline"
                    className="flex-1 text-red-400 border-red-400 hover:bg-red-400 hover:text-white"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Clear All Data
                  </Button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'audit' && auditReport && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">Privacy Audit Report</h3>
                <Button
                  onClick={runDataAudit}
                  variant="outline"
                  size="sm"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh Audit
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-gray-700 rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    {auditReport.personalDataFound ? (
                      <AlertTriangle className="w-5 h-5 text-yellow-400" />
                    ) : (
                      <CheckCircle className="w-5 h-5 text-green-400" />
                    )}
                    <h4 className="text-white font-medium">Personal Data Check</h4>
                  </div>
                  <p className={cn(
                    "text-sm",
                    auditReport.personalDataFound ? "text-yellow-400" : "text-green-400"
                  )}>
                    {auditReport.personalDataFound 
                      ? "Potential personal data detected" 
                      : "No personal data found"
                    }
                  </p>
                </div>

                <div className="p-4 bg-gray-700 rounded-lg">
                  <h4 className="text-white font-medium mb-2">Storage Usage</h4>
                  <p className="text-gray-300 text-sm">
                    {(auditReport.storageUsage.total / 1024).toFixed(1)} KB used
                  </p>
                  <p className="text-gray-400 text-xs">
                    {auditReport.dataTypes.length} data categories
                  </p>
                </div>
              </div>

              <div>
                <h4 className="text-white font-medium mb-3">Data Categories</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {auditReport.dataTypes.map(type => (
                    <div key={type} className="px-3 py-2 bg-gray-700 rounded text-sm text-gray-300">
                      {type.replace(/_/g, ' ')}
                    </div>
                  ))}
                </div>
              </div>

              {auditReport.recommendations.length > 0 && (
                <div>
                  <h4 className="text-white font-medium mb-3">Recommendations</h4>
                  <div className="space-y-2">
                    {auditReport.recommendations.map((rec, index) => (
                      <div key={index} className="flex items-start space-x-2 p-3 bg-yellow-900/20 border border-yellow-700 rounded-lg">
                        <AlertTriangle className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
                        <p className="text-yellow-200 text-sm">{rec}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}