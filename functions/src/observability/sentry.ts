/**
 * Stub do Sentry para Cloud Functions
 * TODO: Instalar @sentry/node e descomentar implementação real
 */

export const initSentry = () => {
  console.log('⚠️ Sentry não configurado (stub) - instalar @sentry/node');
};

export const withSentry = (handler: Function) => handler;

export const captureBusinessEvent = (event: string, data?: Record<string, any>) => {
  console.log('Business event (stub):', event, data);
};

export const capturePerformance = (operation: string, duration: number, success: boolean) => {
  console.log(`Performance (stub) [${operation}]:`, { duration, success });
};

export const captureWebhookError = (webhookType: string, error: any, payload?: any) => {
  console.error('Webhook error (stub):', webhookType, error);
};

export const captureAuthError = (operation: string, error: any, userId?: string) => {
  console.error('Auth error (stub):', operation, error, userId);
};

export const captureDatabaseError = (operation: string, error: any, collection?: string) => {
  console.error('Database error (stub):', operation, error, collection);
};

export const capturePaymentError = (operation: string, error: any, paymentData?: any) => {
  console.error('Payment error (stub):', operation, error);
};

export const setSentryUser = (user: any) => {
  console.log('Sentry user (stub):', user?.uid);
};

export const captureMetric = (name: string, value: number, tags?: Record<string, string>) => {
  console.log(`Metric (stub) [${name}]:`, value, tags);
};

const Sentry = {
  addBreadcrumb: (data: any) => console.log('Breadcrumb (stub):', data),
  captureException: (error: any, context?: any) => console.error('Exception (stub):', error, context),
  setUser: (user: any) => console.log('Set user (stub):', user),
  setTag: (key: string, value: string) => console.log(`Tag (stub) [${key}]:`, value),
  setContext: (key: string, context: any) => console.log(`Context (stub) [${key}]:`, context),
};

export default Sentry;
