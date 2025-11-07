# 📦 Código Completo - Atualização Automática de Planos

## 🎯 Objetivo
Este documento contém **TODO o código** relacionado à atualização automática de planos dos usuários após pagamento aprovado no Mercado Pago.

---

## 📄 **1. WEBHOOK PRINCIPAL - `mercadoPagoWebhook`**

### Arquivo: `functions/src/webhooks/mercado-pago.ts`

**Função completa:**

```typescript
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
// Priorizar MERCADO_PAGO_ACCESS_TOKEN (formato configurado no Google Cloud)
const MP_ACCESS_TOKEN = process.env.MERCADO_PAGO_ACCESS_TOKEN || process.env.MERCADOPAGO_ACCESS_TOKEN || '';
const MP_WEBHOOK_SECRET = process.env.MERCADO_PAGO_WEBHOOK_SECRET || process.env.MERCADOPAGO_WEBHOOK_SECRET || '';

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
  // Usar a variável global já definida no topo do arquivo
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

  // Extrair email do metadata ou do payer (forma direta e simples)
  const email = (paymentData.metadata?.email || 
                 paymentData.metadata?.userEmail || 
                 paymentData.metadata?.user_email || 
                 paymentData.payer?.email || '')
                 .toString()
                 .trim()
                 .toLowerCase() || null;
  
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
      logger.error(`❌ Plano inválido recebido: "${planId}" (normalizado: "${normalizedPlanId}")`);
      throw new Error(`Plano inválido: ${planId}. Planos válidos: ${Object.keys(PLANOS).join(', ')}`);
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

      // Verificar assinatura HMAC (aceita webhooks sem assinatura para compatibilidade)
      const signature = req.header('x-signature') || '';
      const rawBody = JSON.stringify(req.body);
      
      logger.info('Verificando assinatura HMAC', { hasSignature: !!signature, hasSecret: !!MP_WEBHOOK_SECRET });
      
      if (signature) {
        // Se existe assinatura, validar
        if (MP_WEBHOOK_SECRET) {
          if (verifyHmac(signature, rawBody, MP_WEBHOOK_SECRET)) {
            logger.info('Assinatura válida');
          } else {
            logger.warn('Assinatura inválida', { signature: signature.substring(0, 50) });
            res.status(401).send('Unauthorized');
            return;
          }
        } else {
          logger.warn('Secret não configurado, mas assinatura presente - permitindo');
        }
      } else {
        // Sem assinatura - aceitar por compatibilidade
        logger.info('Sem assinatura — aceitando webhook por compatibilidade');
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
```

---

## 📄 **2. WEBHOOK ALTERNATIVO - `mpWebhook`**

### Arquivo: `functions/src/index.ts` (linhas 140-230)

**Função completa:**

```typescript
// Webhook de notificações do Mercado Pago
export const mpWebhook = onRequest(
  { cors: true, memory: '256MiB', timeoutSeconds: 60 },
  async (req, res) => {

  // Verificação simples por secret (opcionalmente usar assinatura HMAC se necessário)
  const providedSecret = req.get("x-webhook-secret") || req.query.secret;
  if (MP_WEBHOOK_SECRET && providedSecret !== MP_WEBHOOK_SECRET) {
    logger.warn("Webhook bloqueado: secret inválido");
    res.status(401).send("Unauthorized");
    return;
  }

  try {
    const data = await parseBody(req);
    logger.info("Webhook Mercado Pago recebido", data);

    if (data?.type === 'merchant_order') {
      logger.info('Ignorando webhook merchant_order');
      res.status(200).send('OK');
      return;
    }

    // Processar apenas pagamentos
    if (data.type === "payment" || data?.data?.id || (data?.action && String(data.action).startsWith('payment.'))) {
      try {
        const paymentId = data?.data?.id || data?.id;
        if (mpConfig && paymentId) {
          const paymentClient = new Payment(mpConfig);
          const payment = await paymentClient.get({ id: paymentId as string } as any);
          logger.info("Detalhes do pagamento:", payment.status);

          const email = (payment as any)?.metadata?.email || (payment as any)?.payer?.email || '';
          const plano = (payment as any)?.metadata?.plano || 'standard';
          const periodo = (payment as any)?.metadata?.periodo || 'mensal';
          const status = (payment as any)?.status;
          const planId = (payment as any)?.metadata?.planId || null;
          const planName = (payment as any)?.metadata?.planName || null;

          const normalizedEmail = (email || '').toString().trim().toLowerCase();

          if (normalizedEmail && status === 'approved') {
            const startDate = new Date();
            const endDate = new Date(startDate);
            if (periodo === 'mensal') endDate.setMonth(endDate.getMonth() + 1);
            else if (periodo === 'anual') endDate.setFullYear(endDate.getFullYear() + 1);

            const userUpdateData: Record<string, unknown> = {
              email: normalizedEmail,
              plano,
              periodo,
              isActive: true,
              isSubscriber: true,
              subscription: {
                plan: plano,
                planId: planId,
                planName: planName,
                period: periodo,
                active: true,
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                expiresAt: admin.firestore.Timestamp.fromDate(endDate),
              },
              subscriptionStartDate: admin.firestore.Timestamp.fromDate(startDate),
              subscriptionEndDate: admin.firestore.Timestamp.fromDate(endDate),
              atualizadoEm: admin.firestore.FieldValue.serverTimestamp(),
            };

            const db = admin.firestore();
            const usersSnap = await db.collection('users').where('email', '==', normalizedEmail).get();
            if (!usersSnap.empty) {
              const batch = db.batch();
              usersSnap.docs.forEach((docRef) => batch.set(docRef.ref, userUpdateData, { merge: true }));
              await batch.commit();
              logger.info(`Usuário ${normalizedEmail} atualizado para plano ${plano} (${periodo}).`);
            } else {
              logger.warn(`Nenhum documento encontrado para email ${normalizedEmail}.`);
            }
          }
        }
      } catch (e) {
        logger.error("Falha ao consultar pagamento:", e);
      }
    }

    res.status(200).send("OK");
  } catch (error: any) {
    logger.error("Erro no webhook:", error);
    res.status(500).send("Erro interno");
  }
  }
);
```

---

## 📄 **3. TRIGGERS DO FIRESTORE - Transações**

### Arquivo: `functions/src/stats/aggregations.ts`

### 3.1. `onTransactionCreated`

```typescript
/**
 * Atualiza estatísticas quando uma transação é criada
 */
export const onTransactionCreated = onDocumentCreated(
  {
    document: 'transactions_plans/{transactionId}',
    memory: '256MiB',
  },
  async (event) => {
    try {
      const transactionData = event.data?.data();
      if (!transactionData) return;

      logger.info('Nova transação criada, atualizando estatísticas', {
        transactionId: event.params.transactionId,
        amount: transactionData.amount,
        status: transactionData.status,
      });

      // Recalcular estatísticas globais
      const stats = await calculateGlobalStats();
      await db.collection('admin_stats').doc('global').set(stats);

      // Se for transação aprovada, atualizar resumo diário
      if (transactionData.status === 'completed' && transactionData.createdAt) {
        const date = transactionData.createdAt.toDate().toISOString().split('T')[0];
        const dailySummary = await calculateDailySummary(date);
        await db.collection('daily_summaries').doc(date).set(dailySummary);
      }
    } catch (error) {
      logger.error('Erro ao processar nova transação:', error);
    }
  }
);
```

### 3.2. `onTransactionUpdated`

```typescript
/**
 * Atualiza estatísticas quando uma transação é atualizada
 */
export const onTransactionUpdated = onDocumentUpdated(
  {
    document: 'transactions_plans/{transactionId}',
    memory: '256MiB',
  },
  async (event) => {
    try {
      const beforeData = event.data?.before.data();
      const afterData = event.data?.after.data();

      if (!beforeData || !afterData) return;

      // Só recalcular se o status mudou
      if (beforeData.status === afterData.status) return;

      logger.info('Transação atualizada, recalculando estatísticas', {
        transactionId: event.params.transactionId,
        oldStatus: beforeData.status,
        newStatus: afterData.status,
      });

      // Recalcular estatísticas globais
      const stats = await calculateGlobalStats();
      await db.collection('admin_stats').doc('global').set(stats);

      // Atualizar resumo diário se necessário
      if (afterData.createdAt) {
        const date = afterData.createdAt.toDate().toISOString().split('T')[0];
        const dailySummary = await calculateDailySummary(date);
        await db.collection('daily_summaries').doc(date).set(dailySummary);
      }
    } catch (error) {
      logger.error('Erro ao processar atualização de transação:', error);
    }
  }
);
```

### 3.3. `onUserUpdated`

```typescript
/**
 * Atualiza estatísticas quando um usuário é criado ou atualizado
 */
export const onUserUpdated = onDocumentUpdated(
  {
    document: 'users/{userId}',
    memory: '256MiB',
  },
  async (event) => {
    try {
      const beforeData = event.data?.before.data();
      const afterData = event.data?.after.data();

      if (!beforeData || !afterData) return;

      // Só recalcular se status ativo mudou
      if (beforeData.isActive === afterData.isActive) return;

      logger.info('Usuário atualizado, recalculando estatísticas', {
        userId: event.params.userId,
        oldActive: beforeData.isActive,
        newActive: afterData.isActive,
      });

      // Recalcular estatísticas globais
      const stats = await calculateGlobalStats();
      await db.collection('admin_stats').doc('global').set(stats);
    } catch (error) {
      logger.error('Erro ao processar atualização de usuário:', error);
    }
  }
);
```

---

## 📄 **4. HELPER - Criação de Transação**

### Arquivo: `functions/src/mercadopago.ts` (linhas 26-37)

```typescript
// ---------- helpers ----------
async function createPlanTransaction(data: any) {
  const ref = db.collection('transactions_plans').doc();
  await ref.set({
    id: ref.id,
    ...data,
    status: 'pending',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  return ref.id;
}
```

**Chamada em `createPaymentPreference`:**

```typescript
await createPlanTransaction({
  userId, userEmail, userName, planId, amount: normalizedAmount, planName: plan.nome,
  billingType, paymentProvider: 'mercadopago', transactionId: data.id,
  externalReference: external_reference,
});
```

---

## 📄 **5. RECONCILIAÇÃO DIÁRIA - `reconcilePayments`**

### Arquivo: `functions/src/webhooks/mercado-pago.ts` (linhas 460-515)

**Já incluído acima no webhook principal** ✅

---

## 🔄 **FLUXO COMPLETO DE ATUALIZAÇÃO**

### Fluxo Principal (webhook robusto):

1. **Webhook recebido** → `mercadoPagoWebhook`
2. **Verificação de segurança** → HMAC, blacklist, rate limit
3. **Idempotência** → Verifica se já foi processado
4. **Busca dados do pagamento** → `fetchPaymentFromAPI(paymentId)`
5. **Salva evento bruto** → `saveRawEvent(paymentId, type, paymentData)`
6. **Aplica efeitos de negócio** → `applyBusinessEffects(paymentData)`
   - Extrai email, planId, billingType do metadata
   - Se `status === 'approved'` → chama `updateUserPlan()`
7. **Atualiza usuário** → `updateUserPlan(email, planId, billingType, paymentData)`
   - Busca usuário por email: `users.where('email', '==', email)`
   - Atualiza com `batch.set(doc.ref, userUpdateData, { merge: true })`
   - Campos atualizados: `plano`, `periodo`, `isActive`, `isSubscriber`, `subscription`, etc.
8. **Marca como processado** → `markProcessed(idemKey)`
9. **Atualiza log de seleção** → `plan_selections.status = 'completed'`

### Fluxo Alternativo (webhook simples):

1. **Webhook recebido** → `mpWebhook`
2. **Busca pagamento** → SDK do Mercado Pago
3. **Se aprovado** → Atualiza diretamente sem idempotência

### Fluxo de Reconciliação:

1. **Schedule diário** → `reconcilePayments` (todo dia às 2h)
2. **Busca transações pendentes** → Últimas 24h
3. **Verifica status no MP** → `fetchPaymentFromAPI()`
4. **Se aprovado** → `applyBusinessEffects()` → `updateUserPlan()`

---

## 🔍 **PONTOS CRÍTICOS PARA ANÁLISE**

### 1. **Extração de Email** (2 locais diferentes)

**`mercadoPagoWebhook` (robusto):**
```typescript
const email = (paymentData.metadata?.email || 
               paymentData.metadata?.userEmail || 
               paymentData.metadata?.user_email || 
               paymentData.payer?.email || '')
               .toString()
               .trim()
               .toLowerCase() || null;
```

**`mpWebhook` (simples):**
```typescript
const email = (payment as any)?.metadata?.email || (payment as any)?.payer?.email || '';
const normalizedEmail = (email || '').toString().trim().toLowerCase();
```

### 2. **Extração de Plano**

**`mercadoPagoWebhook`:**
```typescript
const planId = paymentData.metadata?.plano || 
               paymentData.metadata?.planId || 
               paymentData.metadata?.plan_id || 
               'standard';
```

**`mpWebhook`:**
```typescript
const plano = (payment as any)?.metadata?.plano || 'standard';
```

### 3. **Atualização do Firestore**

**`mercadoPagoWebhook` (usa batch):**
```typescript
const batch = db.batch();
usersSnap.docs.forEach((doc) => {
  batch.set(doc.ref, userUpdateData, { merge: true });
});
await batch.commit();
```

**`mpWebhook` (também usa batch):**
```typescript
const batch = db.batch();
usersSnap.docs.forEach((docRef) => batch.set(docRef.ref, userUpdateData, { merge: true }));
await batch.commit();
```

### 4. **Diferenças nos Campos Atualizados**

**`mercadoPagoWebhook` (`updateUserPlan`):**
- `updatedAt: new Date()` (JavaScript Date)
- `expiresAt: endDate` (JavaScript Date)
- `atualizadoEm: new Date()` (JavaScript Date)

**`mpWebhook`:**
- `updatedAt: admin.firestore.FieldValue.serverTimestamp()` (Firestore Timestamp)
- `expiresAt: admin.firestore.Timestamp.fromDate(endDate)` (Firestore Timestamp)
- `atualizadoEm: admin.firestore.FieldValue.serverTimestamp()` (Firestore Timestamp)

---

## ⚠️ **POSSÍVEIS PROBLEMAS IDENTIFICADOS**

### 1. **Inconsistência de Timestamps**
- `mercadoPagoWebhook` usa `new Date()` (JavaScript)
- `mpWebhook` usa `admin.firestore.FieldValue.serverTimestamp()` (Firestore)
- Pode causar problemas de comparação/ordenação

### 2. **Busca por Email**
- Ambos usam `where('email', '==', email.toLowerCase())`
- Se o email no Firestore não estiver em minúsculas, não encontra
- **Necessário índice composto** para performance

### 3. **Normalização de Plano**
- `mercadoPagoWebhook` normaliza: `(planId || '').toLowerCase().trim()`
- `mpWebhook` não normaliza (usa diretamente do metadata)
- Pode falhar se metadata tiver plano com case diferente

### 4. **Webhook Configurado no Mercado Pago**
- Verificar qual webhook está configurado: `/mercadoPagoWebhook` ou `/mpWebhook`
- Se estiver configurado `/mpWebhook`, o robusto não é chamado

---

## 📋 **CHECKLIST DE VERIFICAÇÃO**

- [ ] Qual webhook está configurado no Mercado Pago?
- [ ] Email está sendo extraído corretamente do metadata?
- [ ] PlanId está sendo normalizado corretamente?
- [ ] Usuário existe no Firestore com email correto (minúsculas)?
- [ ] Índice composto existe para `users.email`?
- [ ] Webhook está recebendo notificações?
- [ ] Logs mostram `applyBusinessEffects` sendo chamado?
- [ ] Logs mostram `updateUserPlan` sendo chamado?
- [ ] Logs mostram batch.commit() sendo executado?

---

**Documento gerado automaticamente - Todo o código de atualização de planos foi incluído** ✅





