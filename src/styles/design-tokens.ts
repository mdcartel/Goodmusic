// VibePipe Design System Tokens
// Centralized design tokens for consistent styling

export const designTokens = {
  // Color Palette
  colors: {
    // Primary Brand Colors (Purple)
    primary: {
      50: '#faf5ff',
      100: '#f3e8ff',
      200: '#e9d5ff',
      300: '#d8b4fe',
      400: '#c084fc',
      500: '#a855f7', // Main purple
      600: '#9333ea',
      700: '#7c3aed',
      800: '#6b21a8',
      900: '#581c87'
    },
    
    // Secondary Brand Colors (Pink)
    secondary: {
      50: '#fdf2f8',
      100: '#fce7f3',
      200: '#fbcfe8',
      300: '#f9a8d4',
      400: '#f472b6',
      500: '#ec4899', // Main pink
      600: '#db2777',
      700: '#be185d',
      800: '#9d174d',
      900: '#831843'
    },
    
    // Neutral Colors (Grays)
    neutral: {
      50: '#f9fafb',
      100: '#f3f4f6',
      200: '#e5e7eb',
      300: '#d1d5db',
      400: '#9ca3af',
      500: '#6b7280',
      600: '#4b5563',
      700: '#374151',
      800: '#1f2937',
      900: '#111827',
      950: '#030712'
    },
    
    // Mood Colors
    mood: {
      chill: '#3b82f6',      // Blue
      heartbreak: '#ef4444',  // Red
      hype: '#f97316',       // Orange
      nostalgic: '#8b5cf6',  // Purple
      focus: '#10b981',      // Green
      party: '#ec4899',      // Pink
      sad: '#6366f1',        // Indigo
      happy: '#eab308',      // Yellow
      angry: '#dc2626',      // Red
      anxious: '#8b5cf6',    // Purple
      lonely: '#6366f1',     // Indigo
      energetic: '#f97316'   // Orange
    },
    
    // Status Colors
    status: {
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444',
      info: '#3b82f6'
    }
  },
  
  // Typography Scale
  typography: {
    fontFamily: {
      sans: ['Inter', 'system-ui', 'sans-serif'],
      mono: ['JetBrains Mono', 'Consolas', 'monospace']
    },
    
    fontSize: {
      xs: ['0.75rem', { lineHeight: '1rem' }],
      sm: ['0.875rem', { lineHeight: '1.25rem' }],
      base: ['1rem', { lineHeight: '1.5rem' }],
      lg: ['1.125rem', { lineHeight: '1.75rem' }],
      xl: ['1.25rem', { lineHeight: '1.75rem' }],
      '2xl': ['1.5rem', { lineHeight: '2rem' }],
      '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
      '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
      '5xl': ['3rem', { lineHeight: '1' }],
      '6xl': ['3.75rem', { lineHeight: '1' }]
    },
    
    fontWeight: {
      light: '300',
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
      extrabold: '800'
    }
  },
  
  // Spacing Scale
  spacing: {
    px: '1px',
    0: '0',
    0.5: '0.125rem',
    1: '0.25rem',
    1.5: '0.375rem',
    2: '0.5rem',
    2.5: '0.625rem',
    3: '0.75rem',
    3.5: '0.875rem',
    4: '1rem',
    5: '1.25rem',
    6: '1.5rem',
    7: '1.75rem',
    8: '2rem',
    9: '2.25rem',
    10: '2.5rem',
    11: '2.75rem',
    12: '3rem',
    14: '3.5rem',
    16: '4rem',
    20: '5rem',
    24: '6rem',
    28: '7rem',
    32: '8rem',
    36: '9rem',
    40: '10rem',
    44: '11rem',
    48: '12rem',
    52: '13rem',
    56: '14rem',
    60: '15rem',
    64: '16rem',
    72: '18rem',
    80: '20rem',
    96: '24rem'
  },
  
  // Border Radius
  borderRadius: {
    none: '0',
    sm: '0.125rem',
    DEFAULT: '0.25rem',
    md: '0.375rem',
    lg: '0.5rem',
    xl: '0.75rem',
    '2xl': '1rem',
    '3xl': '1.5rem',
    full: '9999px'
  },
  
  // Shadows
  boxShadow: {
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    DEFAULT: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
    '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
    inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
    none: 'none',
    
    // Custom VibePipe shadows
    glow: '0 0 20px rgb(168 85 247 / 0.3)',
    'glow-sm': '0 0 10px rgb(168 85 247 / 0.2)',
    'glow-lg': '0 0 30px rgb(168 85 247 / 0.4)'
  },
  
  // Animation & Transitions
  animation: {
    duration: {
      fast: '150ms',
      normal: '300ms',
      slow: '500ms'
    },
    
    easing: {
      linear: 'linear',
      in: 'cubic-bezier(0.4, 0, 1, 1)',
      out: 'cubic-bezier(0, 0, 0.2, 1)',
      'in-out': 'cubic-bezier(0.4, 0, 0.2, 1)'
    }
  },
  
  // Breakpoints
  screens: {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px'
  }
};

// Component-specific design tokens
export const componentTokens = {
  // Button variants
  button: {
    sizes: {
      sm: {
        padding: '0.5rem 0.75rem',
        fontSize: '0.875rem',
        borderRadius: '0.375rem'
      },
      md: {
        padding: '0.625rem 1rem',
        fontSize: '1rem',
        borderRadius: '0.5rem'
      },
      lg: {
        padding: '0.75rem 1.5rem',
        fontSize: '1.125rem',
        borderRadius: '0.5rem'
      }
    },
    
    variants: {
      primary: {
        background: 'linear-gradient(135deg, #a855f7 0%, #ec4899 100%)',
        color: '#ffffff',
        border: 'none',
        shadow: '0 4px 14px 0 rgb(168 85 247 / 0.3)'
      },
      secondary: {
        background: '#374151',
        color: '#ffffff',
        border: '1px solid #4b5563',
        shadow: 'none'
      },
      ghost: {
        background: 'transparent',
        color: '#9ca3af',
        border: 'none',
        shadow: 'none'
      },
      outline: {
        background: 'transparent',
        color: '#a855f7',
        border: '1px solid #a855f7',
        shadow: 'none'
      }
    }
  },
  
  // Card variants
  card: {
    variants: {
      default: {
        background: '#1f2937',
        border: '1px solid #374151',
        borderRadius: '0.75rem',
        shadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
      },
      elevated: {
        background: '#1f2937',
        border: '1px solid #374151',
        borderRadius: '0.75rem',
        shadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'
      },
      glass: {
        background: 'rgba(31, 41, 55, 0.8)',
        border: '1px solid rgba(75, 85, 99, 0.3)',
        borderRadius: '0.75rem',
        backdropFilter: 'blur(10px)',
        shadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
      }
    }
  },
  
  // Input variants
  input: {
    variants: {
      default: {
        background: '#111827',
        border: '1px solid #374151',
        borderRadius: '0.5rem',
        color: '#ffffff',
        placeholder: '#6b7280'
      },
      focus: {
        borderColor: '#a855f7',
        boxShadow: '0 0 0 3px rgb(168 85 247 / 0.1)'
      }
    }
  }
};

// Utility functions for design tokens
export const getColorValue = (colorPath: string): string => {
  const parts = colorPath.split('.');
  let value: any = designTokens.colors;
  
  for (const part of parts) {
    value = value?.[part];
  }
  
  return value || colorPath;
};

export const getMoodColor = (mood: string): string => {
  return designTokens.colors.mood[mood as keyof typeof designTokens.colors.mood] || designTokens.colors.neutral[500];
};

export const getSpacingValue = (spacing: string): string => {
  return designTokens.spacing[spacing as keyof typeof designTokens.spacing] || spacing;
};