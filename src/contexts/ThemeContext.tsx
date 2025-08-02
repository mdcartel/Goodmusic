'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { designTokens } from '@/styles/design-tokens';

type Theme = 'dark' | 'light';
type ColorScheme = 'purple' | 'blue' | 'green' | 'orange';

interface ThemeContextType {
  theme: Theme;
  colorScheme: ColorScheme;
  setTheme: (theme: Theme) => void;
  setColorScheme: (scheme: ColorScheme) => void;
  toggleTheme: () => void;
  isDark: boolean;
  colors: typeof designTokens.colors;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
  defaultTheme?: Theme;
  defaultColorScheme?: ColorScheme;
}

export function ThemeProvider({ 
  children, 
  defaultTheme = 'dark',
  defaultColorScheme = 'purple'
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(defaultTheme);
  const [colorScheme, setColorScheme] = useState<ColorScheme>(defaultColorScheme);

  // Load theme from localStorage on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('vibepipe-theme') as Theme;
    const savedColorScheme = localStorage.getItem('vibepipe-color-scheme') as ColorScheme;
    
    if (savedTheme) {
      setTheme(savedTheme);
    }
    
    if (savedColorScheme) {
      setColorScheme(savedColorScheme);
    }
  }, []);

  // Save theme to localStorage and update document class
  useEffect(() => {
    localStorage.setItem('vibepipe-theme', theme);
    
    // Update document class for theme
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(theme);
    
    // Update CSS custom properties for theme
    const root = document.documentElement;
    
    if (theme === 'dark') {
      root.style.setProperty('--background', '#030712');
      root.style.setProperty('--foreground', '#f9fafb');
    } else {
      root.style.setProperty('--background', '#f9fafb');
      root.style.setProperty('--foreground', '#030712');
    }
  }, [theme]);

  // Save color scheme to localStorage and update CSS variables
  useEffect(() => {
    localStorage.setItem('vibepipe-color-scheme', colorScheme);
    
    // Update CSS custom properties for color scheme
    const root = document.documentElement;
    
    const colorSchemes = {
      purple: {
        primary: '#a855f7',
        primaryDark: '#7c3aed',
        secondary: '#ec4899',
        secondaryDark: '#be185d',
      },
      blue: {
        primary: '#3b82f6',
        primaryDark: '#1d4ed8',
        secondary: '#06b6d4',
        secondaryDark: '#0891b2',
      },
      green: {
        primary: '#10b981',
        primaryDark: '#047857',
        secondary: '#84cc16',
        secondaryDark: '#65a30d',
      },
      orange: {
        primary: '#f97316',
        primaryDark: '#ea580c',
        secondary: '#eab308',
        secondaryDark: '#ca8a04',
      },
    };
    
    const colors = colorSchemes[colorScheme];
    root.style.setProperty('--color-primary', colors.primary);
    root.style.setProperty('--color-primary-dark', colors.primaryDark);
    root.style.setProperty('--color-secondary', colors.secondary);
    root.style.setProperty('--color-secondary-dark', colors.secondaryDark);
  }, [colorScheme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const value: ThemeContextType = {
    theme,
    colorScheme,
    setTheme,
    setColorScheme,
    toggleTheme,
    isDark: theme === 'dark',
    colors: designTokens.colors,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

// Theme toggle component
export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();
  
  return (
    <button
      onClick={toggleTheme}
      className={`p-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white transition-colors ${className}`}
      aria-label="Toggle theme"
    >
      {theme === 'dark' ? (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ) : (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        </svg>
      )}
    </button>
  );
}

// Color scheme selector component
export function ColorSchemeSelector({ className }: { className?: string }) {
  const { colorScheme, setColorScheme } = useTheme();
  
  const schemes: { name: ColorScheme; color: string; label: string }[] = [
    { name: 'purple', color: '#a855f7', label: 'Purple' },
    { name: 'blue', color: '#3b82f6', label: 'Blue' },
    { name: 'green', color: '#10b981', label: 'Green' },
    { name: 'orange', color: '#f97316', label: 'Orange' },
  ];
  
  return (
    <div className={`flex space-x-2 ${className}`}>
      {schemes.map((scheme) => (
        <button
          key={scheme.name}
          onClick={() => setColorScheme(scheme.name)}
          className={`w-8 h-8 rounded-full border-2 transition-all ${
            colorScheme === scheme.name 
              ? 'border-white scale-110' 
              : 'border-gray-600 hover:border-gray-400'
          }`}
          style={{ backgroundColor: scheme.color }}
          aria-label={`Set ${scheme.label} color scheme`}
          title={scheme.label}
        />
      ))}
    </div>
  );
}