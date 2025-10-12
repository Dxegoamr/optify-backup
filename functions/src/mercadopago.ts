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
      notification_url: 'https://us-central1-optify-definitivo.cloudfunctions.net/mercadoPagoWebhook',
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
// Verificação de assinatura desabilitada temporariamente para debug
// function verifySignature(rawBody: string, headers: any, webhookSecret: string) {
//   const sig = headers['x-signature'] || '';
//   if (!sig || !webhookSecret) return false;
//   const expected = crypto.createHmac('sha256', webhookSecret).update(rawBody).digest('hex');
//   return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
// }

export const mercadoPagoWebhook = functions.https.onRequest(async (req, res): Promise<void> => {
  // Carregar variáveis de ambiente
  const MP_ACCESS_TOKEN = process.env.MERCADO_PAGO_ACCESS_TOKEN || "APP_USR-5496244105993399-070119-b9bec860fcf72e513a288bf609f3700c-454772336";

  try {
    const { type, data, action } = req.body;
    console.log('📋 Webhook recebido:', req.body);

    // ⚠️ Ignora merchant_order porque não tem dados ainda
    if (type === 'merchant_order') {
      console.log('⏭️ Ignorando webhook merchant_order');
      res.status(200).json({ ok: true });
      return;
    }

    // 🔹 Processa somente webhooks de pagamento
    if (type === 'payment' || (action && action.startsWith('payment.'))) {
      const paymentId = data?.id;

      if (!paymentId) {
        console.log('⚠️ Nenhum paymentId encontrado.');
        res.status(400).json({ error: 'paymentId não encontrado' });
        return;
      }

      // 🔍 Busca informações do pagamento no MercadoPago
      console.log('🔍 Buscando dados do pagamento:', paymentId);
      const response = await fetch(`${MP_API}/v1/payments/${paymentId}`, {
        headers: {
          Authorization: `Bearer ${MP_ACCESS_TOKEN}`,
        },
      });

      const paymentData = await response.json();
      console.log('📊 Dados do pagamento:', paymentData);

      if (paymentData.error) {
        console.error('❌ Erro ao buscar pagamento:', paymentData);
        res.status(400).json({ error: 'Erro ao buscar pagamento' });
        return;
      }

      console.log('🔍 Metadata:', paymentData?.metadata);
      console.log('🔍 Payer:', paymentData?.payer);
      console.log('🔍 External Reference:', paymentData?.external_reference);

      const email = (
        paymentData?.metadata?.user_email ||
        paymentData?.metadata?.userEmail ||
        paymentData?.payer?.email ||
        ''
      )
        .toString()
        .trim()
        .toLowerCase() || null;
      
      const planId = paymentData?.metadata?.plan_id || paymentData?.metadata?.planId || 'standard';
      const billingType = paymentData?.metadata?.billing_type || paymentData?.metadata?.billingType || 'monthly';
      const status = paymentData?.status;
      const externalReference = paymentData?.external_reference;

      console.log('📧 Email:', email);
      console.log('📦 Plano:', planId);
      console.log('📅 Período:', billingType);
      console.log('✅ Status:', status);

      if (!email) {
        console.log('⚠️ Pagamento sem email, não é possível atualizar usuário.');
        res.status(200).json({ ok: true });
        return;
      }

      // 🔄 Atualiza transação
      if (externalReference) {
        const txSnap = await db.collection('transactions_plans')
          .where('externalReference', '==', externalReference)
          .limit(1)
          .get();
        
        if (!txSnap.empty) {
          const ref = txSnap.docs[0].ref;
          await ref.set({
            status: status,
            paymentMethod: paymentData.payment_type_id,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          }, { merge: true });
          console.log('✅ Transação atualizada');
        }
      }

      if (status === 'approved') {
        console.log('✅ Pagamento aprovado! Atualizando plano do usuário...');
        
        // 🔢 Calcula data de expiração
        const startDate = new Date();
        const endDate = new Date(startDate);
        if (billingType === 'monthly') {
          endDate.setMonth(endDate.getMonth() + 1);
        } else if (billingType === 'annual') {
          endDate.setFullYear(endDate.getFullYear() + 1);
        }

        console.log('🔍 Buscando usuário pelo email:', email);
        
        // 🔹 Localiza documentos existentes do usuário pelo campo email
        let usersSnap;
        try {
          usersSnap = await db
            .collection('users')
            .where('email', '==', email)
            .get();
          console.log('📦 Usuários encontrados:', usersSnap.size);
        } catch (error) {
          console.error('❌ Erro ao buscar usuário:', error);
          res.status(500).json({ error: 'Erro ao buscar usuário' });
          return;
        }

        const userUpdateData = {
          email,
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
          },
          subscriptionStartDate: startDate,
          subscriptionEndDate: endDate,
          atualizadoEm: new Date(),
        };

        if (!usersSnap.empty) {
          // Atualiza TODOS os documentos que possuem o mesmo email
          try {
            const batch = db.batch();
            usersSnap.docs.forEach((docRef: FirebaseFirestore.QueryDocumentSnapshot) => {
              batch.set(docRef.ref, userUpdateData, { merge: true });
              console.log('📝 Atualizando documento:', docRef.id);
            });
            await batch.commit();
            console.log(`✅ Usuário ${email} atualizado para plano ${planId} (${billingType}) até ${endDate.toISOString()}`);
          } catch (error) {
            console.error('❌ Erro ao atualizar usuário:', error);
            res.status(500).json({ error: 'Erro ao atualizar usuário' });
            return;
          }
        } else {
          console.warn(`⚠️ Nenhum documento encontrado para email ${email}`);
        }
      } else {
        console.log(`📢 Pagamento não aprovado (status: ${status})`);
      }
    } else {
      console.log(`📢 Webhook ignorado (tipo: ${type})`);
    }

    res.status(200).json({ ok: true });
    return;
  } catch (error) {
    console.error('❌ Erro no webhook:', error);
    res.status(500).json({ error: 'Erro interno' });
    return;
  }
});

// ---------- 3. checkPaymentStatus ----------
export const checkPaymentStatus = functions.https.onRequest(async (req, res): Promise<void> => {
  // Carregar variáveis de ambiente
  const MP_ACCESS_TOKEN = process.env.MERCADO_PAGO_ACCESS_TOKEN || "APP_USR-5496244105993399-070119-b9bec860fcf72e513a288bf609f3700c-454772336";

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
