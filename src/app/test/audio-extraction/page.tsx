'use client';

import React, { useState } from 'react';
import { AudioExtractionPanel } from '../../../components/audio/AudioExtractionPanel';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { Play, Pause, Volume2, VolumeX } from 'lucide-react';

export default function AudioExtractionTestPage() {
  const [currentStreamUrl, setCurrentStreamUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  const [extractionResults, setExtractionResults] = useState<any[]>([]);

  const handleStreamUrl = (url: string) => {
    setCurrentStreamUrl(url);
    
    // Create new audio element
    if (audioElement) {
      audioElement.pause();
      audioElement.src = '';
    }
    
    const audio = new Audio(url);
    audio.crossOrigin = 'anonymous';
    
    audio.addEventListener('loadstart', () => {
      console.log('Audio loading started');
    });
    
    audio.addEventListener('canplay', () => {
      console.log('Audio can start playing');
    });
    
    audio.addEventListener('error', (e) => {
      console.error('Audio error:', e);
    });
    
    setAudioElement(audio);
    setIsPlaying(false);
  };

  const handleExtractionComplete = (result: any) => {
    setExtractionResults(prev => [result, ...prev.slice(0, 4)]); // Keep last 5 results
  };

  const togglePlayback = () => {
    if (!audioElement) return;
    
    if (isPlaying) {
      audioElement.pause();
    } else {
      audioElement.play().catch(error => {
        console.error('Playback failed:', error);
      });
    }
    
    setIsPlaying(!isPlaying);
  };

  const toggleMute = () => {
    if (!audioElement) return;
    
    audioElement.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Audio Extraction Test</h1>
          <p className="text-muted-foreground">
            Test the yt-dlp audio extraction service with real YouTube videos
          </p>
        </div>

        {/* Audio Player */}
        {currentStreamUrl && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Volume2 className="h-5 w-5 mr-2" />
                Audio Player
              </CardTitle>
              <CardDescription>
                Playing extracted audio stream
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-4">
                <Button
                  onClick={togglePlayback}
                  disabled={!audioElement}
                  className="flex items-center"
                >
                  {isPlaying ? (
                    <Pause className="h-4 w-4 mr-2" />
                  ) : (
                    <Play className="h-4 w-4 mr-2" />
                  )}
                  {isPlaying ? 'Pause' : 'Play'}
                </Button>

                <Button
                  variant="outline"
                  onClick={toggleMute}
                  disabled={!audioElement}
                  className="flex items-center"
                >
                  {isMuted ? (
                    <VolumeX className="h-4 w-4 mr-2" />
                  ) : (
                    <Volume2 className="h-4 w-4 mr-2" />
                  )}
                  {isMuted ? 'Unmute' : 'Mute'}
                </Button>

                <Badge variant="outline">
                  Stream Active
                </Badge>
              </div>

              <div className="text-xs text-muted-foreground break-all">
                <strong>Stream URL:</strong> {currentStreamUrl}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Extraction Panel */}
        <AudioExtractionPanel
          onStreamUrl={handleStreamUrl}
          onExtractionComplete={handleExtractionComplete}
        />

        {/* Recent Extractions */}
        {extractionResults.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Recent Extractions</CardTitle>
              <CardDescription>
                Last {extractionResults.length} successful extractions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {extractionResults.map((result, index) => (
                  <div key={index} className="p-3 border rounded-md">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <h4 className="font-medium">{result.title}</h4>
                        <p className="text-sm text-muted-foreground">{result.artist}</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline">
                          {result.bestStream.format.toUpperCase()}
                        </Badge>
                        <Badge variant="secondary">
                          {result.bestStream.bitrate} kbps
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Video ID: {result.videoId}</span>
                      <span>
                        Extracted: {new Date(result.extractedAt).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Test Instructions */}
        <Card>
          <CardHeader>
            <CardTitle>Test Instructions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <h4 className="font-medium">How to test:</h4>
              <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                <li>Enter a YouTube URL or video ID in the input field above</li>
                <li>Select your preferred quality and format options</li>
                <li>Click "Extract Audio" to get full extraction details</li>
                <li>Click "Get Stream URL" to get a direct streaming link</li>
                <li>Use the audio player to test playback</li>
                <li>Check cache management to see performance improvements</li>
              </ol>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium">Sample YouTube URLs to test:</h4>
              <div className="space-y-1 text-sm text-muted-foreground font-mono">
                <div>https://www.youtube.com/watch?v=dQw4w9WgXcQ</div>
                <div>https://youtu.be/dQw4w9WgXcQ</div>
                <div>dQw4w9WgXcQ (direct video ID)</div>
              </div>
            </div>

            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <p className="text-sm text-yellow-800">
                <strong>Note:</strong> This test page requires yt-dlp to be installed and properly configured. 
                Make sure the extraction service is working before testing.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}