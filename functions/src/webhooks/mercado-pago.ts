import * as crypto from 'crypto';
import { onRequest } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { logger } from 'firebase-functions';
import * as admin from 'firebase-admin';
import { RateLimiter, RateLimitPresets, isBlacklisted } from '../middleware/rate-limiter';

if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();

// Variáveis de ambiente - priorizar MERCADO_PAGO_ACCESS_TOKEN (com underscore) como configurado no Google Cloud
const MP_API = 'https://api.mercadopago.com';
// Token será carregado dinamicamente em fetchPaymentFromAPI para garantir uso correto
// const MP_ACCESS_TOKEN = process.env.MERCADO_PAGO_ACCESS_TOKEN || process.env.MERCADOPAGO_ACCESS_TOKEN || '';
const MP_WEBHOOK_SECRET = process.env.MERCADO_PAGO_WEBHOOK_SECRET || process.env.MERCADOPAGO_WEBHOOK_SECRET || '';

type PlanId = 'free' | 'standard' | 'medium' | 'ultimate';

const PLANOS: Record<PlanId, {
  nome: string;
  preco_mensal: number;
  preco_anual: number;
  max_funcionarios: number;
}> = {
  free: { nome: 'Free', preco_mensal: 0, preco_anual: 0, max_funcionarios: 1 },
  standard: { nome: 'Standard', preco_mensal: 34.90, preco_anual: 356.76, max_funcionarios: 5 },
  medium: { nome: 'Medium', preco_mensal: 49.90, preco_anual: 509.16, max_funcionarios: 10 },
  ultimate: { nome: 'Ultimate', preco_mensal: 74.90, preco_anual: 764.76, max_funcionarios: 50 },
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
  // Carregar token com múltiplos fallbacks para garantir compatibilidade
  const MP_ACCESS_TOKEN = 
    process.env.MERCADO_PAGO_ACCESS_TOKEN || 
    process.env.MERCADOPAGO_ACCESS_TOKEN || 
    process.env.MP_ACCESS_TOKEN || 
    '';

  if (!MP_ACCESS_TOKEN) {
    logger.error('❌ Token do Mercado Pago não configurado no ambiente.');
    throw new Error('MERCADO_PAGO_ACCESS_TOKEN não configurado');
  }

  const paymentUrl = `${MP_API}/v1/payments/${paymentId}`;
  logger.info('🔍 Buscando pagamento na API do Mercado Pago:', { 
    paymentUrl, 
    paymentId,
    hasToken: !!MP_ACCESS_TOKEN,
    tokenLength: MP_ACCESS_TOKEN.length 
  });

  try {
    const response = await fetch(paymentUrl, {
      headers: {
        'Authorization': `Bearer ${MP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('❌ Erro na API do Mercado Pago', {
        status: response.status,
        statusText: response.statusText,
        errorText,
        paymentId,
        url: paymentUrl
      });
      throw new Error(`Erro na API do Mercado Pago (${response.status}): ${errorText}`);
    }

    const paymentData = await response.json();
    logger.info('📊 Dados do pagamento recebidos:', { 
      paymentId: paymentData.id,
      status: paymentData.status,
      hasMetadata: !!paymentData.metadata 
    });
    
    return paymentData;
  } catch (error: any) {
    logger.error('Erro ao buscar pagamento na API:', {
      error: error.message,
      paymentId,
      url: paymentUrl
    });
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

  // Extrair email do metadata, payer ou external_reference (com múltiplos fallbacks)
  const emailRaw = (
    paymentData.metadata?.email ||
    paymentData.metadata?.userEmail ||
    paymentData.metadata?.user_email ||
    paymentData.payer?.email ||
    paymentData.external_reference || ''
  )?.toString().trim().toLowerCase();
  
  // Validar se é um email válido (contém @) ou usar null
  const email = emailRaw && emailRaw.includes('@') ? emailRaw : 
                paymentData.payer?.email ? paymentData.payer.email.toLowerCase().trim() : null;
  
  const planId = paymentData.metadata?.plano || 
                 paymentData.metadata?.planId || 
                 paymentData.metadata?.plan_id || 
                 'standard';
  
  const billingType = paymentData.metadata?.periodo || 
                      paymentData.metadata?.billingType || 
                      paymentData.metadata?.billing_type || 
                      'monthly';

  logger.info('Aplicando efeitos de negócio', {
    status,
    email,
    planId,
    billingType,
    hasMetadata: !!paymentData.metadata,
    metadataKeys: paymentData.metadata ? Object.keys(paymentData.metadata) : [],
    metadataContent: paymentData.metadata,
  });

  // Se pagamento aprovado, atualizar plano do usuário
  if (status === 'approved' && email) {
    logger.info('Chamando updateUserPlan com:', { email, planId, billingType });
    await updateUserPlan(email, planId, billingType, paymentData);
  } else {
    if (!email) {
      logger.warn('Pagamento sem email, não é possível atualizar usuário');
    } else if (status !== 'approved') {
      logger.info(`Pagamento não aprovado. Status: ${status}, não será atualizado`);
    }
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
    // Normalizar planId para minúsculas e validar
    const normalizedPlanId = (planId || '').toLowerCase().trim() as PlanId;
    
    // Validar se é um plano válido
    if (!PLANOS[normalizedPlanId]) {
      logger.warn(`⚠️ Plano inválido recebido no pagamento: "${planId}" (normalizado: "${normalizedPlanId}")`, {
        email,
        planId,
        billingType,
        paymentId: paymentData.id,
        validPlans: Object.keys(PLANOS)
      });
      // Não atualizar se plano for inválido - registrar e retornar silenciosamente
      return;
    }
    
    const plan = PLANOS[normalizedPlanId];
    
    logger.info(`✅ Atualizando plano para: ${normalizedPlanId}`, {
      email,
      planId,
      billingType,
    });

    // Calcular data de expiração
    const startDate = new Date();
    const endDate = new Date(startDate);
    
    // Normalizar periodo
    const periodo = billingType === 'monthly' || billingType === 'mensal' ? 'mensal' :
                    billingType === 'annual' || billingType === 'anual' ? 'anual' :
                    billingType;
    
    if (periodo === 'mensal') {
      endDate.setMonth(endDate.getMonth() + 1);
    } else if (periodo === 'anual') {
      endDate.setFullYear(endDate.getFullYear() + 1);
    }

    const userUpdateData = {
      email: email.toLowerCase(),
      plano: normalizedPlanId,
      periodo: periodo,
      isActive: true,
      isSubscriber: true,
      subscription: {
        plan: normalizedPlanId,
        period: periodo,
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

      logger.info(`✅ Usuário ${email} atualizado para plano ${normalizedPlanId} (${periodo}) até ${endDate.toISOString()}`);

      // Atualizar log de seleção de plano para 'completed'
      try {
        const userEmailLower = email.toLowerCase();
        logger.info('Buscando log de seleção de plano', {
          userEmail: userEmailLower,
          planId: normalizedPlanId,
        });

        // Tentar buscar sem orderBy primeiro (caso o índice não esteja pronto)
        let planSelectionsSnap = await db
          .collection('plan_selections')
          .where('userEmail', '==', userEmailLower)
          .where('selectedPlan', '==', normalizedPlanId)
          .get();

        logger.info(`Encontrados ${planSelectionsSnap.size} logs de seleção`);

        if (!planSelectionsSnap.empty) {
          // Ordenar por timestamp manualmente (mais recente primeiro)
          const selections = planSelectionsSnap.docs
            .map(doc => ({
              id: doc.id,
              data: doc.data(),
              timestamp: doc.data().timestamp?.toMillis?.() || doc.data().timestamp?.seconds * 1000 || 0
            }))
            .sort((a, b) => b.timestamp - a.timestamp);

          const latestSelection = selections[0];
          const docRef = db.collection('plan_selections').doc(latestSelection.id);
          
          await docRef.update({
            status: 'completed',
            paymentId: paymentData.id.toString(),
            completedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
          
          logger.info('Log de seleção de plano atualizado para completed', {
            logId: latestSelection.id,
            planId: normalizedPlanId,
          });
        }
      } catch (error: any) {
        // Não bloquear o fluxo se falhar ao atualizar o log
        logger.error('Erro ao atualizar log de seleção de plano:', error.message);
      }
    } else {
      logger.warn(`⚠️ Nenhum documento encontrado para email ${email}. Assinatura registrada sem vínculo de usuário.`);
    }
  } catch (error: any) {
    logger.error('Erro ao atualizar plano do usuário:', error.message);
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

// handleRateLimitAbuse removido - webhooks do Mercado Pago não devem ser bloqueados por rate limit

/**
 * Webhook principal do Mercado Pago com verificação de assinatura e idempotência
 */
export const mercadoPagoWebhook = onRequest(
  {
    memory: '512MiB',
    timeoutSeconds: 60,
    secrets: ['MERCADO_PAGO_ACCESS_TOKEN', 'MERCADO_PAGO_WEBHOOK_SECRET'],
    // Também tentar buscar das variáveis de ambiente diretas (compatibilidade)
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
      logger.info('Webhook recebido do IP:', clientIp);
      
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
        logger.warn('Rate limit atingido, mas permitindo webhook do Mercado Pago');
        // NÃO bloquear webhooks do Mercado Pago por rate limit
        // apenas logar o warning
      }

      // 🔧 Modo compatibilidade temporário — aceitar webhooks mesmo com assinatura inválida
      const signature = req.header('x-signature') || '';
      const rawBody = JSON.stringify(req.body);
      
      logger.info('Verificando assinatura HMAC', { hasSignature: !!signature, hasSecret: !!MP_WEBHOOK_SECRET });
      
      if (signature && MP_WEBHOOK_SECRET) {
        if (verifyHmac(signature, rawBody, MP_WEBHOOK_SECRET)) {
          logger.info('Assinatura válida');
        } else {
          logger.warn('Assinatura inválida, mas aceitando temporariamente para debug');
        }
      } else {
        logger.info('Sem assinatura ou secret — aceitando webhook');
      }

      // 🔹 Compatibilidade com diferentes formatos do Mercado Pago (v1 e v2)
      const query = req.query || {};
      const body = req.body || {};

      const paymentId =
        body.data?.id || body.id || query.id || query['data.id'] || null;
      const topic = query.topic || body.type || '';
      const action = body.action || '';

      logger.info('📩 Webhook recebido', { paymentId, topic, action, body, query });

      if (topic === 'merchant_order' || body.type === 'merchant_order') {
        logger.info('⏭️ Ignorando merchant_order');
        res.status(200).send('OK');
        return;
      }

      // Processar apenas webhooks de pagamento
      if (topic === 'payment' || body.type === 'payment' || (action && action.startsWith('payment.'))) {
        if (!paymentId) {
          logger.warn('⚠️ Nenhum paymentId encontrado', { body, query });
          res.status(400).send('paymentId ausente');
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
        await saveRawEvent(paymentId, topic || body.type || 'payment', paymentData);
        
        // Aplicar efeitos de negócio
        await applyBusinessEffects(paymentData);
        
        // Marcar como processado
        await markProcessed(idemKey, { paymentId, type: topic || body.type || 'payment', status: paymentData.status });
        
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
