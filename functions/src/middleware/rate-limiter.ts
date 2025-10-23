import * as admin from 'firebase-admin';
import { logger } from 'firebase-functions';
import type { Request, Response } from 'express';

if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();

interface RateLimitConfig {
  windowMs: number;  // Janela de tempo em ms
  maxRequests: number;  // Máximo de requisições na janela
  message?: string;
  skipSuccessfulRequests?: boolean;
}

interface RateLimitEntry {
  count: number;
  resetTime: admin.firestore.Timestamp;
  firstRequest: admin.firestore.Timestamp;
}

/**
 * Middleware de rate limiting para Cloud Functions
 * Limita o número de requisições por IP em uma janela de tempo
 */
export class RateLimiter {
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.config = {
      windowMs: config.windowMs || 60000, // 1 minuto por padrão
      maxRequests: config.maxRequests || 100, // 100 req/min por padrão
      message: config.message || 'Too many requests, please try again later',
      skipSuccessfulRequests: config.skipSuccessfulRequests || false,
    };
  }

  /**
   * Verifica e aplica rate limit
   */
  async checkRateLimit(req: Request, res: Response): Promise<boolean> {
    try {
      const ip = this.getClientIp(req);
      const key = `ratelimit:${ip}`;

      // Buscar entrada atual
      const docRef = db.collection('rate_limits').doc(key);
      const doc = await docRef.get();

      const now = admin.firestore.Timestamp.now();
      const windowStart = new Date(now.toMillis() - this.config.windowMs);

      if (!doc.exists) {
        // Primeira requisição
        await docRef.set({
          count: 1,
          resetTime: now,
          firstRequest: now,
        });
        return true;
      }

      const data = doc.data() as RateLimitEntry;
      const resetTime = data.resetTime.toDate();

      // Verificar se a janela expirou
      if (resetTime < windowStart) {
        // Resetar contador
        await docRef.set({
          count: 1,
          resetTime: now,
          firstRequest: now,
        });
        return true;
      }

      // Verificar se excedeu o limite
      if (data.count >= this.config.maxRequests) {
        const retryAfter = Math.ceil((resetTime.getTime() - Date.now()) / 1000);
        
        logger.warn('Rate limit exceeded', {
          ip,
          count: data.count,
          limit: this.config.maxRequests,
          retryAfter,
        });

        res.status(429).json({
          error: 'Too Many Requests',
          message: this.config.message,
          retryAfter,
        });

        // Registrar tentativa de abuso
        await this.logAbuse(ip, data.count);

        return false;
      }

      // Incrementar contador
      await docRef.update({
        count: admin.firestore.FieldValue.increment(1),
      });

      return true;
    } catch (error) {
      logger.error('Erro no rate limiter:', error);
      // Em caso de erro, permitir a requisição (fail-open)
      return true;
    }
  }

  /**
   * Obter IP do cliente
   */
  private getClientIp(req: Request): string {
    // Headers comuns de proxy
    const forwarded = req.headers['x-forwarded-for'] as string;
    const realIp = req.headers['x-real-ip'] as string;
    const cloudflareIp = req.headers['cf-connecting-ip'] as string;

    if (cloudflareIp) return cloudflareIp;
    if (realIp) return realIp;
    if (forwarded) return forwarded.split(',')[0].trim();
    
    return req.ip || 'unknown';
  }

  /**
   * Registrar tentativa de abuso
   */
  private async logAbuse(ip: string, requestCount: number): Promise<void> {
    try {
      await db.collection('abuse_logs').add({
        ip,
        requestCount,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        type: 'rate_limit_exceeded',
      });
    } catch (error) {
      logger.error('Erro ao registrar abuso:', error);
    }
  }

  /**
   * Limpar entradas antigas (executar periodicamente)
   */
  static async cleanup(): Promise<void> {
    try {
      const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 horas atrás
      const cutoffTimestamp = admin.firestore.Timestamp.fromDate(cutoff);

      const snapshot = await db.collection('rate_limits')
        .where('resetTime', '<', cutoffTimestamp)
        .limit(500)
        .get();

      if (snapshot.empty) {
        logger.info('Nenhuma entrada antiga de rate limit para limpar');
        return;
      }

      const batch = db.batch();
      snapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });

      await batch.commit();
      logger.info(`Limpeza de rate limits: ${snapshot.size} entradas removidas`);
    } catch (error) {
      logger.error('Erro na limpeza de rate limits:', error);
    }
  }
}

/**
 * Configurações pré-definidas de rate limit
 */
export const RateLimitPresets = {
  // Limite muito restritivo (APIs de pagamento, admin)
  STRICT: {
    windowMs: 60000, // 1 minuto
    maxRequests: 10,  // 10 req/min
    message: 'Too many requests. Please wait before trying again.',
  },

  // Limite moderado (webhooks, endpoints públicos)
  MODERATE: {
    windowMs: 60000, // 1 minuto
    maxRequests: 60,  // 60 req/min (1 req/s)
    message: 'Request limit exceeded. Please slow down.',
  },

  // Limite permissivo (leituras, endpoints internos)
  PERMISSIVE: {
    windowMs: 60000, // 1 minuto
    maxRequests: 300, // 300 req/min (5 req/s)
    message: 'Rate limit exceeded.',
  },
};

/**
 * Helper para aplicar rate limit em uma Function
 */
export const withRateLimit = (
  config: RateLimitConfig,
  handler: (req: Request, res: Response) => Promise<void>
) => {
  const limiter = new RateLimiter(config);

  return async (req: Request, res: Response) => {
    const allowed = await limiter.checkRateLimit(req, res);
    
    if (!allowed) {
      return; // Resposta já foi enviada pelo checkRateLimit
    }

    await handler(req, res);
  };
};

/**
 * Verificar se um IP está na blacklist
 */
export async function isBlacklisted(ip: string): Promise<boolean> {
  try {
    const doc = await db.collection('ip_blacklist').doc(ip).get();
    
    if (!doc.exists) {
      return false;
    }

    const data = doc.data();
    const expiresAt = data?.expiresAt?.toDate();

    // Verificar se o ban expirou
    if (expiresAt && expiresAt < new Date()) {
      // Remover da blacklist
      await doc.ref.delete();
      return false;
    }

    return true;
  } catch (error) {
    logger.error('Erro ao verificar blacklist:', error);
    return false;
  }
}

/**
 * Adicionar IP à blacklist
 */
export async function blacklistIp(
  ip: string,
  reason: string,
  durationMs: number = 24 * 60 * 60 * 1000 // 24 horas por padrão
): Promise<void> {
  try {
    const expiresAt = new Date(Date.now() + durationMs);

    await db.collection('ip_blacklist').doc(ip).set({
      ip,
      reason,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      expiresAt: admin.firestore.Timestamp.fromDate(expiresAt),
    });

    logger.warn('IP adicionado à blacklist', { ip, reason, expiresAt });
  } catch (error) {
    logger.error('Erro ao adicionar IP à blacklist:', error);
  }
}

/**
 * Verificar se App Check é válido
 */
export function verifyAppCheck(req: Request): boolean {
  // Verificar se o token App Check está presente
  const appCheckToken = req.header('X-Firebase-AppCheck');
  
  if (!appCheckToken) {
    logger.warn('Requisição sem App Check token', {
      ip: req.ip,
      path: req.path,
      method: req.method,
    });
    return false;
  }

  // A verificação real do token é feita pelo Firebase automaticamente
  // quando a function é configurada com enforceAppCheck: true
  return true;
}
