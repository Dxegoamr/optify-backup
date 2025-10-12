import { onSchedule } from 'firebase-functions/v2/scheduler';
import { logger } from 'firebase-functions';
import { RateLimiter } from '../middleware/rate-limiter';
import * as admin from 'firebase-admin';

if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();

/**
 * Limpa rate limits antigos diariamente às 3h
 */
export const cleanupRateLimits = onSchedule(
  {
    schedule: '0 3 * * *', // Todo dia às 3h da manhã
    timeZone: 'America/Sao_Paulo',
    memory: '256MiB',
  },
  async () => {
    try {
      logger.info('Iniciando limpeza de rate limits');
      await RateLimiter.cleanup();
      logger.info('Limpeza de rate limits concluída');
    } catch (error) {
      logger.error('Erro na limpeza de rate limits:', error);
    }
  }
);

/**
 * Limpa logs de abuso antigos semanalmente
 */
export const cleanupAbuseLogs = onSchedule(
  {
    schedule: '0 4 * * 0', // Todo domingo às 4h da manhã
    timeZone: 'America/Sao_Paulo',
    memory: '512MiB',
  },
  async () => {
    try {
      logger.info('Iniciando limpeza de logs de abuso');
      
      const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 dias atrás
      const cutoffTimestamp = admin.firestore.Timestamp.fromDate(cutoff);

      const snapshot = await db.collection('abuse_logs')
        .where('timestamp', '<', cutoffTimestamp)
        .limit(1000)
        .get();

      if (snapshot.empty) {
        logger.info('Nenhum log de abuso antigo para limpar');
        return;
      }

      const batch = db.batch();
      snapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });

      await batch.commit();
      logger.info(`Limpeza de abuse logs: ${snapshot.size} entradas removidas`);
    } catch (error) {
      logger.error('Erro na limpeza de abuse logs:', error);
    }
  }
);

/**
 * Limpa blacklist expirados diariamente
 */
export const cleanupBlacklist = onSchedule(
  {
    schedule: '0 3 * * *', // Todo dia às 3h da manhã
    timeZone: 'America/Sao_Paulo',
    memory: '256MiB',
  },
  async () => {
    try {
      logger.info('Iniciando limpeza de blacklist');
      
      const now = admin.firestore.Timestamp.now();

      const snapshot = await db.collection('ip_blacklist')
        .where('expiresAt', '<', now)
        .limit(500)
        .get();

      if (snapshot.empty) {
        logger.info('Nenhum IP expirado na blacklist');
        return;
      }

      const batch = db.batch();
      snapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });

      await batch.commit();
      logger.info(`Limpeza de blacklist: ${snapshot.size} IPs removidos`);
    } catch (error) {
      logger.error('Erro na limpeza de blacklist:', error);
    }
  }
);

/**
 * Limpa eventos de webhook antigos
 */
export const cleanupWebhookEvents = onSchedule(
  {
    schedule: '0 5 * * *', // Todo dia às 5h da manhã
    timeZone: 'America/Sao_Paulo',
    memory: '512MiB',
  },
  async () => {
    try {
      logger.info('Iniciando limpeza de eventos de webhook');
      
      const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000); // 90 dias atrás
      const cutoffTimestamp = admin.firestore.Timestamp.fromDate(cutoff);

      const snapshot = await db.collection('payments_events')
        .where('timestamp', '<', cutoffTimestamp)
        .limit(1000)
        .get();

      if (snapshot.empty) {
        logger.info('Nenhum evento de webhook antigo para limpar');
        return;
      }

      const batch = db.batch();
      snapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });

      await batch.commit();
      logger.info(`Limpeza de webhook events: ${snapshot.size} eventos removidos`);
    } catch (error) {
      logger.error('Erro na limpeza de webhook events:', error);
    }
  }
);

/**
 * Limpa chaves de idempotência antigas
 */
export const cleanupIdempotency = onSchedule(
  {
    schedule: '0 6 * * *', // Todo dia às 6h da manhã
    timeZone: 'America/Sao_Paulo',
    memory: '256MiB',
  },
  async () => {
    try {
      logger.info('Iniciando limpeza de chaves de idempotência');
      
      const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 dias atrás
      const cutoffTimestamp = admin.firestore.Timestamp.fromDate(cutoff);

      const snapshot = await db.collection('idempotency')
        .where('timestamp', '<', cutoffTimestamp)
        .limit(1000)
        .get();

      if (snapshot.empty) {
        logger.info('Nenhuma chave de idempotência antiga para limpar');
        return;
      }

      const batch = db.batch();
      snapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });

      await batch.commit();
      logger.info(`Limpeza de idempotency: ${snapshot.size} chaves removidas`);
    } catch (error) {
      logger.error('Erro na limpeza de idempotency:', error);
    }
  }
);
