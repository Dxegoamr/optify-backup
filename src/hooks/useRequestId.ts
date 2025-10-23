import { useCallback } from 'react';
import { useSentry } from '@/observability/sentry';

/**
 * Hook para gerenciar requestId e correlação de logs
 */
export const useRequestId = () => {
  const { addBreadcrumb, setContext } = useSentry();

  /**
   * Extrai requestId da resposta de uma Cloud Function
   */
  const extractRequestId = useCallback((response: any): string | null => {
    if (response && typeof response === 'object') {
      if ('_requestId' in response) {
        return response._requestId;
      }
      if (response.data && '_requestId' in response.data) {
        return response.data._requestId;
      }
    }
    return null;
  }, []);

  /**
   * Loga uma mensagem com requestId
   */
  const logWithRequestId = useCallback((
    level: 'info' | 'warn' | 'error',
    message: string,
    requestId: string | null,
    data?: any
  ) => {
    const logData = {
      ...data,
      requestId,
      timestamp: new Date().toISOString(),
    };

    // Log no console
    const prefix = `[${requestId || 'no-request-id'}]`;
    switch (level) {
      case 'info':
        console.log(`${prefix} ${message}`, logData);
        break;
      case 'warn':
        console.warn(`${prefix} ${message}`, logData);
        break;
      case 'error':
        console.error(`${prefix} ${message}`, logData);
        break;
    }

    // Adicionar breadcrumb no Sentry
    addBreadcrumb(message, 'request', level);
    
    // Adicionar contexto se houver requestId
    if (requestId) {
      setContext('request', { requestId, ...data });
    }
  }, [addBreadcrumb, setContext]);

  /**
   * Wrapper para chamadas de Cloud Functions com correlação de logs
   */
  const callFunctionWithLogging = useCallback(async <T = any>(
    functionName: string,
    functionCall: () => Promise<any>,
    onSuccess?: (data: T, requestId: string | null) => void,
    onError?: (error: Error, requestId: string | null) => void
  ): Promise<T> => {
    const startTime = Date.now();
    let requestId: string | null = null;

    try {
      logWithRequestId('info', `Calling function: ${functionName}`, null, { functionName });

      const result = await functionCall();
      requestId = extractRequestId(result);

      const duration = Date.now() - startTime;
      logWithRequestId('info', `Function completed: ${functionName}`, requestId, {
        functionName,
        duration,
        success: true,
      });

      if (onSuccess) {
        onSuccess(result.data || result, requestId);
      }

      return result.data || result;
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      logWithRequestId('error', `Function failed: ${functionName}`, requestId, {
        functionName,
        duration,
        success: false,
        error: errorMessage,
      });

      if (onError) {
        onError(error as Error, requestId);
      }

      throw error;
    }
  }, [extractRequestId, logWithRequestId]);

  /**
   * Adiciona requestId ao contexto do Sentry
   */
  const setRequestIdContext = useCallback((requestId: string) => {
    setContext('request', { requestId });
    addBreadcrumb(`Request ID: ${requestId}`, 'request', 'info');
  }, [setContext, addBreadcrumb]);

  return {
    extractRequestId,
    logWithRequestId,
    callFunctionWithLogging,
    setRequestIdContext,
  };
};
