'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { 
  Settings, 
  User, 
  Volume2, 
  Palette, 
  Shield, 
  Download, 
  Heart,
  Clock,
  Database,
  FileText,
  Trash2,
  Upload,
  X,
  ChevronRight,
  ToggleLeft,
  ToggleRight,
  Slider
} from 'lucide-react';
import { Button } from '@/components';
import { useUserPreferences, usePlaybackSettings, useAppSettings, useFavorites, useRecentlyPlayed, useStorageQuota } from '@/hooks/useUserPreferences';
import { localStorageManager } from '@/lib/localStorageManager';
import { useToast } from '@/contexts/ToastContext';
import PrivacyPanel from './PrivacyPanel';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

type SettingsTab = 'general' | 'playback' | 'privacy' | 'storage' | 'data';

export default function SettingsPanel({ isOpen, onClose }: SettingsPanelProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [showPrivacyPanel, setShowPrivacyPanel] = useState(false);

  const { preferences, updatePreferences, updateDiscoveryPreferences } = useUserPreferences();
  const { settings: playbackSettings, updateSettings: updatePlaybackSettings, setVolume, toggleMute } = usePlaybackSettings();
  const { settings: appSettings, updateSettings: updateAppSettings, setTheme, updateNotifications, updatePrivacy, updateUI } = useAppSettings();
  const { favorites } = useFavorites();
  const { recentlyPlayed, clearRecentlyPlayed } = useRecentlyPlayed();
  const { quota, cleanupStorage } = useStorageQuota();
  const toast = useToast();

  const tabs = [
    { id: 'general' as const, label: 'General', icon: Settings },
    { id: 'playback' as const, label: 'Playback', icon: Volume2 },
    { id: 'privacy' as const, label: 'Privacy', icon: Shield },
    { id: 'storage' as const, label: 'Storage', icon: Database },
    { id: 'data' as const, label: 'Data', icon: FileText }
  ];

  const handleExportData = async () => {
    setIsExporting(true);
    try {
      const data = localStorageManager.exportAllData();
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `vibepipe-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success('Data Exported', 'Your VibePipe data has been exported successfully');
    } catch (error) {
      toast.error('Export Failed', 'Failed to export your data. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportData = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const text = await file.text();
      const success = localStorageManager.importAllData(text);
      
      if (success) {
        toast.success('Data Imported', 'Your VibePipe data has been imported successfully');
        // Refresh the page to load new data
        window.location.reload();
      } else {
        toast.error('Import Failed', 'The file format is invalid or corrupted');
      }
    } catch (error) {
      toast.error('Import Failed', 'Failed to import data. Please check the file format.');
    } finally {
      setIsImporting(false);
      // Reset file input
      event.target.value = '';
    }
  };

  const handleClearAllData = () => {
    if (window.confirm('Are you sure you want to clear all your VibePipe data? This action cannot be undone.')) {
      const success = localStorageManager.clearAllData();
      if (success) {
        toast.success('Data Cleared', 'All your VibePipe data has been cleared');
        window.location.reload();
      } else {
        toast.error('Clear Failed', 'Failed to clear data. Please try again.');
      }
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl max-h-[90vh] bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div className="flex items-center space-x-3">
            <Settings className="w-6 h-6 text-purple-400" />
            <h2 className="text-xl font-semibold text-white">Settings</h2>
          </div>
          <Button onClick={onClose} variant="ghost" size="sm" className="p-2">
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="flex h-[calc(90vh-120px)]">
          {/* Sidebar */}
          <div className="w-64 bg-gray-900 border-r border-gray-700 p-4">
            <nav className="space-y-2">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      "w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors text-left",
                      activeTab === tab.id
                        ? "bg-purple-600 text-white"
                        : "text-gray-300 hover:text-white hover:bg-gray-800"
                    )}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{tab.label}</span>
                    <ChevronRight className="w-4 h-4 ml-auto" />
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Content */}
          <div className="flex-1 p-6 overflow-y-auto">
            {activeTab === 'general' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">General Settings</h3>
                  
                  {/* Theme */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-sm font-medium text-white">Theme</label>
                        <p className="text-xs text-gray-400">Choose your preferred theme</p>
                      </div>
                      <select
                        value={appSettings.theme}
                        onChange={(e) => setTheme(e.target.value as any)}
                        className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm"
                      >
                        <option value="dark">Dark</option>
                        <option value="light">Light</option>
                        <option value="auto">Auto</option>
                      </select>
                    </div>

                    {/* Animations */}
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-sm font-medium text-white">Animations</label>
                        <p className="text-xs text-gray-400">Enable UI animations</p>
                      </div>
                      <button
                        onClick={() => updateUI({ animationsEnabled: !appSettings.ui.animationsEnabled })}
                        className="text-purple-400"
                      >
                        {appSettings.ui.animationsEnabled ? (
                          <ToggleRight className="w-8 h-8" />
                        ) : (
                          <ToggleLeft className="w-8 h-8" />
                        )}
                      </button>
                    </div>

                    {/* Compact Mode */}
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-sm font-medium text-white">Compact Mode</label>
                        <p className="text-xs text-gray-400">Use compact layout</p>
                      </div>
                      <button
                        onClick={() => updateUI({ compactMode: !appSettings.ui.compactMode })}
                        className="text-purple-400"
                      >
                        {appSettings.ui.compactMode ? (
                          <ToggleRight className="w-8 h-8" />
                        ) : (
                          <ToggleLeft className="w-8 h-8" />
                        )}
                      </button>
                    </div>

                    {/* Show Thumbnails */}
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-sm font-medium text-white">Show Thumbnails</label>
                        <p className="text-xs text-gray-400">Display song thumbnails</p>
                      </div>
                      <button
                        onClick={() => updateUI({ showThumbnails: !appSettings.ui.showThumbnails })}
                        className="text-purple-400"
                      >
                        {appSettings.ui.showThumbnails ? (
                          <ToggleRight className="w-8 h-8" />
                        ) : (
                          <ToggleLeft className="w-8 h-8" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Discovery Preferences */}
                <div>
                  <h4 className="text-md font-semibold text-white mb-3">Discovery</h4>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-sm font-medium text-white">Chat Suggestions</label>
                        <p className="text-xs text-gray-400">Enable chatbot music suggestions</p>
                      </div>
                      <button
                        onClick={() => updateDiscoveryPreferences({ 
                          enableChatSuggestions: !preferences.discoveryPreferences.enableChatSuggestions 
                        })}
                        className="text-purple-400"
                      >
                        {preferences.discoveryPreferences.enableChatSuggestions ? (
                          <ToggleRight className="w-8 h-8" />
                        ) : (
                          <ToggleLeft className="w-8 h-8" />
                        )}
                      </button>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-sm font-medium text-white">Mood Recommendations</label>
                        <p className="text-xs text-gray-400">Get personalized mood suggestions</p>
                      </div>
                      <button
                        onClick={() => updateDiscoveryPreferences({ 
                          enableMoodRecommendations: !preferences.discoveryPreferences.enableMoodRecommendations 
                        })}
                        className="text-purple-400"
                      >
                        {preferences.discoveryPreferences.enableMoodRecommendations ? (
                          <ToggleRight className="w-8 h-8" />
                        ) : (
                          <ToggleLeft className="w-8 h-8" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'playback' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">Playback Settings</h3>
                  
                  {/* Volume */}
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-sm font-medium text-white">Volume</label>
                        <span className="text-sm text-gray-400">{Math.round(playbackSettings.volume * 100)}%</span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <Volume2 className="w-4 h-4 text-gray-400" />
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.01"
                          value={playbackSettings.volume}
                          onChange={(e) => setVolume(parseFloat(e.target.value))}
                          className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                        />
                      </div>
                    </div>

                    {/* Quality */}
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-sm font-medium text-white">Audio Quality</label>
                        <p className="text-xs text-gray-400">Streaming quality preference</p>
                      </div>
                      <select
                        value={playbackSettings.quality}
                        onChange={(e) => updatePlaybackSettings({ quality: e.target.value as any })}
                        className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm"
                      >
                        <option value="low">Low (64kbps)</option>
                        <option value="medium">Medium (128kbps)</option>
                        <option value="high">High (320kbps)</option>
                        <option value="auto">Auto</option>
                      </select>
                    </div>

                    {/* Crossfade */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-sm font-medium text-white">Crossfade</label>
                        <span className="text-sm text-gray-400">{playbackSettings.crossfade}s</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="10"
                        step="1"
                        value={playbackSettings.crossfade}
                        onChange={(e) => updatePlaybackSettings({ crossfade: parseInt(e.target.value) })}
                        className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'privacy' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">Privacy Settings</h3>
                  
                  {/* Privacy Management Button */}
                  <div className="mb-6 p-4 bg-gray-700 rounded-lg border border-gray-600">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-white font-medium">Privacy & Data Management</h4>
                        <p className="text-gray-400 text-sm">Comprehensive privacy controls and data audit</p>
                      </div>
                      <Button
                        onClick={() => setShowPrivacyPanel(true)}
                        variant="outline"
                        className="text-purple-400 border-purple-400 hover:bg-purple-400 hover:text-white"
                      >
                        <Shield className="w-4 h-4 mr-2" />
                        Manage Privacy
                        <ChevronRight className="w-4 h-4 ml-2" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-sm font-medium text-white">Share Usage Data</label>
                        <p className="text-xs text-gray-400">Help improve VibePipe by sharing anonymous usage data</p>
                      </div>
                      <button
                        onClick={() => updatePrivacy({ shareUsageData: !appSettings.privacy.shareUsageData })}
                        className="text-purple-400"
                      >
                        {appSettings.privacy.shareUsageData ? (
                          <ToggleRight className="w-8 h-8" />
                        ) : (
                          <ToggleLeft className="w-8 h-8" />
                        )}
                      </button>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-sm font-medium text-white">Enable Analytics</label>
                        <p className="text-xs text-gray-400">Allow analytics for app improvement</p>
                      </div>
                      <button
                        onClick={() => updatePrivacy({ enableAnalytics: !appSettings.privacy.enableAnalytics })}
                        className="text-purple-400"
                      >
                        {appSettings.privacy.enableAnalytics ? (
                          <ToggleRight className="w-8 h-8" />
                        ) : (
                          <ToggleLeft className="w-8 h-8" />
                        )}
                      </button>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-sm font-medium text-white">Clear Data on Exit</label>
                        <p className="text-xs text-gray-400">Automatically clear data when closing the app</p>
                      </div>
                      <button
                        onClick={() => updatePrivacy({ clearDataOnExit: !appSettings.privacy.clearDataOnExit })}
                        className="text-purple-400"
                      >
                        {appSettings.privacy.clearDataOnExit ? (
                          <ToggleRight className="w-8 h-8" />
                        ) : (
                          <ToggleLeft className="w-8 h-8" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Notifications */}
                <div>
                  <h4 className="text-md font-semibold text-white mb-3">Notifications</h4>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-sm font-medium text-white">Download Complete</label>
                        <p className="text-xs text-gray-400">Notify when downloads finish</p>
                      </div>
                      <button
                        onClick={() => updateNotifications({ downloadComplete: !appSettings.notifications.downloadComplete })}
                        className="text-purple-400"
                      >
                        {appSettings.notifications.downloadComplete ? (
                          <ToggleRight className="w-8 h-8" />
                        ) : (
                          <ToggleLeft className="w-8 h-8" />
                        )}
                      </button>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-sm font-medium text-white">New Suggestions</label>
                        <p className="text-xs text-gray-400">Notify about new music suggestions</p>
                      </div>
                      <button
                        onClick={() => updateNotifications({ newSuggestions: !appSettings.notifications.newSuggestions })}
                        className="text-purple-400"
                      >
                        {appSettings.notifications.newSuggestions ? (
                          <ToggleRight className="w-8 h-8" />
                        ) : (
                          <ToggleLeft className="w-8 h-8" />
                        )}
                      </button>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-sm font-medium text-white">Error Notifications</label>
                        <p className="text-xs text-gray-400">Show error notifications</p>
                      </div>
                      <button
                        onClick={() => updateNotifications({ errors: !appSettings.notifications.errors })}
                        className="text-purple-400"
                      >
                        {appSettings.notifications.errors ? (
                          <ToggleRight className="w-8 h-8" />
                        ) : (
                          <ToggleLeft className="w-8 h-8" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'storage' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">Storage Management</h3>
                  
                  {/* Storage Usage */}
                  <div className="bg-gray-900 rounded-lg p-4 mb-6">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium text-white">Storage Usage</span>
                      <span className="text-sm text-gray-400">
                        {formatBytes(quota.used)} / {formatBytes(quota.total)}
                      </span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-purple-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(quota.percentage, 100)}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-400 mt-2">
                      {quota.percentage.toFixed(1)}% used
                    </p>
                  </div>

                  {/* Storage Breakdown */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Heart className="w-4 h-4 text-red-400" />
                        <span className="text-sm text-white">Favorites</span>
                      </div>
                      <span className="text-sm text-gray-400">{favorites.length} songs</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Clock className="w-4 h-4 text-blue-400" />
                        <span className="text-sm text-white">Recently Played</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-400">{recentlyPlayed.length} songs</span>
                        <Button
                          onClick={clearRecentlyPlayed}
                          variant="ghost"
                          size="sm"
                          className="text-xs px-2 py-1"
                        >
                          Clear
                        </Button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Download className="w-4 h-4 text-green-400" />
                        <span className="text-sm text-white">Download History</span>
                      </div>
                      <span className="text-sm text-gray-400">
                        {localStorageManager.getDownloadHistory().length} items
                      </span>
                    </div>
                  </div>

                  {/* Storage Actions */}
                  <div className="pt-4 border-t border-gray-700">
                    <Button
                      onClick={cleanupStorage}
                      variant="secondary"
                      className="w-full flex items-center justify-center space-x-2"
                    >
                      <Database className="w-4 h-4" />
                      <span>Cleanup Old Data</span>
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'data' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">Data Management</h3>
                  
                  {/* Export Data */}
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-md font-semibold text-white mb-2">Export Data</h4>
                      <p className="text-sm text-gray-400 mb-3">
                        Export all your VibePipe data including preferences, favorites, and history.
                      </p>
                      <Button
                        onClick={handleExportData}
                        disabled={isExporting}
                        variant="primary"
                        className="flex items-center space-x-2"
                      >
                        <Upload className="w-4 h-4" />
                        <span>{isExporting ? 'Exporting...' : 'Export Data'}</span>
                      </Button>
                    </div>

                    {/* Import Data */}
                    <div>
                      <h4 className="text-md font-semibold text-white mb-2">Import Data</h4>
                      <p className="text-sm text-gray-400 mb-3">
                        Import previously exported VibePipe data. This will overwrite your current data.
                      </p>
                      <div className="relative">
                        <input
                          type="file"
                          accept=".json"
                          onChange={handleImportData}
                          disabled={isImporting}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                        <Button
                          disabled={isImporting}
                          variant="secondary"
                          className="flex items-center space-x-2"
                        >
                          <FileText className="w-4 h-4" />
                          <span>{isImporting ? 'Importing...' : 'Import Data'}</span>
                        </Button>
                      </div>
                    </div>

                    {/* Clear All Data */}
                    <div className="pt-4 border-t border-gray-700">
                      <h4 className="text-md font-semibold text-white mb-2">Clear All Data</h4>
                      <p className="text-sm text-gray-400 mb-3">
                        Permanently delete all your VibePipe data. This action cannot be undone.
                      </p>
                      <Button
                        onClick={handleClearAllData}
                        variant="ghost"
                        className="flex items-center space-x-2 text-red-400 hover:text-red-300 hover:bg-red-900/20"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>Clear All Data</span>
                      </Button>
                    </div>
                  </div>
                </div>

                {/* User Stats */}
                <div className="bg-gray-900 rounded-lg p-4">
                  <h4 className="text-md font-semibold text-white mb-3">Your Stats</h4>
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold text-purple-400">{preferences.totalSongsPlayed}</div>
                      <div className="text-xs text-gray-400">Songs Played</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-green-400">{preferences.totalDownloads}</div>
                      <div className="text-xs text-gray-400">Downloads</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-red-400">{favorites.length}</div>
                      <div className="text-xs text-gray-400">Favorites</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-blue-400">{preferences.preferredMoods.length}</div>
                      <div className="text-xs text-gray-400">Preferred Moods</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Privacy Panel */}
      <PrivacyPanel
        isOpen={showPrivacyPanel}
        onClose={() => setShowPrivacyPanel(false)}
      />
    </div>
  );
}