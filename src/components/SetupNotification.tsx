'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { AlertTriangle, X, ExternalLink, CheckCircle } from 'lucide-react';
import { Button } from '@/components';

interface SetupNotificationProps {
  className?: string;
}

export default function SetupNotification({ className }: SetupNotificationProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [ytDlpStatus, setYtDlpStatus] = useState<'checking' | 'available' | 'missing'>('checking');

  useEffect(() => {
    // Check if user has already dismissed this notification
    const dismissed = localStorage.getItem('vibepipe-setup-dismissed');
    if (dismissed) {
      setIsDismissed(true);
      return;
    }

    // Check yt-dlp availability
    checkYtDlpStatus();
  }, []);

  const checkYtDlpStatus = async () => {
    try {
      // Try to make a test request to see if yt-dlp is working
      const response = await fetch('/api/stream/test-song?quality=best');
      const data = await response.json();
      
      if (data.error && data.suggestion) {
        setYtDlpStatus('missing');
        setIsVisible(true);
      } else {
        setYtDlpStatus('available');
      }
    } catch (error) {
      setYtDlpStatus('missing');
      setIsVisible(true);
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
    setIsDismissed(true);
    localStorage.setItem('vibepipe-setup-dismissed', 'true');
  };

  const handleRecheck = () => {
    setYtDlpStatus('checking');
    checkYtDlpStatus();
  };

  if (isDismissed || !isVisible || ytDlpStatus === 'available') {
    return null;
  }

  return (
    <div className={cn(
      "fixed top-4 left-1/2 transform -translate-x-1/2 z-50 max-w-md w-full mx-4",
      className
    )}>
      <div className="bg-gradient-to-r from-yellow-900 to-orange-900 border border-yellow-600 rounded-lg shadow-lg p-4">
        <div className="flex items-start space-x-3">
          <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
          
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-yellow-100 mb-1">
              Setup Required for Full Functionality
            </h3>
            
            <p className="text-sm text-yellow-200 mb-3">
              VibePipe needs <code className="bg-yellow-800 px-1 rounded text-yellow-100">yt-dlp</code> for 
              YouTube streaming. Currently running in development mode with sample audio.
            </p>
            
            <div className="space-y-2">
              <div className="text-xs text-yellow-300">
                <strong>Quick Install:</strong>
              </div>
              
              <div className="bg-black/20 rounded p-2 font-mono text-xs text-yellow-100">
                pip install yt-dlp
              </div>
              
              <div className="flex items-center space-x-2 text-xs">
                <a
                  href="https://github.com/yt-dlp/yt-dlp#installation"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-yellow-300 hover:text-yellow-100 underline flex items-center space-x-1"
                >
                  <span>Full installation guide</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          </div>
          
          <button
            onClick={handleDismiss}
            className="text-yellow-400 hover:text-yellow-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-yellow-600">
          <div className="text-xs text-yellow-300">
            App works without yt-dlp, but with limited audio samples
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              onClick={handleRecheck}
              variant="ghost"
              size="sm"
              className="text-yellow-300 hover:text-yellow-100 text-xs px-2 py-1"
            >
              Recheck
            </Button>
            
            <Button
              onClick={handleDismiss}
              variant="ghost"
              size="sm"
              className="text-yellow-300 hover:text-yellow-100 text-xs px-2 py-1"
            >
              Got it
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}