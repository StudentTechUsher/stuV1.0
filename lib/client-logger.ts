import posthog from 'posthog-js';

type LogLevel = 'info' | 'warn' | 'error';

interface LogContext {
    action?: string;      // e.g., 'submit_form', 'upload_file'
    errorCode?: string;   // Application specific error codes
    errorType?: string;   // Error class names
    count?: number;
    duration?: number;
    status?: string;
    httpStatus?: number;
    byteCount?: number;
    [key: string]: unknown; // Allow other properties but warn about PII in docs
}

/**
 * Client-side logging utility that mirrors the server-side logger.
 * Wraps console methods and ensures structured data is sent to PostHog.
 */
export const clientLogger = {
    /**
     * Log info message and optional capture using console.info
     */
    info: (message: string, context?: LogContext) => {
        console.info(message, context);
        // Info logs are typically not sent to PostHog to save quota, 
        // unless specifically needed for tracking non-error flows.
        // Uncomment if we want to track specific info events:
        // if (context?.action) {
        //   posthog.capture('client_info', { message, ...context });
        // }
    },

    /**
     * Log warning message and capture using console.warn
     */
    warn: (message: string, context?: LogContext) => {
        console.warn(message, context);
        if (context?.action) {
            posthog.capture('client_warn', {
                message,
                ...context,
                level: 'warn'
            });
        }
    },

    /**
     * Log error message and capture using console.error
     * Note: The global ClientErrorCapture component in layout.tsx will ALSO capture this
     * if we let it bubble up or if it patches console.error.
     * 
     * However, using this method allows us to attach explicit metadata (context)
     * that the global handler might miss.
     */
    error: (message: string, error?: unknown, context?: LogContext) => {
        // We log to console.error so it shows up in browser devtools
        // and potentially gets caught by the global patch if active.
        console.error(message, error, context);

        // We explicitly capture here to ensure rich metadata is attached
        // This might result in double capture if the global patch also catches it,
        // but the global patch usually catches uncaught exceptions or generic console.errors.
        // By using a distinct event name or properties, we can differentiate.

        let errorDetails = {};
        if (error instanceof Error) {
            errorDetails = {
                error_name: error.name,
                error_message: error.message,
                error_stack: error.stack,
            };
        } else if (typeof error === 'object' && error !== null) {
            errorDetails = { ...error };
        } else if (typeof error === 'string') {
            errorDetails = { error_message: error };
        }

        if (context?.action) {
            posthog.capture('client_error_explicit', {
                message,
                ...errorDetails,
                ...context,
                level: 'error',
            });
        }
    }
};
