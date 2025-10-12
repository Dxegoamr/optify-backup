import * as Sentry from '@sentry/node';
import * as admin from 'firebase-admin';

// Configuração do Sentry para Cloud Functions
export const initSentry = () => {
  const dsn = process.env.SENTRY_DSN;
  
  if (!dsn) {
    console.warn('Sentry DSN não configurado para Functions');
    return;
  }

  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV || 'development',
    release: process.env.APP_VERSION || '1.0.0',
    
    // Performance monitoring
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    
    // Integrations específicas para Node.js
    integrations: [
      Sentry.httpIntegration(),
      Sentry.expressIntegration(),
    ],
    
    // Configurações específicas para Cloud Functions
    beforeSend(event) {
      // Filtrar eventos conhecidos
      if (event.exception) {
        const error = event.exception.values?.[0];
        if (error?.type === 'FunctionError' && error?.value?.includes('Function execution took')) {
          // Ignorar erros de timeout conhecidos
          return null;
        }
      }
      
      return event;
    },
  });

  // Configurar contexto global
  Sentry.setTag('app', 'optify');
  Sentry.setTag('platform', 'cloud-functions');
  Sentry.setTag('runtime', 'nodejs');
  
  console.log('✅ Sentry inicializado para Cloud Functions');
};

// Wrapper para capturar erros em Functions
export const withSentry = (handler: Function) => {
  return async (req: any, res: any) => {
    try {
      // Adicionar contexto da requisição
      Sentry.setContext('function', {
        name: handler.name,
        method: req.method,
        url: req.url,
        userAgent: req.headers['user-agent'],
      });

      // Adicionar breadcrumb
      Sentry.addBreadcrumb({
        message: `Function ${handler.name} called`,
        category: 'function',
        level: 'info',
      });

      await handler(req, res);
    } catch (error) {
      console.error(`Erro na function ${handler.name}:`, error);
      
      Sentry.captureException(error, {
        tags: {
          function: handler.name,
        },
        extra: {
          request: {
            method: req.method,
            url: req.url,
            headers: req.headers,
          },
        },
      });

      // Resposta de erro padrão
      if (!res.headersSent) {
        res.status(500).json({
          error: 'Internal Server Error',
          message: process.env.NODE_ENV === 'development' ? error.message : 'Erro interno do servidor',
        });
      }
    }
  };
};

// Função para capturar eventos de negócio
export const captureBusinessEvent = (event: string, data?: Record<string, any>) => {
  Sentry.addBreadcrumb({
    message: event,
    category: 'business',
    level: 'info',
    data,
  });
};

// Função para capturar performance de operações
export const capturePerformance = (operation: string, duration: number, success: boolean) => {
  Sentry.addBreadcrumb({
    message: `Performance: ${operation}`,
    category: 'performance',
    level: success ? 'info' : 'warning',
    data: {
      operation,
      duration,
      success,
    },
  });
};

// Função para capturar erros de webhook
export const captureWebhookError = (webhookType: string, error: any, payload?: any) => {
  Sentry.captureException(error, {
    tags: {
      webhook: webhookType,
      source: 'webhook',
    },
    extra: {
      webhookType,
      payload,
    },
  });
};

// Função para capturar erros de autenticação
export const captureAuthError = (operation: string, error: any, userId?: string) => {
  Sentry.captureException(error, {
    tags: {
      operation,
      source: 'auth',
    },
    user: userId ? { id: userId } : undefined,
    extra: {
      operation,
      userId,
    },
  });
};

// Função para capturar erros de banco de dados
export const captureDatabaseError = (operation: string, error: any, collection?: string) => {
  Sentry.captureException(error, {
    tags: {
      operation,
      source: 'database',
      collection: collection || 'unknown',
    },
    extra: {
      operation,
      collection,
    },
  });
};

// Função para capturar erros de pagamento
export const capturePaymentError = (operation: string, error: any, paymentData?: any) => {
  Sentry.captureException(error, {
    tags: {
      operation,
      source: 'payment',
    },
    extra: {
      operation,
      paymentData: paymentData ? {
        amount: paymentData.amount,
        currency: paymentData.currency,
        status: paymentData.status,
      } : undefined,
    },
  });
};

// Função para configurar contexto do usuário
export const setSentryUser = (user: admin.auth.UserRecord | null) => {
  if (user) {
    Sentry.setUser({
      id: user.uid,
      email: user.email,
      username: user.displayName,
    });
  } else {
    Sentry.setUser(null);
  }
};

// Função para capturar métricas customizadas
export const captureMetric = (name: string, value: number, tags?: Record<string, string>) => {
  Sentry.addBreadcrumb({
    message: `Metric: ${name}`,
    category: 'metric',
    level: 'info',
    data: {
      name,
      value,
      tags,
    },
  });
};

export default Sentry;
