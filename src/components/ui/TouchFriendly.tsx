'use client';

import { ReactNode, TouchEvent, MouseEvent, useState } from 'react';
import { cn } from '@/lib/utils';

interface TouchFriendlyProps {
  children: ReactNode;
  onTap?: () => void;
  onLongPress?: () => void;
  className?: string;
  disabled?: boolean;
  longPressDelay?: number;
}

export default function TouchFriendly({
  children,
  onTap,
  onLongPress,
  className,
  disabled = false,
  longPressDelay = 500
}: TouchFriendlyProps) {
  const [isPressed, setIsPressed] = useState(false);
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);

  const handleTouchStart = (e: TouchEvent) => {
    if (disabled) return;
    
    setIsPressed(true);
    
    if (onLongPress) {
      const timer = setTimeout(() => {
        onLongPress();
        setLongPressTimer(null);
      }, longPressDelay);
      setLongPressTimer(timer);
    }
  };

  const handleTouchEnd = (e: TouchEvent) => {
    if (disabled) return;
    
    setIsPressed(false);
    
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
      
      // Only trigger tap if long press didn't fire
      if (onTap) {
        onTap();
      }
    } else if (onTap && !onLongPress) {
      onTap();
    }
  };

  const handleTouchCancel = () => {
    setIsPressed(false);
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
  };

  const handleMouseDown = (e: MouseEvent) => {
    if (disabled) return;
    setIsPressed(true);
  };

  const handleMouseUp = (e: MouseEvent) => {
    if (disabled) return;
    setIsPressed(false);
    if (onTap) {
      onTap();
    }
  };

  const handleMouseLeave = () => {
    setIsPressed(false);
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
  };

  return (
    <div
      className={cn(
        "touch-manipulation select-none transition-transform duration-150",
        isPressed && "scale-95",
        disabled && "opacity-50 pointer-events-none",
        className
      )}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchCancel}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
    >
      {children}
    </div>
  );
}