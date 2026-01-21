'use client';

import { useEffect } from 'react';
import { usePostHog } from '@/contexts/posthog-provider';

const CLIENT_ERROR_EVENT = 'client_error';

let consoleErrorPatched = false;
let originalConsoleError: ((...data: unknown[]) => void) | null = null;

type ErrorDetails = {
  errorType: string;
  errorCode?: string;
  httpStatus?: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function extractErrorDetails(value: unknown, fallbackType: string): ErrorDetails {
  if (value instanceof Error) {
    const code = isRecord(value) ? value.code : undefined;
    return {
      errorType: value.name || fallbackType,
      errorCode: typeof code === 'string' ? code : typeof code === 'number' ? String(code) : undefined,
      httpStatus: extractHttpStatus(value),
    };
  }

  if (isRecord(value)) {
    const name = typeof value.name === 'string' ? value.name : fallbackType;
    const code = value.code;
    return {
      errorType: name,
      errorCode: typeof code === 'string' ? code : typeof code === 'number' ? String(code) : undefined,
      httpStatus: extractHttpStatus(value),
    };
  }

  return { errorType: fallbackType };
}

function extractHttpStatus(value: unknown): number | undefined {
  if (!isRecord(value)) return undefined;
  const status = value.status ?? value.statusCode;
  if (typeof status === 'number' && Number.isFinite(status)) return status;
  if (typeof status === 'string') {
    const parsed = Number(status);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function findErrorCandidate(args: readonly unknown[]): unknown {
  for (const arg of args) {
    if (arg instanceof Error) return arg;
  }
  return args[0];
}

export function ClientErrorCapture() {
  const { captureEvent, isReady } = usePostHog();

  useEffect(() => {
    if (!isReady) return;

    const reportError = (error: unknown, action: string, fallbackType: string) => {
      const { errorType, errorCode, httpStatus } = extractErrorDetails(error, fallbackType);

      captureEvent(CLIENT_ERROR_EVENT, {
        action,
        error_type: errorType,
        error_code: errorCode,
        http_status: httpStatus,
        page_path: window.location.pathname,
        runtime: 'client',
      });
    };

    const handleConsoleError = (...args: unknown[]) => {
      const candidate = findErrorCandidate(args);
      reportError(candidate, 'console_error', 'ConsoleError');
      if (originalConsoleError) {
        originalConsoleError(...args);
      }
    };

    const handleWindowError = (event: ErrorEvent) => {
      reportError(event.error ?? event.message, 'window_error', 'WindowError');
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      reportError(event.reason, 'unhandled_rejection', 'UnhandledRejection');
    };

    if (!consoleErrorPatched) {
      originalConsoleError = console.error;
      console.error = handleConsoleError;
      consoleErrorPatched = true;
    }

    window.addEventListener('error', handleWindowError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleWindowError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);

      if (consoleErrorPatched && originalConsoleError) {
        console.error = originalConsoleError;
        consoleErrorPatched = false;
      }
    };
  }, [captureEvent, isReady]);

  return null;
}
