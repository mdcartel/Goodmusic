'use client';

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface ResponsiveGridProps {
  children: ReactNode;
  className?: string;
  minItemWidth?: string;
  gap?: 'sm' | 'md' | 'lg';
  columns?: {
    mobile?: number;
    tablet?: number;
    desktop?: number;
    wide?: number;
  };
}

export default function ResponsiveGrid({
  children,
  className,
  minItemWidth = '280px',
  gap = 'md',
  columns
}: ResponsiveGridProps) {
  const gapClasses = {
    sm: 'gap-3',
    md: 'gap-4 sm:gap-6',
    lg: 'gap-6 sm:gap-8'
  };

  // If columns are specified, use them
  if (columns) {
    const columnClasses = [
      columns.mobile && `grid-cols-${columns.mobile}`,
      columns.tablet && `sm:grid-cols-${columns.tablet}`,
      columns.desktop && `lg:grid-cols-${columns.desktop}`,
      columns.wide && `xl:grid-cols-${columns.wide}`
    ].filter(Boolean).join(' ');

    return (
      <div className={cn(
        'grid',
        columnClasses,
        gapClasses[gap],
        className
      )}>
        {children}
      </div>
    );
  }

  // Use auto-fit with min-width
  return (
    <div 
      className={cn(
        'grid',
        gapClasses[gap],
        className
      )}
      style={{
        gridTemplateColumns: `repeat(auto-fit, minmax(${minItemWidth}, 1fr))`
      }}
    >
      {children}
    </div>
  );
}