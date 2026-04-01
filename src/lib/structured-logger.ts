/**
 * Structured JSON logger for pipeline monitoring.
 * Outputs JSON lines to stdout/stderr for Vercel log ingestion.
 */

type LogLevel = 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  component: string;
  message: string;
  timestamp: string;
  [key: string]: unknown;
}

function emit(level: LogLevel, component: string, message: string, data?: Record<string, unknown>) {
  const entry: LogEntry = {
    level,
    component,
    message,
    timestamp: new Date().toISOString(),
    ...data,
  };
  const line = JSON.stringify(entry);
  if (level === 'error') {
    console.error(line);
  } else {
    console.log(line);
  }
}

export function createLogger(component: string) {
  return {
    info: (message: string, data?: Record<string, unknown>) => emit('info', component, message, data),
    warn: (message: string, data?: Record<string, unknown>) => emit('warn', component, message, data),
    error: (message: string, error?: unknown, data?: Record<string, unknown>) => {
      const errorData: Record<string, unknown> = { ...data };
      if (error instanceof Error) {
        errorData.errorName = error.name;
        errorData.errorMessage = error.message;
        errorData.stack = error.stack;
      } else if (error !== undefined) {
        errorData.errorRaw = String(error);
      }
      emit('error', component, message, errorData);
    },
  };
}
