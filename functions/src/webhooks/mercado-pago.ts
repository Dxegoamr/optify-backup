import * as crypto from 'crypto';
import { onRequest } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { logger } from 'firebase-functions';
import * as admin from 'firebase-admin';
import { RateLimiter, RateLimitPresets, isBlacklisted, blacklistIp } from '../middleware/rate-limiter';

if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();

// Variáveis de ambiente
const MP_API = 'https://api.mercadopago.com';
const MP_WEBHOOK_SECRET = process.env.MERCADO_PAGO_WEBHOOK_SECRET || '';

type PlanId = 'free' | 'standard' | 'medium' | 'ultimate';

const PLANOS: Record<PlanId, {
  nome: string;
  preco_mensal: number;
  preco_anual: number;
  max_funcionarios: number;
}> = {
  free: { nome: 'Free', preco_mensal: 0, preco_anual: 0, max_funcionarios: 1 },
  standard: { nome: 'Standard', preco_mensal: 1, preco_anual: 10.20, max_funcionarios: 5 },
  medium: { nome: 'Medium', preco_mensal: 49.90, preco_anual: 509.16, max_funcionarios: 10 },
  ultimate: { nome: 'Ultimate', preco_mensal: 99.90, preco_anual: 1018.32, max_funcionarios: 50 },
};

/**
 * Verifica a assinatura HMAC do webhook do Mercado Pago
 */
function verifyHmac(signature: string, rawBody: string, secret: string): boolean {
  if (!signature || !secret || !rawBody) {
    return false;
  }

  try {
    // Mercado Pago usa formato: ts=timestamp,v1=hash
    const parts = signature.split(',');
    let hash = '';
    
    for (const part of parts) {
      if (part.startsWith('v1=')) {
        hash = part.substring(3);
        break;
      }
    }

    if (!hash) {
      return false;
    }

    const expectedHash = crypto
      .createHmac('sha256', secret)
      .update(rawBody)
      .digest('hex');

    return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(expectedHash));
  } catch (error) {
    logger.error('Erro ao verificar assinatura HMAC:', error);
    return false;
  }
}

/**
 * Verifica se um evento já foi processado (idempotência)
 */
async function alreadyProcessed(idemKey: string): Promise<boolean> {
  try {
    const doc = await db.collection('idempotency').doc(idemKey).get();
    return doc.exists && doc.data()?.processed === true;
  } catch (error) {
    logger.error('Erro ao verificar idempotência:', error);
    return false;
  }
}

/**
 * Marca um evento como processado
 */
async function markProcessed(idemKey: string, eventData: any): Promise<void> {
  try {
    await db.collection('idempotency').doc(idemKey).set({
      processed: true,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      eventData: eventData,
    });
  } catch (error) {
    logger.error('Erro ao marcar evento como processado:', error);
  }
}

/**
 * Busca dados do pagamento via API do Mercado Pago (server-to-server)
 */
async function fetchPaymentFromAPI(paymentId: string): Promise<any> {
  const MP_ACCESS_TOKEN = process.env.MERCADO_PAGO_ACCESS_TOKEN;
  
  if (!MP_ACCESS_TOKEN) {
    throw new Error('MERCADO_PAGO_ACCESS_TOKEN não configurado');
  }

  try {
    const response = await fetch(`${MP_API}/v1/payments/${paymentId}`, {
      headers: {
        'Authorization': `Bearer ${MP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Erro na API do Mercado Pago: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    logger.error('Erro ao buscar pagamento na API:', error);
    throw error;
  }
}

/**
 * Salva o evento bruto do webhook para auditoria
 */
async function saveRawEvent(eventId: string, type: string, data: any): Promise<void> {
  try {
    await db.collection('payments_events').doc(eventId).set({
      eventId,
      type,
      data,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      processed: false,
    });
  } catch (error) {
    logger.error('Erro ao salvar evento bruto:', error);
  }
}

/**
 * Aplica os efeitos de negócio baseado no status do pagamento
 */
async function applyBusinessEffects(paymentData: any): Promise<void> {
  const status = paymentData.status;
  const email = paymentData.metadata?.user_email || paymentData.payer?.email;
  const planId = paymentData.metadata?.plan_id || 'standard';
  const billingType = paymentData.metadata?.billing_type || 'monthly';
  const externalReference = paymentData.external_reference;

  logger.info('Aplicando efeitos de negócio', {
    status,
    email,
    planId,
    billingType,
    externalReference,
  });

  // Atualizar transação
  if (externalReference) {
    const txSnap = await db.collection('transactions_plans')
      .where('externalReference', '==', externalReference)
      .limit(1)
      .get();
    
    if (!txSnap.empty) {
      const ref = txSnap.docs[0].ref;
      await ref.update({
        status: status === 'approved' ? 'completed' : status,
        paymentMethod: paymentData.payment_type_id,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      logger.info('Transação atualizada', { externalReference, status });
    }
  }

  // Se pagamento aprovado, atualizar plano do usuário
  if (status === 'approved' && email) {
    await updateUserPlan(email, planId, billingType, paymentData);
  }

  // Log de auditoria
  await logAuditEvent('payment_processed', {
    paymentId: paymentData.id,
    email,
    planId,
    billingType,
    status,
    amount: paymentData.transaction_amount,
  });
}

/**
 * Atualiza o plano do usuário após pagamento aprovado
 */
async function updateUserPlan(email: string, planId: string, billingType: string, paymentData: any): Promise<void> {
  try {
    const plan = PLANOS[planId as PlanId];
    if (!plan) {
      throw new Error(`Plano inválido: ${planId}`);
    }

    // Calcular data de expiração
    const startDate = new Date();
    const endDate = new Date(startDate);
    
    if (billingType === 'monthly') {
      endDate.setMonth(endDate.getMonth() + 1);
    } else if (billingType === 'annual') {
      endDate.setFullYear(endDate.getFullYear() + 1);
    }

    const userUpdateData = {
      email: email.toLowerCase(),
      plano: planId,
      periodo: billingType,
      isActive: true,
      isSubscriber: true,
      subscription: {
        plan: planId,
        period: billingType,
        active: true,
        updatedAt: new Date(),
        expiresAt: endDate,
        paymentId: paymentData.id,
      },
      subscriptionStartDate: startDate,
      subscriptionEndDate: endDate,
      funcionariosPermitidos: plan.max_funcionarios,
      atualizadoEm: new Date(),
    };

    // Buscar usuário pelo email
    const usersSnap = await db
      .collection('users')
      .where('email', '==', email.toLowerCase())
      .get();

    if (!usersSnap.empty) {
      // Atualizar todos os documentos com o mesmo email
      const batch = db.batch();
      usersSnap.docs.forEach((doc) => {
        batch.set(doc.ref, userUpdateData, { merge: true });
      });
      await batch.commit();

      logger.info('Plano do usuário atualizado', {
        email,
        planId,
        billingType,
        expiresAt: endDate,
      });
    } else {
      logger.warn('Usuário não encontrado para atualização de plano', { email });
    }
  } catch (error) {
    logger.error('Erro ao atualizar plano do usuário:', error);
    throw error;
  }
}

/**
 * Registra evento de auditoria
 */
async function logAuditEvent(action: string, details: any): Promise<void> {
  try {
    await db.collection('audit_logs').add({
      action,
      details,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      source: 'webhook_mercado_pago',
    });
  } catch (error) {
    logger.error('Erro ao registrar evento de auditoria:', error);
  }
}

/**
 * Lidar com abuso de rate limit
 */
async function handleRateLimitAbuse(ip: string): Promise<void> {
  try {
    // Buscar violações recentes
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    const cutoffTimestamp = admin.firestore.Timestamp.fromDate(tenMinutesAgo);

    const abuseLogs = await db.collection('abuse_logs')
      .where('ip', '==', ip)
      .where('timestamp', '>=', cutoffTimestamp)
      .get();

    // Se houver 3+ violações em 10 minutos, adicionar à blacklist
    if (abuseLogs.size >= 3) {
      await blacklistIp(
        ip,
        `Rate limit exceeded ${abuseLogs.size} times in 10 minutes`,
        24 * 60 * 60 * 1000 // Banir por 24 horas
      );

      logger.warn('IP adicionado à blacklist por abuso', {
        ip,
        violations: abuseLogs.size,
      });
    }
  } catch (error) {
    logger.error('Erro ao processar abuso de rate limit:', error);
  }
}

/**
 * Webhook principal do Mercado Pago com verificação de assinatura e idempotência
 */
export const mercadoPagoWebhook = onRequest(
  {
    memory: '512MiB',
    timeoutSeconds: 60,
  },
  async (req, res) => {
    try {
      // 1. Verificar método HTTP
      if (req.method !== 'POST') {
        res.status(405).send('Method Not Allowed');
        return;
      }

      // 2. Verificar blacklist
      const clientIp = req.headers['x-forwarded-for'] as string || req.ip || 'unknown';
      const isBlocked = await isBlacklisted(clientIp);
      
      if (isBlocked) {
        logger.warn('Requisição bloqueada - IP na blacklist', { ip: clientIp });
        res.status(403).send('Forbidden');
        return;
      }

      // 3. Aplicar rate limiting (moderado para webhooks)
      const limiter = new RateLimiter(RateLimitPresets.MODERATE);
      const allowed = await limiter.checkRateLimit(req, res);
      
      if (!allowed) {
        // Adicionar à blacklist após 3 violações em 10 minutos
        await handleRateLimitAbuse(clientIp);
        return; // Resposta já foi enviada
      }

      // Verificar assinatura HMAC
      const signature = req.header('x-signature') || '';
      const rawBody = JSON.stringify(req.body);
      
      if (!verifyHmac(signature, rawBody, MP_WEBHOOK_SECRET)) {
        logger.warn('Webhook com assinatura inválida', { signature });
        res.status(401).send('Unauthorized');
        return;
      }

      const { id, type, action } = req.body;
      
      logger.info('Webhook recebido', { id, type, action });

      // Ignorar merchant_order (não tem dados úteis)
      if (type === 'merchant_order') {
        res.status(200).send('ok');
        return;
      }

      // Processar apenas webhooks de pagamento
      if (type === 'payment' || (action && action.startsWith('payment.'))) {
        const paymentId = id;
        
        if (!paymentId) {
          res.status(400).send('Payment ID missing');
          return;
        }

        // Verificar idempotência
        const idemKey = `mp:${paymentId}`;
        if (await alreadyProcessed(idemKey)) {
          logger.info('Evento já processado (idempotência)', { paymentId });
          res.status(200).send('already_processed');
          return;
        }

        // Buscar dados do pagamento via API (server-to-server)
        const paymentData = await fetchPaymentFromAPI(paymentId);
        
        // Salvar evento bruto para auditoria
        await saveRawEvent(paymentId, type, paymentData);
        
        // Aplicar efeitos de negócio
        await applyBusinessEffects(paymentData);
        
        // Marcar como processado
        await markProcessed(idemKey, { paymentId, type, status: paymentData.status });
        
        logger.info('Webhook processado com sucesso', { paymentId, status: paymentData.status });
      }

      res.status(200).send('ok');
    } catch (error) {
      logger.error('Erro no webhook do Mercado Pago:', error);
      res.status(500).send('Internal Server Error');
    }
  }
);

/**
 * Reconciliador diário para verificar divergências
 */
export const reconcilePayments = onSchedule(
  {
    schedule: '0 2 * * *', // Todo dia às 2h da manhã
    timeZone: 'America/Sao_Paulo',
    memory: '1GiB',
  },
  async () => {
    try {
      logger.info('Iniciando reconciliação de pagamentos');
      
      // Buscar transações pendentes das últimas 24h
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      
      const pendingTx = await db.collection('transactions_plans')
        .where('status', '==', 'pending')
        .where('createdAt', '>=', yesterday)
        .get();

      logger.info(`Encontradas ${pendingTx.size} transações pendentes para reconciliação`);

      for (const txDoc of pendingTx.docs) {
        const txData = txDoc.data();
        const paymentId = txData.transactionId;
        
        if (!paymentId) continue;

        try {
          // Buscar status atual no Mercado Pago
          const paymentData = await fetchPaymentFromAPI(paymentId);
          
          // Atualizar status se necessário
          if (paymentData.status !== 'pending') {
            await txDoc.ref.update({
              status: paymentData.status === 'approved' ? 'completed' : paymentData.status,
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            
            // Aplicar efeitos se aprovado
            if (paymentData.status === 'approved') {
              await applyBusinessEffects(paymentData);
            }
            
            logger.info('Transação reconciliada', { paymentId, status: paymentData.status });
          }
        } catch (error) {
          logger.error('Erro ao reconciliar transação:', { paymentId, error });
        }
      }

      logger.info('Reconciliação de pagamentos concluída');
    } catch (error) {
      logger.error('Erro na reconciliação de pagamentos:', error);
    }
  }
);
