/**
 * Stub do Sentry - Implementação mínima até instalar @sentry/react
 * 
 * Para habilitar Sentry:
 * 1. npm install @sentry/react
 * 2. Renomear sentry-stub.ts → sentry.ts
 * 3. Descomentar imports no main.tsx e contexts
 */

export const initSentry = () => {
  console.log('⚠️ Sentry não configurado - usando stub');
};

export const SentryProvider = ({ children }: { children: React.ReactNode }) => {
  return children;
};

export const useSentry = () => ({
  captureError: (error: Error, context?: Record<string, any>) => {
    console.error('Error:', error, context);
  },
  captureMessage: (message: string, level?: string) => {
    console.log(`[${level}]`, message);
  },
  setUser: (user: any) => {
    console.log('User set:', user);
  },
  addBreadcrumb: (message: string, category?: string, level?: string) => {
    console.log(`[${category}] ${message}`);
  },
  setContext: (key: string, context: any) => {
    console.log(`Context [${key}]:`, context);
  },
  setTag: (key: string, value: string) => {
    console.log(`Tag [${key}]: ${value}`);
  },
});

export const setSentryUser = (user: any) => {
  console.log('Sentry user (stub):', user?.uid);
};

export const captureBusinessEvent = (event: string, data?: Record<string, any>) => {
  console.log('Business event:', event, data);
};

export const capturePerformance = (operation: string, duration: number, success: boolean) => {
  console.log(`Performance [${operation}]:`, { duration, success });
};
