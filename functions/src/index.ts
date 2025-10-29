/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import { onRequest } from "firebase-functions/v2/https";
import { logger } from "firebase-functions";
import * as admin from "firebase-admin";
import { MercadoPagoConfig, Preference, Payment } from "mercadopago";

// Start writing functions
// https://firebase.google.com/docs/functions/typescript

// For cost control, you can set the maximum number of containers that can be
// running at the same time. This helps mitigate the impact of unexpected
// traffic spikes by instead downgrading performance. This limit is a
// per-function limit. You can override the limit for each function using the
// `maxInstances` option in the function's options, e.g.
// `onRequest({ maxInstances: 5 }, (req, res) => { ... })`.
// NOTE: setGlobalOptions does not apply to functions using the v1 API. V1
// functions should each use functions.runWith({ maxInstances: 10 }) instead.
// In the v1 API, each function can only serve one request per container, so
// this will be the maximum concurrent request count.
// v1 API - opcionalmente poderíamos usar options por função

// Initialize Admin SDK once
if (!admin.apps.length) {
  admin.initializeApp();
}


// Load secrets from environment (set via firebase functions:config:set or env vars)
const MP_ACCESS_TOKEN = process.env.MERCADOPAGO_ACCESS_TOKEN || process.env.mercadopago_access_token || "";
const MP_WEBHOOK_SECRET = process.env.MERCADOPAGO_WEBHOOK_SECRET || process.env.mercadopago_webhook_secret || "";

// Configure SDK
let mpConfig: MercadoPagoConfig | null = null;
if (MP_ACCESS_TOKEN) {
  mpConfig = new MercadoPagoConfig({ accessToken: MP_ACCESS_TOKEN });
} else {
  logger.warn("MERCADOPAGO_ACCESS_TOKEN não definido nas variáveis de ambiente.");
}

// Helper to parse body safely
const parseBody = async (req: any) => {
  if (req.is("application/json")) return req.body;
  try {
    return JSON.parse(req.rawBody?.toString() || "{}");
  } catch {
    return {};
  }
};

// Buscar plano no Firestore (por id, value/slug ou name)
async function findPlan(identifier: string) {
  const db = admin.firestore();
  const plans = db.collection('plans');
  // Tentar como ID direto
  const byId = await plans.doc(identifier).get();
  if (byId.exists) return { id: byId.id, ...(byId.data() as any) };
  // Por slug/value
  let snap = await plans.where('value', '==', identifier).limit(1).get();
  if (!snap.empty) return { id: snap.docs[0].id, ...(snap.docs[0].data() as any) };
  // Por name
  snap = await plans.where('name', '==', identifier).limit(1).get();
  if (!snap.empty) return { id: snap.docs[0].id, ...(snap.docs[0].data() as any) };
  return null;
}

// HTTP endpoint to create a Checkout Preference  
export const mpCreatePreference = onRequest(
  { cors: true, memory: '256MiB', timeoutSeconds: 60 },
  async (req, res) => {
    if (req.method !== "POST") {
      res.status(405).send("Method Not Allowed");
      return;
    }

    try {
      const body = await parseBody(req);

      // Normaliza/valida
      const plano = String(body.plano || body.planId || 'standard').toLowerCase();
      const periodo = String(body.periodo || 'mensal').toLowerCase();
      const emailRaw = body.email || body?.payer?.email;
      if (!emailRaw || typeof emailRaw !== 'string' || !emailRaw.includes('@')) {
        res.status(400).json({ error: true, details: 'Email é obrigatório e deve ser válido' });
        return;
      }
      const email = emailRaw.trim().toLowerCase();

      // Carregar plano do Firestore
      const planDoc = await findPlan(plano);
      if (!planDoc) {
        res.status(400).json({ error: true, details: 'Plano não encontrado' });
        return;
      }
      const monthlyPrice = Number(planDoc.price || 0);
      const yearlyPrice = Math.round(monthlyPrice * 12 * 0.85 * 100) / 100; // 15% off
      const valor = periodo === 'anual' ? yearlyPrice : monthlyPrice;
      const proto = req.get('x-forwarded-proto') || req.protocol || 'https';
      const host = req.get('x-forwarded-host') || req.get('host');
      const baseUrl = `${proto}://${host}`;

      const preference = {
        items: [
          { title: `Plano ${plano} (${periodo})`, quantity: 1, currency_id: 'BRL', unit_price: valor },
        ],
        payer: { email },
        external_reference: email,
        back_urls: { success: `${baseUrl}/aprovado`, failure: `${baseUrl}/erro`, pending: `${baseUrl}/pendente` },
        auto_return: 'approved',
        notification_url: `${baseUrl}/mpWebhook`,
        metadata: { planId: planDoc.id, planName: planDoc.name, plano, periodo, email },
      } as any;
      if (!mpConfig) throw new Error("Mercado Pago não configurado");
      const preferenceClient = new Preference(mpConfig);
      const result = await preferenceClient.create({ body: preference } as any);
      const normalized = {
        preferenceId: (result as any)?.id,
        initPoint: (result as any)?.init_point || (result as any)?.sandbox_init_point,
        sandboxInitPoint: (result as any)?.sandbox_init_point,
        ...result,
      };
      res.status(200).json(normalized);
      return;
    } catch (error: any) {
      logger.error("Erro ao criar preferência:", error);
      res.status(500).json({ error: error?.message || "Erro interno" });
      return;
    }
  }
);

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

// Admin: conceder privilégios de admin a um usuário específico com secret
export const grantAdmin = onRequest(
  { cors: true, memory: '256MiB', timeoutSeconds: 60 },
  async (req, res) => {

  if (req.method !== 'POST') {
    res.status(405).send('Method Not Allowed');
    return;
  }

  const providedSecret = req.get('x-admin-secret') || req.query.secret;
  // Reutiliza o mesmo secret configurado do webhook para simplificar
  if (MP_WEBHOOK_SECRET && providedSecret !== MP_WEBHOOK_SECRET) {
    logger.warn('grantAdmin bloqueado: secret inválido');
    res.status(401).send('Unauthorized');
    return;
  }

  try {
    const body = await parseBody(req);
    const uid = body?.uid || req.query.uid;
    if (!uid || typeof uid !== 'string') {
      res.status(400).json({ error: 'uid é obrigatório' });
      return;
    }

    const db = admin.firestore();
    await db.collection('users').doc(uid).set({ isAdmin: true, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });

    logger.info(`Usuário ${uid} agora é admin.`);
    res.status(200).json({ ok: true, uid, isAdmin: true });
  } catch (error: any) {
    logger.error('Erro ao conceder admin:', error);
    res.status(500).json({ error: 'Erro interno' });
  }
  }
);

// Export Mercado Pago functions
export * from './mercadopago';

// export const helloWorld = onRequest((request, response) => {
//   logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });
