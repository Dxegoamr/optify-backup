import fetch from 'node-fetch';
import * as crypto from 'crypto';
import { onRequest } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';

if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();

// Variáveis serão carregadas dentro de cada function
const MP_API = 'https://api.mercadopago.com';

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

// Função antiga - não mais utilizada (agora buscamos por email)
// async function updateUserPlan(userId: string, planId: PlanId, months: number) {
//   const plan = PLANOS[planId];
//   const now = admin.firestore.Timestamp.now();
//   const end = admin.firestore.Timestamp.fromMillis(now.toMillis() + months * 30 * 24 * 60 * 60 * 1000);

//   await db.collection('users').doc(userId).set({
//     plano: planId,
//     funcionariosPermitidos: plan.max_funcionarios,
//     isSubscriber: planId !== 'free',
//     isActive: true,
//     subscriptionStartDate: now,
//     subscriptionEndDate: end,
//     subscriptionMonths: months,
//     updatedAt: now,
//   }, { merge: true });
// }

// ---------- 1. createPaymentPreference ----------
export const createPaymentPreference = onRequest(
  { 
    cors: true, 
    memory: '256MiB', 
    timeoutSeconds: 60,
    secrets: ['MERCADO_PAGO_ACCESS_TOKEN', 'BASE_URL_FRONTEND']
  },
  async (req, res): Promise<void> => {

  try {
    // Carregar variáveis de ambiente - Firebase Functions v2
    // Priorizar MERCADO_PAGO_ACCESS_TOKEN (com underscore) como configurado no Google Cloud
    const MP_ACCESS_TOKEN = (
      process.env.MERCADO_PAGO_ACCESS_TOKEN || 
      process.env.MERCADOPAGO_ACCESS_TOKEN || 
      ''
    ).trim();
    const BASE_URL_FRONTEND = (process.env.BASE_URL_FRONTEND || 'https://optify.host').trim();
    
    console.log('🔍 Debug - Configuração:', {
      hasToken: !!MP_ACCESS_TOKEN,
      tokenLength: MP_ACCESS_TOKEN.length,
      tokenStartsWith: MP_ACCESS_TOKEN.substring(0, 10),
      hasBaseUrl: !!BASE_URL_FRONTEND,
      baseUrl: BASE_URL_FRONTEND,
      hasEnvToken1: !!process.env.MERCADO_PAGO_ACCESS_TOKEN,
      hasEnvToken2: !!process.env.MERCADOPAGO_ACCESS_TOKEN,
    });
    
    if (!MP_ACCESS_TOKEN) {
      console.error('❌ Token do Mercado Pago não configurado');
      console.error('❌ Variáveis disponíveis:', {
        MERCADO_PAGO_ACCESS_TOKEN: !!process.env.MERCADO_PAGO_ACCESS_TOKEN,
        MERCADOPAGO_ACCESS_TOKEN: !!process.env.MERCADOPAGO_ACCESS_TOKEN,
      });
      res.status(500).json({ 
        error: 'Configuração incompleta',
        message: 'Token do Mercado Pago não está configurado. Verifique as variáveis de ambiente MERCADO_PAGO_ACCESS_TOKEN ou MERCADOPAGO_ACCESS_TOKEN'
      });
      return;
    }
    
    if (!BASE_URL_FRONTEND) {
      console.error('Configuração do servidor incompleta:', {
        hasToken: !!MP_ACCESS_TOKEN,
        hasBaseUrl: !!BASE_URL_FRONTEND,
      });
      res.status(500).json({ 
        error: 'Configuração do servidor incompleta',
        message: 'MERCADO_PAGO_ACCESS_TOKEN e BASE_URL_FRONTEND são obrigatórios'
      });
      return;
    }

    if (req.method !== 'POST') {
      res.status(405).send('Method Not Allowed');
      return;
    }

    const { userId, userEmail, userName, planId, billingType } = req.body;
    console.log('🔍 Debug - Payload recebido:', { userId, userEmail, userName, planId, billingType });
    
    const plan = PLANOS[planId as PlanId];
    
    if (!plan) {
      console.error('❌ Plano inválido:', planId);
      res.status(400).json({ error: 'Plano inválido' });
      return;
    }

    const amount = billingType === 'annual' ? plan.preco_anual : plan.preco_mensal;
    
    // Validar valor mínimo
    if (!amount || amount <= 0) {
      console.error('❌ Valor inválido:', { amount, planId, billingType, plan });
      res.status(400).json({ 
        error: 'Valor inválido',
        message: `O valor do plano ${plan.nome} (${billingType}) não é válido: R$ ${amount}`
      });
      return;
    }

    // Garantir que o valor tenha no máximo 2 casas decimais
    const normalizedAmount = Math.round(amount * 100) / 100;
    
    console.log('🔍 Debug - Configuração da preferência:', {
      planId,
      planName: plan.nome,
      billingType,
      amount: normalizedAmount,
      originalAmount: amount
    });

    const external_reference = `${userId}__${planId}__${billingType}__${Date.now()}`;

    const prefBody = {
      items: [{
        title: `Optify - Plano ${plan.nome} (${billingType === 'annual' ? 'Anual' : 'Mensal'})`,
        description: `Assinatura do plano ${plan.nome} - Optify`,
        quantity: 1,
        currency_id: 'BRL',
        unit_price: normalizedAmount,
      }],
      payment_methods: {
        excluded_payment_methods: [],
        excluded_payment_types: [],
        installments: 12
      },
      back_urls: {
        success: `${BASE_URL_FRONTEND}/payment/success`,
        failure: `${BASE_URL_FRONTEND}/payment/failure`,
        pending: `${BASE_URL_FRONTEND}/payment/pending`,
      },
      auto_return: 'approved',
      external_reference,
      metadata: {
        email: userEmail, // campo usado pelo webhook
        userId,           // opcional: manter se necessário
        planId,
        billingType
      },
      notification_url: `https://us-central1-optify-definitivo.cloudfunctions.net/mercadoPagoWebhook`,
      statement_descriptor: 'OPTIFY',
      payer: {
        name: userName || 'Usuário',
        email: (userEmail || '').trim().toLowerCase(),
        identification: {
          type: 'CPF',
          number: '00000000000',
        },
      },
    };

    console.log('🔍 Debug - Payload completo para MP:', JSON.stringify(prefBody, null, 2));
    console.log('🔍 Debug - Token configurado:', MP_ACCESS_TOKEN ? `APP_USR-...${MP_ACCESS_TOKEN.slice(-10)}` : 'NÃO CONFIGURADO');
    
    const resp = await fetch(`${MP_API}/checkout/preferences`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${MP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': crypto.randomUUID(),
      },
      body: JSON.stringify(prefBody),
    });

    console.log('🔍 Debug - Status da resposta MP:', resp.status);
    console.log('🔍 Debug - Headers da resposta:', Object.fromEntries(resp.headers.entries()));
    
    const data = await resp.json();
    
    // Log completo da resposta (importante para debug)
    console.log('🔍 Debug - Resposta completa do MP:', JSON.stringify(data, null, 2));
    
    // Verificar se há erros na resposta mesmo com status 200/201
    if (data.errors && Array.isArray(data.errors) && data.errors.length > 0) {
      console.error('❌ Erros na resposta do Mercado Pago:', data.errors);
      res.status(500).json({ 
        error: 'Erros no Mercado Pago',
        details: data.errors,
        message: data.message || 'Erro ao criar preferência no Mercado Pago'
      });
      return;
    }
    
    if (!resp.ok) {
      console.error('❌ Erro do Mercado Pago:', data);
      console.error('❌ Status HTTP:', resp.status);
      console.error('❌ Headers:', Object.fromEntries(resp.headers.entries()));
      res.status(500).json({ 
        error: data,
        status: resp.status,
        message: data.message || 'Erro ao criar preferência no Mercado Pago'
      });
      return;
    }

    // Validar se a preferência foi criada corretamente
    if (!data.id) {
      console.error('❌ Preferência criada sem ID:', data);
      res.status(500).json({ 
        error: 'Preferência inválida',
        message: 'O Mercado Pago retornou uma preferência sem ID',
        details: data 
      });
      return;
    }

    // Verificar se há URL de checkout
    const checkoutUrl = data.init_point || data.sandbox_init_point;
    
    if (!checkoutUrl) {
      console.error('❌ Nenhuma URL de checkout disponível');
      console.error('❌ Dados da preferência:', JSON.stringify(data, null, 2));
      res.status(500).json({ 
        error: 'URL de checkout não disponível',
        message: 'O Mercado Pago não retornou uma URL de checkout válida',
        details: data 
      });
      return;
    }

    // Verificar se há problemas na preferência que podem desabilitar o botão
    const preferenceStatus = data.status || 'unknown';
    const collectorId = data.collector_id;
    const totalInItems = data.items?.reduce((sum: number, item: any) => sum + (item.unit_price * item.quantity), 0) || 0;
    
    console.log('🔍 Debug - Status da preferência:', {
      id: data.id,
      status: preferenceStatus,
      collector_id: collectorId,
      init_point: !!data.init_point,
      sandbox_init_point: !!data.sandbox_init_point,
      items: data.items,
      total_amount: totalInItems,
      expected_amount: normalizedAmount
    });

    // Verificar se o total está correto
    if (Math.abs(totalInItems - normalizedAmount) > 0.01) {
      console.warn('⚠️ Aviso: Valor total dos items não confere:', {
        expected: normalizedAmount,
        actual: totalInItems,
        difference: Math.abs(totalInItems - normalizedAmount)
      });
    }

    await createPlanTransaction({
      userId, userEmail, userName, planId, amount: normalizedAmount, planName: plan.nome,
      billingType, paymentProvider: 'mercadopago', transactionId: data.id,
      externalReference: external_reference,
    });

    console.log('✅ Preferência criada com sucesso:', {
      id: data.id,
      checkoutUrl,
      status: preferenceStatus,
      totalAmount: normalizedAmount
    });

    // Retornar todos os dados relevantes da preferência
    res.json({
      id: data.id,
      checkout_url: checkoutUrl,
      init_point: checkoutUrl,
      sandbox_init_point: data.sandbox_init_point,
      status: preferenceStatus,
      collector_id: collectorId,
      total_amount: normalizedAmount,
      items: data.items,
      // Retornar dados completos para debug
      ...data
    });
    return;
  } catch (err: any) {
    console.error('❌ Erro na função createPaymentPreference:', err);
    console.error('❌ Stack:', err.stack);
    res.status(500).json({ 
      error: 'Internal Server Error',
      message: err.message || 'Erro desconhecido',
      details: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
    return;
  }
  }
);

// ---------- 2. mercadoPagoWebhook ----------
// MOVED TO webhooks/mercado-pago.ts to avoid duplication
// This webhook has better error handling, idempotency, and rate limiting

// ---------- 3. checkPaymentStatus ----------
export const checkPaymentStatus = onRequest(
  { 
    cors: true, 
    memory: '256MiB', 
    timeoutSeconds: 60,
    secrets: ['MERCADO_PAGO_ACCESS_TOKEN']
  },
  async (req, res): Promise<void> => {
  try {
    // Carregar variáveis de ambiente - Firebase Functions v2
    const MP_ACCESS_TOKEN = (process.env.MERCADO_PAGO_ACCESS_TOKEN || '').trim();
    
    if (!MP_ACCESS_TOKEN) {
      console.error('❌ MERCADO_PAGO_ACCESS_TOKEN não configurado');
      res.status(500).json({ error: 'Configuração do servidor incompleta' });
      return;
    }

    const paymentId = req.query.paymentId as string;
    
    if (!paymentId) {
      res.status(400).json({ error: 'paymentId é obrigatório' });
      return;
    }

    console.log('🔍 Verificando status do pagamento:', paymentId);
    
    const resp = await fetch(`${MP_API}/v1/payments/${paymentId}`, {
      headers: { 
        'Authorization': `Bearer ${MP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      },
    });
    
    if (!resp.ok) {
      console.error('❌ Erro ao buscar pagamento:', resp.status);
      res.status(resp.status).json({ error: 'Erro ao buscar pagamento' });
      return;
    }
    
    const data = await resp.json();
    console.log('✅ Status do pagamento:', data.status);
    
    res.json(data);
    return;
  } catch (err: any) {
    console.error('❌ Erro em checkPaymentStatus:', err);
    res.status(500).json({ error: 'Internal error', message: err.message });
    return;
  }
  }
);
