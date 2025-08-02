'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { 
  Menu, 
  X, 
  Music, 
  MessageCircle, 
  Download, 
  Home,
  Search,
  Heart,
  Settings
} from 'lucide-react';
import { Button } from '@/components';

interface NavigationProps {
  onChatOpen?: () => void;
  onDownloadsOpen?: () => void;
  onSettingsOpen?: () => void;
  className?: string;
}

export default function Navigation({
  onChatOpen,
  onDownloadsOpen,
  onSettingsOpen,
  className
}: NavigationProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navigationItems = [
    { id: 'discover', label: 'Discover', icon: Home, href: '#', active: true },
    { id: 'search', label: 'Search', icon: Search, href: '#' },
    { id: 'favorites', label: 'Favorites', icon: Heart, href: '#' },
    { id: 'chat', label: 'Chat', icon: MessageCircle, action: onChatOpen },
    { id: 'downloads', label: 'Downloads', icon: Download, action: onDownloadsOpen },
    { id: 'settings', label: 'Settings', icon: Settings, action: onSettingsOpen }
  ];

  const handleItemClick = (item: typeof navigationItems[0]) => {
    if (item.action) {
      item.action();
    }
    setIsMobileMenuOpen(false);
  };

  return (
    <>
      {/* Desktop Navigation */}
      <nav className={cn("hidden md:flex items-center space-x-6", className)}>
        {navigationItems.slice(0, 4).map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => handleItemClick(item)}
              className={cn(
                "flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors",
                item.active 
                  ? "text-white bg-purple-600/20 border border-purple-500/30" 
                  : "text-gray-300 hover:text-white hover:bg-gray-800"
              )}
            >
              <Icon className="w-4 h-4" />
              <span className="text-sm font-medium">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Mobile Navigation */}
      <div className="md:hidden">
        {/* Mobile Menu Button */}
        <Button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          variant="ghost"
          size="sm"
          className="p-2"
        >
          {isMobileMenuOpen ? (
            <X className="w-6 h-6" />
          ) : (
            <Menu className="w-6 h-6" />
          )}
        </Button>

        {/* Mobile Menu Overlay */}
        {isMobileMenuOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 md:hidden">
            <div className="fixed top-0 right-0 h-full w-64 bg-gray-900 border-l border-gray-800 shadow-xl">
              {/* Menu Header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-800">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                    <Music className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-lg font-semibold text-white">VibePipe</span>
                </div>
                <Button
                  onClick={() => setIsMobileMenuOpen(false)}
                  variant="ghost"
                  size="sm"
                  className="p-2"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>

              {/* Menu Items */}
              <div className="p-4 space-y-2">
                {navigationItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleItemClick(item)}
                      className={cn(
                        "w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors text-left",
                        item.active 
                          ? "text-white bg-purple-600/20 border border-purple-500/30" 
                          : "text-gray-300 hover:text-white hover:bg-gray-800"
                      )}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="font-medium">{item.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Menu Footer */}
              <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-800">
                <div className="text-center text-xs text-gray-500">
                  VibePipe MVP v1.0
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Navigation for Mobile */}
      <div className="fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-800 z-40 md:hidden">
        <div className="flex items-center justify-around py-2">
          {navigationItems.slice(0, 5).map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => handleItemClick(item)}
                className={cn(
                  "flex flex-col items-center space-y-1 px-3 py-2 rounded-lg transition-colors",
                  item.active 
                    ? "text-purple-400" 
                    : "text-gray-400 hover:text-white"
                )}
              >
                <Icon className="w-5 h-5" />
                <span className="text-xs font-medium">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}