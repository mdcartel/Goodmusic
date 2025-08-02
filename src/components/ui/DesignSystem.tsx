// VibePipe Design System Components
// Consistent, reusable UI components following design tokens

import React from 'react';
import { cn } from '@/lib/utils';
import { designTokens, componentTokens, getMoodColor } from '@/styles/design-tokens';

// Typography Components
export const Typography = {
  H1: ({ children, className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h1 
      className={cn(
        "text-4xl md:text-5xl font-bold text-white leading-tight",
        className
      )} 
      {...props}
    >
      {children}
    </h1>
  ),
  
  H2: ({ children, className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h2 
      className={cn(
        "text-3xl md:text-4xl font-semibold text-white leading-tight",
        className
      )} 
      {...props}
    >
      {children}
    </h2>
  ),
  
  H3: ({ children, className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h3 
      className={cn(
        "text-2xl md:text-3xl font-semibold text-white leading-tight",
        className
      )} 
      {...props}
    >
      {children}
    </h3>
  ),
  
  H4: ({ children, className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h4 
      className={cn(
        "text-xl md:text-2xl font-medium text-white leading-tight",
        className
      )} 
      {...props}
    >
      {children}
    </h4>
  ),
  
  Body: ({ children, className, variant = 'default', ...props }: React.HTMLAttributes<HTMLParagraphElement> & {
    variant?: 'default' | 'large' | 'small' | 'muted';
  }) => (
    <p 
      className={cn(
        "leading-relaxed",
        {
          'text-base text-gray-300': variant === 'default',
          'text-lg text-gray-300': variant === 'large',
          'text-sm text-gray-300': variant === 'small',
          'text-sm text-gray-500': variant === 'muted',
        },
        className
      )} 
      {...props}
    >
      {children}
    </p>
  ),
  
  Caption: ({ children, className, ...props }: React.HTMLAttributes<HTMLSpanElement>) => (
    <span 
      className={cn(
        "text-xs text-gray-500 font-medium",
        className
      )} 
      {...props}
    >
      {children}
    </span>
  ),
  
  GradientText: ({ children, className, ...props }: React.HTMLAttributes<HTMLSpanElement>) => (
    <span 
      className={cn(
        "text-gradient font-semibold",
        className
      )} 
      {...props}
    >
      {children}
    </span>
  ),
};

// Card Components
export const Card = {
  Root: ({ children, className, variant = 'default', ...props }: React.HTMLAttributes<HTMLDivElement> & {
    variant?: 'default' | 'elevated' | 'glass';
  }) => (
    <div 
      className={cn(
        "rounded-xl transition-all duration-300",
        {
          'bg-gray-800 border border-gray-700 shadow-md': variant === 'default',
          'bg-gray-800 border border-gray-700 shadow-xl': variant === 'elevated',
          'glass': variant === 'glass',
        },
        className
      )} 
      {...props}
    >
      {children}
    </div>
  ),
  
  Header: ({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
    <div 
      className={cn(
        "p-6 border-b border-gray-700",
        className
      )} 
      {...props}
    >
      {children}
    </div>
  ),
  
  Content: ({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
    <div 
      className={cn(
        "p-6",
        className
      )} 
      {...props}
    >
      {children}
    </div>
  ),
  
  Footer: ({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
    <div 
      className={cn(
        "p-6 border-t border-gray-700 bg-gray-900/50 rounded-b-xl",
        className
      )} 
      {...props}
    >
      {children}
    </div>
  ),
};

// Button Components
export const Button = {
  Root: ({ 
    children, 
    className, 
    variant = 'primary', 
    size = 'md', 
    loading = false,
    disabled = false,
    ...props 
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger';
    size?: 'sm' | 'md' | 'lg';
    loading?: boolean;
  }) => (
    <button 
      className={cn(
        "inline-flex items-center justify-center font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed",
        // Size variants
        {
          'px-3 py-1.5 text-sm rounded-md': size === 'sm',
          'px-4 py-2 text-base rounded-lg': size === 'md',
          'px-6 py-3 text-lg rounded-lg': size === 'lg',
        },
        // Color variants
        {
          'bg-gradient-primary text-white shadow-lg hover:shadow-xl hover:scale-105 glow-sm': variant === 'primary',
          'bg-gray-700 text-white border border-gray-600 hover:bg-gray-600': variant === 'secondary',
          'bg-transparent text-gray-300 hover:text-white hover:bg-gray-800': variant === 'ghost',
          'bg-transparent text-primary-400 border border-primary-400 hover:bg-primary-400 hover:text-white': variant === 'outline',
          'bg-red-600 text-white hover:bg-red-700 shadow-lg': variant === 'danger',
        },
        loading && 'cursor-wait',
        className
      )} 
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      )}
      {children}
    </button>
  ),
};

// Input Components
export const Input = {
  Root: ({ 
    className, 
    error,
    ...props 
  }: React.InputHTMLAttributes<HTMLInputElement> & {
    error?: boolean;
  }) => (
    <input 
      className={cn(
        "w-full px-4 py-2 bg-gray-900 border rounded-lg text-white placeholder-gray-400 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900",
        error 
          ? "border-red-500 focus:border-red-500 focus:ring-red-500" 
          : "border-gray-600 focus:border-primary-500 focus:ring-primary-500",
        className
      )} 
      {...props}
    />
  ),
  
  Textarea: ({ 
    className, 
    error,
    ...props 
  }: React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
    error?: boolean;
  }) => (
    <textarea 
      className={cn(
        "w-full px-4 py-2 bg-gray-900 border rounded-lg text-white placeholder-gray-400 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 resize-none",
        error 
          ? "border-red-500 focus:border-red-500 focus:ring-red-500" 
          : "border-gray-600 focus:border-primary-500 focus:ring-primary-500",
        className
      )} 
      {...props}
    />
  ),
};

// Badge Components
export const Badge = {
  Root: ({ 
    children, 
    className, 
    variant = 'default',
    mood,
    ...props 
  }: React.HTMLAttributes<HTMLSpanElement> & {
    variant?: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'mood';
    mood?: string;
  }) => (
    <span 
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
        {
          'bg-gray-700 text-gray-300': variant === 'default',
          'bg-gradient-primary text-white': variant === 'primary',
          'bg-gray-600 text-gray-200': variant === 'secondary',
          'bg-green-600 text-white': variant === 'success',
          'bg-yellow-600 text-white': variant === 'warning',
          'bg-red-600 text-white': variant === 'error',
        },
        variant === 'mood' && mood && {
          'text-white': true,
        },
        className
      )} 
      style={variant === 'mood' && mood ? { backgroundColor: getMoodColor(mood) } : undefined}
      {...props}
    >
      {children}
    </span>
  ),
};

// Loading Components
export const Loading = {
  Spinner: ({ className, size = 'md' }: { className?: string; size?: 'sm' | 'md' | 'lg' }) => (
    <div 
      className={cn(
        "animate-spin rounded-full border-2 border-gray-600 border-t-primary-500",
        {
          'h-4 w-4': size === 'sm',
          'h-6 w-6': size === 'md',
          'h-8 w-8': size === 'lg',
        },
        className
      )}
    />
  ),
  
  Dots: ({ className }: { className?: string }) => (
    <div className={cn("flex space-x-1", className)}>
      <div className="w-2 h-2 bg-primary-500 rounded-full animate-bounce" />
      <div className="w-2 h-2 bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
      <div className="w-2 h-2 bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
    </div>
  ),
  
  Skeleton: ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
    <div 
      className={cn(
        "animate-pulse bg-gray-700 rounded",
        className
      )} 
      {...props}
    />
  ),
};

// Status Components
export const Status = {
  Indicator: ({ 
    status, 
    className,
    ...props 
  }: React.HTMLAttributes<HTMLDivElement> & {
    status: 'online' | 'offline' | 'busy' | 'away';
  }) => (
    <div 
      className={cn(
        "w-3 h-3 rounded-full",
        {
          'bg-green-500': status === 'online',
          'bg-gray-500': status === 'offline',
          'bg-red-500': status === 'busy',
          'bg-yellow-500': status === 'away',
        },
        className
      )} 
      {...props}
    />
  ),
};

// Layout Components
export const Layout = {
  Container: ({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
    <div 
      className={cn(
        "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8",
        className
      )} 
      {...props}
    >
      {children}
    </div>
  ),
  
  Grid: ({ 
    children, 
    className, 
    cols = 1,
    gap = 6,
    ...props 
  }: React.HTMLAttributes<HTMLDivElement> & {
    cols?: 1 | 2 | 3 | 4 | 5 | 6;
    gap?: 2 | 4 | 6 | 8;
  }) => (
    <div 
      className={cn(
        "grid",
        {
          'grid-cols-1': cols === 1,
          'grid-cols-1 md:grid-cols-2': cols === 2,
          'grid-cols-1 md:grid-cols-2 lg:grid-cols-3': cols === 3,
          'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4': cols === 4,
          'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5': cols === 5,
          'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6': cols === 6,
        },
        {
          'gap-2': gap === 2,
          'gap-4': gap === 4,
          'gap-6': gap === 6,
          'gap-8': gap === 8,
        },
        className
      )} 
      {...props}
    >
      {children}
    </div>
  ),
  
  Stack: ({ 
    children, 
    className, 
    direction = 'vertical',
    spacing = 4,
    ...props 
  }: React.HTMLAttributes<HTMLDivElement> & {
    direction?: 'vertical' | 'horizontal';
    spacing?: 2 | 3 | 4 | 6 | 8;
  }) => (
    <div 
      className={cn(
        "flex",
        direction === 'vertical' ? 'flex-col' : 'flex-row items-center',
        {
          'space-y-2': direction === 'vertical' && spacing === 2,
          'space-y-3': direction === 'vertical' && spacing === 3,
          'space-y-4': direction === 'vertical' && spacing === 4,
          'space-y-6': direction === 'vertical' && spacing === 6,
          'space-y-8': direction === 'vertical' && spacing === 8,
          'space-x-2': direction === 'horizontal' && spacing === 2,
          'space-x-3': direction === 'horizontal' && spacing === 3,
          'space-x-4': direction === 'horizontal' && spacing === 4,
          'space-x-6': direction === 'horizontal' && spacing === 6,
          'space-x-8': direction === 'horizontal' && spacing === 8,
        },
        className
      )} 
      {...props}
    >
      {children}
    </div>
  ),
};