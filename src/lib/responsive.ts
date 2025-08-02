// Responsive utilities for VibePipe MVP
// Provides consistent responsive behavior across all components

import { designTokens } from '@/styles/design-tokens';

export type Breakpoint = 'sm' | 'md' | 'lg' | 'xl' | '2xl';
export type ScreenSize = 'mobile' | 'tablet' | 'desktop' | 'wide';

// Breakpoint values from design tokens
export const breakpoints = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536
} as const;

// Screen size categories
export const screenSizes = {
  mobile: { min: 0, max: 767 },
  tablet: { min: 768, max: 1023 },
  desktop: { min: 1024, max: 1535 },
  wide: { min: 1536, max: Infinity }
} as const;

// Responsive grid configurations
export const gridConfigs = {
  // Song grids
  songs: {
    mobile: { cols: 1, gap: 4 },
    tablet: { cols: 2, gap: 6 },
    desktop: { cols: 3, gap: 6 },
    wide: { cols: 4, gap: 8 }
  },
  
  // Mood selector
  moods: {
    mobile: { cols: 2, gap: 3 },
    tablet: { cols: 3, gap: 4 },
    desktop: { cols: 6, gap: 4 },
    wide: { cols: 8, gap: 4 }
  },
  
  // Feature cards
  features: {
    mobile: { cols: 1, gap: 6 },
    tablet: { cols: 2, gap: 6 },
    desktop: { cols: 3, gap: 8 },
    wide: { cols: 4, gap: 8 }
  },
  
  // Statistics/metrics
  stats: {
    mobile: { cols: 2, gap: 4 },
    tablet: { cols: 4, gap: 4 },
    desktop: { cols: 4, gap: 6 },
    wide: { cols: 6, gap: 6 }
  }
} as const;

// Responsive spacing configurations
export const spacingConfigs = {
  // Container padding
  container: {
    mobile: 'px-4',
    tablet: 'px-6',
    desktop: 'px-8',
    wide: 'px-8'
  },
  
  // Section spacing
  section: {
    mobile: 'py-8',
    tablet: 'py-12',
    desktop: 'py-16',
    wide: 'py-20'
  },
  
  // Component spacing
  component: {
    mobile: 'p-4',
    tablet: 'p-6',
    desktop: 'p-6',
    wide: 'p-8'
  }
} as const;

// Responsive typography configurations
export const typographyConfigs = {
  hero: {
    mobile: 'text-3xl',
    tablet: 'text-4xl',
    desktop: 'text-5xl',
    wide: 'text-6xl'
  },
  
  heading: {
    mobile: 'text-2xl',
    tablet: 'text-3xl',
    desktop: 'text-4xl',
    wide: 'text-4xl'
  },
  
  subheading: {
    mobile: 'text-xl',
    tablet: 'text-2xl',
    desktop: 'text-2xl',
    wide: 'text-3xl'
  },
  
  body: {
    mobile: 'text-sm',
    tablet: 'text-base',
    desktop: 'text-base',
    wide: 'text-lg'
  }
} as const;

// Utility functions
export const getScreenSize = (width: number): ScreenSize => {
  if (width < screenSizes.tablet.min) return 'mobile';
  if (width < screenSizes.desktop.min) return 'tablet';
  if (width < screenSizes.wide.min) return 'desktop';
  return 'wide';
};

export const isBreakpoint = (width: number, breakpoint: Breakpoint): boolean => {
  return width >= breakpoints[breakpoint];
};

export const getGridClasses = (
  type: keyof typeof gridConfigs,
  screenSize?: ScreenSize
): string => {
  const config = gridConfigs[type];
  
  if (screenSize) {
    const { cols, gap } = config[screenSize];
    return `grid-cols-${cols} gap-${gap}`;
  }
  
  // Return responsive classes for all screen sizes
  return [
    `grid-cols-${config.mobile.cols}`,
    `md:grid-cols-${config.tablet.cols}`,
    `lg:grid-cols-${config.desktop.cols}`,
    `xl:grid-cols-${config.wide.cols}`,
    `gap-${config.mobile.gap}`,
    `md:gap-${config.tablet.gap}`,
    `lg:gap-${config.desktop.gap}`,
    `xl:gap-${config.wide.gap}`
  ].join(' ');
};

export const getSpacingClasses = (
  type: keyof typeof spacingConfigs
): string => {
  const config = spacingConfigs[type];
  
  return [
    config.mobile,
    `md:${config.tablet.replace('p', 'p').replace('x', 'x').replace('y', 'y')}`,
    `lg:${config.desktop.replace('p', 'p').replace('x', 'x').replace('y', 'y')}`,
    `xl:${config.wide.replace('p', 'p').replace('x', 'x').replace('y', 'y')}`
  ].join(' ');
};

export const getTypographyClasses = (
  type: keyof typeof typographyConfigs
): string => {
  const config = typographyConfigs[type];
  
  return [
    config.mobile,
    `md:${config.tablet}`,
    `lg:${config.desktop}`,
    `xl:${config.wide}`
  ].join(' ');
};

// Responsive component configurations
export const componentConfigs = {
  // Audio player
  audioPlayer: {
    mobile: {
      height: 'h-20',
      padding: 'p-4',
      layout: 'flex-col space-y-2'
    },
    tablet: {
      height: 'h-24',
      padding: 'p-6',
      layout: 'flex-row items-center space-x-4'
    },
    desktop: {
      height: 'h-24',
      padding: 'p-6',
      layout: 'flex-row items-center space-x-6'
    },
    wide: {
      height: 'h-28',
      padding: 'p-8',
      layout: 'flex-row items-center space-x-8'
    }
  },
  
  // Navigation
  navigation: {
    mobile: {
      layout: 'hidden', // Hidden on mobile, use hamburger menu
      spacing: 'space-x-4'
    },
    tablet: {
      layout: 'flex',
      spacing: 'space-x-6'
    },
    desktop: {
      layout: 'flex',
      spacing: 'space-x-8'
    },
    wide: {
      layout: 'flex',
      spacing: 'space-x-10'
    }
  },
  
  // Modal/Dialog
  modal: {
    mobile: {
      width: 'w-full',
      height: 'h-full',
      margin: 'm-0',
      borderRadius: 'rounded-none'
    },
    tablet: {
      width: 'w-11/12 max-w-2xl',
      height: 'max-h-[90vh]',
      margin: 'm-4',
      borderRadius: 'rounded-xl'
    },
    desktop: {
      width: 'w-full max-w-4xl',
      height: 'max-h-[80vh]',
      margin: 'm-8',
      borderRadius: 'rounded-xl'
    },
    wide: {
      width: 'w-full max-w-6xl',
      height: 'max-h-[80vh]',
      margin: 'm-12',
      borderRadius: 'rounded-2xl'
    }
  },
  
  // Sidebar/Panel
  sidebar: {
    mobile: {
      width: 'w-full',
      position: 'fixed inset-0',
      transform: 'transform transition-transform'
    },
    tablet: {
      width: 'w-80',
      position: 'fixed right-0 top-0 h-full',
      transform: 'transform transition-transform'
    },
    desktop: {
      width: 'w-96',
      position: 'fixed right-0 top-0 h-full',
      transform: 'transform transition-transform'
    },
    wide: {
      width: 'w-[28rem]',
      position: 'fixed right-0 top-0 h-full',
      transform: 'transform transition-transform'
    }
  }
} as const;

export const getComponentClasses = (
  component: keyof typeof componentConfigs,
  property: string,
  screenSize?: ScreenSize
): string => {
  const config = componentConfigs[component];
  
  if (screenSize) {
    return (config[screenSize] as any)[property] || '';
  }
  
  // Return responsive classes for all screen sizes
  const mobileClass = (config.mobile as any)[property] || '';
  const tabletClass = (config.tablet as any)[property] || '';
  const desktopClass = (config.desktop as any)[property] || '';
  const wideClass = (config.wide as any)[property] || '';
  
  return [
    mobileClass,
    tabletClass && `md:${tabletClass}`,
    desktopClass && `lg:${desktopClass}`,
    wideClass && `xl:${wideClass}`
  ].filter(Boolean).join(' ');
};

// Touch-friendly configurations
export const touchConfigs = {
  // Minimum touch target sizes (44px minimum)
  minTouchTarget: 'min-h-[44px] min-w-[44px]',
  
  // Touch-friendly spacing
  touchSpacing: {
    small: 'p-3', // 12px
    medium: 'p-4', // 16px
    large: 'p-6'  // 24px
  },
  
  // Touch-friendly button sizes
  touchButtons: {
    small: 'px-4 py-3 text-sm',
    medium: 'px-6 py-4 text-base',
    large: 'px-8 py-5 text-lg'
  }
} as const;

// Accessibility configurations
export const a11yConfigs = {
  // Focus styles
  focus: 'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-gray-900',
  
  // High contrast mode support
  highContrast: 'contrast-more:border-2 contrast-more:border-current',
  
  // Reduced motion support
  reducedMotion: 'motion-reduce:transition-none motion-reduce:animate-none',
  
  // Screen reader only content
  srOnly: 'sr-only',
  
  // Skip links
  skipLink: 'absolute -top-full left-4 z-50 bg-primary-600 text-white px-4 py-2 rounded-md focus:top-4 transition-all'
} as const;

// Performance optimization configurations
export const performanceConfigs = {
  // Lazy loading
  lazyLoad: 'loading-lazy',
  
  // Image optimization
  imageOptimization: {
    mobile: 'w-full h-auto',
    tablet: 'w-full h-auto max-w-md',
    desktop: 'w-full h-auto max-w-lg',
    wide: 'w-full h-auto max-w-xl'
  },
  
  // Content prioritization
  contentPriority: {
    critical: 'block',
    important: 'hidden md:block',
    optional: 'hidden lg:block'
  }
} as const;