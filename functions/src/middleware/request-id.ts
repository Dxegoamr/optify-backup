import { logger } from 'firebase-functions';
import * as crypto from 'crypto';
import type { Request, Response } from 'express';

/**
 * Gera um requestId único para correlação de logs
 */
export function generateRequestId(): string {
  return crypto.randomUUID();
}

/**
 * Middleware para adicionar requestId a todas as requisições
 */
export function withRequestId(
  handler: (req: Request, res: Response, requestId: string) => Promise<void>
) {
  return async (req: Request, res: Response) => {
    // Gerar ou obter requestId do header
    const requestId = req.get('x-request-id') || generateRequestId();

    // Adicionar ao header de resposta para correlação
    res.setHeader('x-request-id', requestId);

    // TODO: Adicionar breadcrumb no Sentry após instalar @sentry/node
    // try {
    //   const Sentry = await import('../observability/sentry');
    //   Sentry.default.addBreadcrumb({...});
    // } catch (error) {
    //   // Sentry pode não estar configurado
    // }

    // Log inicial da requisição
    logger.info('Request received', {
      requestId,
      method: req.method,
      path: req.path,
      ip: req.ip,
      userAgent: req.header('user-agent'),
    });

    try {
      // Executar handler
      await handler(req, res, requestId);

      // Log de sucesso
      logger.info('Request completed', {
        requestId,
        statusCode: res.statusCode,
      });
    } catch (error) {
      // Log de erro
      logger.error('Request failed', {
        requestId,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });

      throw error;
    }
  };
}

/**
 * Adiciona requestId ao contexto de uma Cloud Function callable
 */
export function withRequestIdCallable<T = any>(
  handler: (data: T, context: any, requestId: string) => Promise<any>
) {
  return async (data: T, context: any) => {
    const requestId = generateRequestId();

    // Log inicial
    logger.info('Callable function invoked', {
      requestId,
      uid: context.auth?.uid,
      email: context.auth?.token?.email,
    });

    // TODO: Adicionar breadcrumb no Sentry após instalar @sentry/node
    // try {
    //   const Sentry = await import('../observability/sentry');
    //   Sentry.default.addBreadcrumb({...});
    // } catch (error) {
    //   // Sentry pode não estar configurado
    // }

    try {
      // Executar handler
      const result = await handler(data, context, requestId);

      // Log de sucesso
      logger.info('Callable function completed', {
        requestId,
        uid: context.auth?.uid,
      });

      // Incluir requestId na resposta
      return {
        ...result,
        _requestId: requestId,
      };
    } catch (error) {
      // Log de erro
      logger.error('Callable function failed', {
        requestId,
        uid: context.auth?.uid,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });

      throw error;
    }
  };
}

/**
 * Extrai requestId de uma resposta de Function callable
 */
export function extractRequestId(response: any): string | null {
  if (response && typeof response === 'object' && '_requestId' in response) {
    return response._requestId;
  }
  return null;
}

/**
 * Propaga requestId em logs no frontend
 */
export function logWithRequestId(
  level: 'info' | 'warn' | 'error',
  message: string,
  requestId: string | null,
  data?: any
): void {
  const logData = {
    ...data,
    requestId,
    timestamp: new Date().toISOString(),
  };

  switch (level) {
    case 'info':
      console.log(`[${requestId}] ${message}`, logData);
      break;
    case 'warn':
      console.warn(`[${requestId}] ${message}`, logData);
      break;
    case 'error':
      console.error(`[${requestId}] ${message}`, logData);
      break;
  }
}
