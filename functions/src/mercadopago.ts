import fetch from 'node-fetch';
import * as crypto from 'crypto';
import * as functions from 'firebase-functions';
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
  standard: { nome: 'Standard', preco_mensal: 1, preco_anual: 10.20, max_funcionarios: 5 },
  medium: { nome: 'Medium', preco_mensal: 49.90, preco_anual: 509.16, max_funcionarios: 10 },
  ultimate: { nome: 'Ultimate', preco_mensal: 99.90, preco_anual: 1018.32, max_funcionarios: 50 },
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

async function updateUserPlan(userId: string, planId: PlanId, months: number) {
  const plan = PLANOS[planId];
  const now = admin.firestore.Timestamp.now();
  const end = admin.firestore.Timestamp.fromMillis(now.toMillis() + months * 30 * 24 * 60 * 60 * 1000);

  await db.collection('users').doc(userId).set({
    plano: planId,
    funcionariosPermitidos: plan.max_funcionarios,
    isSubscriber: planId !== 'free',
    isActive: true,
    subscriptionStartDate: now,
    subscriptionEndDate: end,
    subscriptionMonths: months,
    updatedAt: now,
  }, { merge: true });
}

// ---------- 1. createPaymentPreference ----------
export const createPaymentPreference = functions.https.onRequest(async (req, res): Promise<void> => {
  // Configurar CORS primeiro
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.set('Access-Control-Max-Age', '3600');

  // Responder a requisições OPTIONS (preflight)
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  try {
    // Carregar variáveis de ambiente
    const MP_ACCESS_TOKEN = process.env.MERCADO_PAGO_ACCESS_TOKEN || "APP_USR-5496244105993399-070119-b9bec860fcf72e513a288bf609f3700c-454772336";
    const BASE_URL_FRONTEND = process.env.BASE_URL_FRONTEND || "https://optify-definitivo.web.app/";
    
    if (!MP_ACCESS_TOKEN || !BASE_URL_FRONTEND) {
      res.status(500).json({ error: 'Configuração do servidor incompleta' });
      return;
    }

    if (req.method !== 'POST') {
      res.status(405).send('Method Not Allowed');
      return;
    }

    const { userId, userEmail, userName, planId, billingType } = req.body;
    const plan = PLANOS[planId as PlanId];
    
    if (!plan) {
      res.status(400).json({ error: 'Plano inválido' });
      return;
    }

    const amount = billingType === 'annual' ? plan.preco_anual : plan.preco_mensal;
    const external_reference = `${userId}__${planId}__${billingType}__${Date.now()}`;

    const prefBody = {
      items: [{
        title: `Optify - Plano ${plan.nome} (${billingType === 'annual' ? 'Anual' : 'Mensal'})`,
        quantity: 1,
        currency_id: 'BRL',
        unit_price: amount,
      }],
      back_urls: {
        success: `${BASE_URL_FRONTEND}/payment/success`,
        failure: `${BASE_URL_FRONTEND}/payment/failure`,
        pending: `${BASE_URL_FRONTEND}/payment/pending`,
      },
      auto_return: 'approved',
      external_reference,
      metadata: { userId, userEmail, planId, billingType },
    };

    const resp = await fetch(`${MP_API}/checkout/preferences`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${MP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': crypto.randomUUID(),
      },
      body: JSON.stringify(prefBody),
    });

    const data = await resp.json();
    
    if (!resp.ok) {
      res.status(500).json({ error: data });
      return;
    }

    await createPlanTransaction({
      userId, userEmail, userName, planId, amount, planName: plan.nome,
      billingType, paymentProvider: 'mercadopago', transactionId: data.id,
      externalReference: external_reference,
    });

    res.json({
      init_point: data.init_point,
      sandbox_init_point: data.sandbox_init_point,
      id: data.id,
    });
    return;
  } catch (err: any) {
    console.error('Erro na função createPaymentPreference:', err);
    res.status(500).json({ error: 'Internal Server Error' });
    return;
  }
});

// ---------- 2. mercadoPagoWebhook ----------
function verifySignature(rawBody: string, headers: any, webhookSecret: string) {
  const sig = headers['x-signature'] || '';
  if (!sig || !webhookSecret) return false;
  const expected = crypto.createHmac('sha256', webhookSecret).update(rawBody).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
}

export const mercadoPagoWebhook = functions.https.onRequest(async (req, res): Promise<void> => {
  // Carregar variáveis de ambiente
  const MP_ACCESS_TOKEN = functions.config().mercadopago.access_token;
  const MP_WEBHOOK_SECRET = functions.config().mercadopago.webhook_secret;

  const rawBody = (req as any).rawBody?.toString() || JSON.stringify(req.body);
  if (!verifySignature(rawBody, req.headers, MP_WEBHOOK_SECRET)) {
    res.status(401).send('Invalid signature');
    return;
  }
  try {
    const { type, data } = req.body;
    if (type !== 'payment' || !data?.id) {
      res.status(200).send('ignored');
      return;
    }

    const payResp = await fetch(`${MP_API}/v1/payments/${data.id}`, {
      headers: { 'Authorization': `Bearer ${MP_ACCESS_TOKEN}` },
    });
    const payment = await payResp.json();

    const ext = payment.external_reference;
    const [userId, planId, billingType] = ext.split('__');
    const txSnap = await db.collection('transactions_plans').where('externalReference', '==', ext).limit(1).get();

    if (!txSnap.empty) {
      const ref = txSnap.docs[0].ref;
      await ref.set({
        status: payment.status,
        paymentMethod: payment.payment_type_id,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
    }

    if (payment.status === 'approved') {
      const months = billingType === 'annual' ? 12 : 1;
      await updateUserPlan(userId, planId as PlanId, months);
    }

    res.status(200).send('ok');
    return;
  } catch (err) {
    console.error(err);
    res.status(500).send('error');
    return;
  }
});

// ---------- 3. checkPaymentStatus ----------
export const checkPaymentStatus = functions.https.onRequest(async (req, res): Promise<void> => {
  // Carregar variáveis de ambiente
  const MP_ACCESS_TOKEN = functions.config().mercadopago.access_token;

  // Configurar CORS
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Responder a requisições OPTIONS (preflight)
  if (req.method === 'OPTIONS') {
    res.status(200).send('');
    return;
  }

  try {
    const paymentId = req.query.paymentId;
    const resp = await fetch(`${MP_API}/v1/payments/${paymentId}`, {
      headers: { 'Authorization': `Bearer ${MP_ACCESS_TOKEN}` },
    });
    const data = await resp.json();
    res.json(data);
    return;
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal error' });
    return;
  }
});
