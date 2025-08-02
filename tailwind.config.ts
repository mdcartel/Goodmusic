import type { Config } from "tailwindcss";
import { designTokens } from "./src/styles/design-tokens";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Brand colors
        primary: designTokens.colors.primary,
        secondary: designTokens.colors.secondary,
        
        // Neutral colors
        gray: designTokens.colors.neutral,
        
        // Mood colors
        mood: designTokens.colors.mood,
        
        // Status colors
        success: designTokens.colors.status.success,
        warning: designTokens.colors.status.warning,
        error: designTokens.colors.status.error,
        info: designTokens.colors.status.info,
      },
      
      fontFamily: designTokens.typography.fontFamily,
      fontSize: designTokens.typography.fontSize,
      fontWeight: designTokens.typography.fontWeight,
      
      spacing: designTokens.spacing,
      borderRadius: designTokens.borderRadius,
      boxShadow: designTokens.boxShadow,
      screens: designTokens.screens,
      
      // Custom animations
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
        'bounce-subtle': 'bounceSubtle 1s ease-in-out infinite',
      },
      
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 20px rgb(168 85 247 / 0.3)' },
          '50%': { boxShadow: '0 0 30px rgb(168 85 247 / 0.5)' },
        },
        bounceSubtle: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-2px)' },
        },
      },
      
      // Custom gradients
      backgroundImage: {
        'gradient-primary': 'linear-gradient(135deg, #a855f7 0%, #ec4899 100%)',
        'gradient-secondary': 'linear-gradient(135deg, #ec4899 0%, #f97316 100%)',
        'gradient-dark': 'linear-gradient(135deg, #111827 0%, #1f2937 100%)',
        'gradient-mood-chill': 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
        'gradient-mood-hype': 'linear-gradient(135deg, #f97316 0%, #ef4444 100%)',
        'gradient-mood-focus': 'linear-gradient(135deg, #10b981 0%, #3b82f6 100%)',
      },
      
      // Custom backdrop blur
      backdropBlur: {
        xs: '2px',
      },
      
      // Custom transitions
      transitionDuration: {
        '400': '400ms',
        '600': '600ms',
      },
      
      // Custom z-index scale
      zIndex: {
        '60': '60',
        '70': '70',
        '80': '80',
        '90': '90',
        '100': '100',
      },
    },
  },
  plugins: [
    // Custom plugin for component utilities
    function({ addUtilities }: any) {
      const newUtilities = {
        // Glass morphism effect
        '.glass': {
          background: 'rgba(31, 41, 55, 0.8)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(75, 85, 99, 0.3)',
        },
        
        // Gradient text
        '.text-gradient': {
          background: 'linear-gradient(135deg, #a855f7 0%, #ec4899 100%)',
          '-webkit-background-clip': 'text',
          '-webkit-text-fill-color': 'transparent',
          'background-clip': 'text',
        },
        
        // Glow effects
        '.glow': {
          boxShadow: '0 0 20px rgb(168 85 247 / 0.3)',
        },
        '.glow-sm': {
          boxShadow: '0 0 10px rgb(168 85 247 / 0.2)',
        },
        '.glow-lg': {
          boxShadow: '0 0 30px rgb(168 85 247 / 0.4)',
        },
        
        // Scrollbar styling
        '.scrollbar-thin': {
          scrollbarWidth: 'thin',
          scrollbarColor: '#4b5563 #1f2937',
        },
        '.scrollbar-thin::-webkit-scrollbar': {
          width: '6px',
        },
        '.scrollbar-thin::-webkit-scrollbar-track': {
          background: '#1f2937',
        },
        '.scrollbar-thin::-webkit-scrollbar-thumb': {
          background: '#4b5563',
          borderRadius: '3px',
        },
        '.scrollbar-thin::-webkit-scrollbar-thumb:hover': {
          background: '#6b7280',
        },
      };
      
      addUtilities(newUtilities);
    },
  ],
};

export default config;