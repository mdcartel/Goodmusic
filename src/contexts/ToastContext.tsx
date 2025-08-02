'use client';

import { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { Toast, ToastType } from '@/components/ui/Toast';
import ToastContainer from '@/components/ui/ToastContainer';

interface ToastContextType {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => string;
  removeToast: (id: string) => void;
  clearToasts: () => void;
  // Convenience methods
  success: (title: string, description?: string, options?: Partial<Toast>) => string;
  error: (title: string, description?: string, options?: Partial<Toast>) => string;
  warning: (title: string, description?: string, options?: Partial<Toast>) => string;
  info: (title: string, description?: string, options?: Partial<Toast>) => string;
  loading: (title: string, description?: string, options?: Partial<Toast>) => string;
  updateToast: (id: string, updates: Partial<Toast>) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

interface ToastProviderProps {
  children: ReactNode;
}

export function ToastProvider({ children }: ToastProviderProps) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const generateId = () => Math.random().toString(36).substr(2, 9);

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = generateId();
    const newToast: Toast = {
      id,
      duration: 5000, // Default 5 seconds
      ...toast
    };

    setToasts(prev => [...prev, newToast]);
    return id;
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const clearToasts = useCallback(() => {
    setToasts([]);
  }, []);

  const updateToast = useCallback((id: string, updates: Partial<Toast>) => {
    setToasts(prev => prev.map(toast => 
      toast.id === id ? { ...toast, ...updates } : toast
    ));
  }, []);

  // Convenience methods
  const success = useCallback((title: string, description?: string, options?: Partial<Toast>) => {
    return addToast({
      type: 'success',
      title,
      description,
      ...options
    });
  }, [addToast]);

  const error = useCallback((title: string, description?: string, options?: Partial<Toast>) => {
    return addToast({
      type: 'error',
      title,
      description,
      duration: 8000, // Errors stay longer
      ...options
    });
  }, [addToast]);

  const warning = useCallback((title: string, description?: string, options?: Partial<Toast>) => {
    return addToast({
      type: 'warning',
      title,
      description,
      duration: 6000,
      ...options
    });
  }, [addToast]);

  const info = useCallback((title: string, description?: string, options?: Partial<Toast>) => {
    return addToast({
      type: 'info',
      title,
      description,
      ...options
    });
  }, [addToast]);

  const loading = useCallback((title: string, description?: string, options?: Partial<Toast>) => {
    return addToast({
      type: 'loading',
      title,
      description,
      duration: 0, // Loading toasts don't auto-dismiss
      ...options
    });
  }, [addToast]);

  const value: ToastContextType = {
    toasts,
    addToast,
    removeToast,
    clearToasts,
    success,
    error,
    warning,
    info,
    loading,
    updateToast
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

// Hook for handling async operations with toast feedback
export function useAsyncToast() {
  const toast = useToast();

  const executeWithToast = useCallback(async <T>(
    operation: () => Promise<T>,
    options: {
      loadingTitle: string;
      loadingDescription?: string;
      successTitle: string;
      successDescription?: string;
      errorTitle?: string;
      errorDescription?: string;
      onSuccess?: (result: T) => void;
      onError?: (error: Error) => void;
    }
  ): Promise<T | null> => {
    const loadingId = toast.loading(options.loadingTitle, options.loadingDescription);

    try {
      const result = await operation();
      
      toast.removeToast(loadingId);
      toast.success(options.successTitle, options.successDescription);
      
      options.onSuccess?.(result);
      return result;
    } catch (error) {
      toast.removeToast(loadingId);
      
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      toast.error(
        options.errorTitle || 'Operation Failed',
        options.errorDescription || errorMessage
      );
      
      options.onError?.(error instanceof Error ? error : new Error(errorMessage));
      return null;
    }
  }, [toast]);

  return { executeWithToast, ...toast };
}