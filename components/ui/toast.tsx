'use client';

import { useEffect, useState } from 'react';
import { X, CheckCircle, AlertCircle } from 'lucide-react';

interface Toast {
  id: string;
  title: string;
  description?: string;
  variant?: 'default' | 'destructive';
}

interface ToastProps {
  toast: Toast;
  onDismiss: (id: string) => void;
}

export function Toast({ toast, onDismiss }: ToastProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => onDismiss(toast.id), 200);
    }, 4800);

    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  const bgColor = toast.variant === 'destructive' ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200';
  const textColor = toast.variant === 'destructive' ? 'text-red-800' : 'text-green-800';
  const iconColor = toast.variant === 'destructive' ? 'text-red-600' : 'text-green-600';

  return (
    <div
      className={`
        ${bgColor} ${textColor} border rounded-lg p-4 shadow-lg transition-all duration-200 transform
        ${isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
      `}
    >
      <div className="flex items-start gap-3">
        {toast.variant === 'destructive' ? (
          <AlertCircle className={`h-5 w-5 ${iconColor} flex-shrink-0 mt-0.5`} />
        ) : (
          <CheckCircle className={`h-5 w-5 ${iconColor} flex-shrink-0 mt-0.5`} />
        )}
        <div className="flex-1">
          <h3 className="font-medium text-sm">{toast.title}</h3>
          {toast.description && (
            <p className="text-sm opacity-90 mt-1">{toast.description}</p>
          )}
        </div>
        <button
          onClick={() => onDismiss(toast.id)}
          className={`${iconColor} hover:opacity-70 transition-opacity`}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <div className="fixed bottom-4 right-4 z-50 space-y-2 max-w-sm">
        {/* Toast container - managed by useToast hook */}
      </div>
    </>
  );
}