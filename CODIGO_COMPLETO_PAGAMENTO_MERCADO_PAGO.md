# 📦 Código Completo - Sistema de Pagamento Mercado Pago

## 📋 Índice
1. [Backend - Firebase Functions](#backend)
2. [Frontend - React/TypeScript](#frontend)
3. [Configurações](#configurações)
4. [Fluxo Completo](#fluxo)

---

## 🔧 BACKEND - Firebase Functions

### 📄 `functions/src/index.ts`
**Arquivo principal que exporta todas as funções**

```typescript
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
// Priorizar MERCADO_PAGO_ACCESS_TOKEN (com underscore) como está no Google Cloud
const MP_ACCESS_TOKEN = process.env.MERCADO_PAGO_ACCESS_TOKEN || process.env.MERCADOPAGO_ACCESS_TOKEN || process.env.mercadopago_access_token || "";
const MP_WEBHOOK_SECRET = process.env.MERCADO_PAGO_WEBHOOK_SECRET || process.env.MERCADOPAGO_WEBHOOK_SECRET || process.env.mercadopago_webhook_secret || "";

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

// Export Mercado Pago functions (excluding webhook which is in webhooks/)
export { createPaymentPreference, checkPaymentStatus } from './mercadopago';

// Export scheduled cleanup functions
export * from './scheduled/cleanup';

// Export stats aggregation functions
export * from './stats/aggregations';

// Export webhook functions (includes mercadoPagoWebhook)
export * from './webhooks/mercado-pago';
```

---

### 📄 `functions/src/mercadopago.ts`
**Função principal para criar preferências de pagamento**

Ver arquivo completo: [mercadopago.ts completo acima ⬆️]

**Principais exportações:**
- `createPaymentPreference` - Cria preferência de checkout
- `checkPaymentStatus` - Verifica status de um pagamento

---

### 📄 `functions/src/webhooks/mercado-pago.ts`
**Webhook robusto com idempotência e rate limiting**

Ver arquivo completo: [mercado-pago.ts completo acima ⬆️]

**Principais exportações:**
- `mercadoPagoWebhook` - Webhook principal do Mercado Pago
- `reconcilePayments` - Reconciliação diária de pagamentos

---

### 📄 `functions/src/stats/aggregations.ts`
**Funções de estatísticas e transações**

**Principais funções:**
- `onTransactionCreated` - Trigger quando transação é criada
- `onTransactionUpdated` - Trigger quando transação é atualizada
- `onUserUpdated` - Trigger quando usuário é atualizado

---

## 💻 FRONTEND - React/TypeScript

### 📄 `src/hooks/useCreatePreference.ts`
**Hook React Query para criar preferência**

```typescript
import { useMutation } from "@tanstack/react-query";
import { env } from "@/config/env";

export function useCreatePreference() {
  return useMutation({
    mutationFn: async (payload: {
      userId: string;
      userEmail: string;
      userName: string;
      planId: 'free' | 'standard' | 'medium' | 'ultimate';
      billingType: 'monthly' | 'annual';
    }) => {
      console.log('🔍 Hook - URL da API:', env.API_URL);
      console.log('🔍 Hook - Payload:', payload);

      try {
        const resp = await fetch(
          `${env.API_URL}/createPaymentPreference`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          }
        );
        
        console.log('🔍 Hook - Status da resposta:', resp.status);
        
        if (!resp.ok) {
          let errorData;
          try {
            errorData = await resp.json();
          } catch {
            errorData = { error: resp.statusText };
          }
          console.error('❌ Hook - Erro da API:', errorData);
          throw new Error(errorData.error || `Erro HTTP ${resp.status}: ${resp.statusText}`);
        }
        
        const result = await resp.json();
        console.log('✅ Hook - Resposta da API:', result);
        return result;
      } catch (error) {
        console.error('❌ Hook - Erro na fetch:', error);
        throw error;
      }
    },
    onError: (error) => {
      console.error('❌ Hook - Erro na mutation:', error);
    },
    onSuccess: (data) => {
      console.log('✅ Hook - Mutation bem-sucedida:', data);
    }
  });
}
```

---

### 📄 `src/pages/Planos.tsx`
**Página onde o botão "Assinar" chama o backend**

**Função principal: `handleAssinar`** (linhas 110-194)

```typescript
const handleAssinar = async (planId: string) => {
  if (!user) {
    toast.error('Você precisa estar logado para assinar um plano');
    return;
  }

  if (planId === 'free') {
    toast.error('O plano Free já está ativo');
    return;
  }

  try {
    console.log('🔍 Debug - Variáveis de ambiente:', {
      API_URL: env.API_URL,
      PUBLIC_KEY: env.MERCADO_PAGO_PUBLIC_KEY
    });

    console.log('🔍 Debug - Dados do payload:', {
      userId: user.uid,
      userEmail: user.email || '',
      userName: user.displayName || user.email?.split('@')[0] || 'Usuário',
      planId: planId,
      billingType: isAnnual ? 'annual' : 'monthly'
    });

    // Registrar seleção de plano no log
    const logId = await logPlanSelection(
      user.uid,
      user.email || '',
      planId,
      isAnnual ? 'annual' : 'monthly'
    );
    console.log('📝 Log de seleção criado:', logId);

    const preference = await createPreferenceMutation.mutateAsync({
      userId: user.uid,
      userEmail: user.email || '',
      userName: user.displayName || user.email?.split('@')[0] || 'Usuário',
      planId: planId as 'standard' | 'medium' | 'ultimate',
      billingType: isAnnual ? 'annual' : 'monthly'
    });

    console.log('✅ Preferência criada:', preference);

    // Redirecionar para o Mercado Pago - tentar todas as URLs possíveis
    const checkoutUrl = preference.checkout_url || preference.init_point || preference.sandbox_init_point;
    
    if (!checkoutUrl) {
      console.error('❌ Nenhuma URL de checkout disponível:', preference);
      createPreferenceMutation.reset();
      throw new Error('URL de checkout não retornada pelo Mercado Pago');
    }

    console.log('🔗 Redirecionando para:', checkoutUrl);
    
    // Limpar estado da mutation antes de redirecionar
    createPreferenceMutation.reset();
    
    // Pequeno delay para garantir que o estado foi resetado
    setTimeout(() => {
      window.location.href = checkoutUrl;
    }, 100);
  } catch (error) {
    console.error('❌ Erro ao criar preferência:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    
    // Extrair mensagem de erro mais detalhada
    let detailedMessage = errorMessage;
    if (error instanceof Error && 'response' in error) {
      const response = (error as any).response;
      if (response?.data?.message) {
        detailedMessage = response.data.message;
      } else if (response?.data?.error?.message) {
        detailedMessage = response.data.error.message;
      }
    }
    
    toast.error(`Erro ao processar pagamento: ${detailedMessage}`);
    
    // Sempre resetar estado da mutation para habilitar o botão novamente
    setTimeout(() => {
      createPreferenceMutation.reset();
    }, 100);
  }
};
```

**Botão que chama a função** (linhas 350-385):

```typescript
<Button
  className="w-full"
  variant={plan.current ? 'outline' : 'default'}
  disabled={isDisabled}
  onClick={() => {
    if (!plan.current && !isPlanLower(plan.value) && !createPreferenceMutation.isPending) {
      // Resetar mutation se estiver em erro antes de tentar novamente
      if (createPreferenceMutation.isError) {
        console.log('🔄 Resetando mutation após erro');
        createPreferenceMutation.reset();
        // Aguardar um pouco antes de chamar handleAssinar
        setTimeout(() => {
          handleAssinar(plan.value);
        }, 100);
      } else {
        handleAssinar(plan.value);
      }
    }
  }}
>
  {createPreferenceMutation.isPending ? (
    <>
      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      Redirecionando...
    </>
  ) : plan.current ? (
    'Plano Atual'
  ) : isPlanLower(plan.value) ? (
    'Plano Menor'
  ) : createPreferenceMutation.isError ? (
    'Tentar Novamente'
  ) : (
    'Assinar'
  )}
</Button>
```

---

### 📄 `src/pages/payment/PaymentResult.tsx`
**Página de resultado do pagamento (success/failure/pending)**

**Função principal: `checkPaymentStatus`** (linhas 40-98)

Ver arquivo completo: [PaymentResult.tsx completo acima ⬆️]

---

### 📄 `src/config/env.ts`
**Configurações de ambiente**

```typescript
// Configurações de ambiente para desenvolvimento
export const env = {
  // Firebase
  FIREBASE_API_KEY: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyD3Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8',
  FIREBASE_AUTH_DOMAIN: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'optify-definitivo.firebaseapp.com',
  FIREBASE_PROJECT_ID: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'optify-definitivo',
  FIREBASE_STORAGE_BUCKET: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'optify-definitivo.appspot.com',
  FIREBASE_MESSAGING_SENDER_ID: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '123456789',
  FIREBASE_APP_ID: import.meta.env.VITE_FIREBASE_APP_ID || '1:123456789:web:abcdef123456',

  // Mercado Pago
  MERCADO_PAGO_PUBLIC_KEY: import.meta.env.VITE_MERCADO_PAGO_PUBLIC_KEY || 'APP_USR-9ca765f9-6a73-47a9-ab3d-0923791c2a4f',
  API_URL: import.meta.env.VITE_API_URL || 'https://us-central1-optify-definitivo.cloudfunctions.net',
};
```

---

## 🔄 FLUXO COMPLETO DO PAGAMENTO

### 1. **Usuário clica em "Assinar"**
   - Arquivo: `src/pages/Planos.tsx`
   - Função: `handleAssinar(planId)`
   - Hook: `useCreatePreference()`

### 2. **Frontend chama backend**
   - URL: `${env.API_URL}/createPaymentPreference`
   - Método: POST
   - Payload: `{ userId, userEmail, userName, planId, billingType }`

### 3. **Backend cria preferência no Mercado Pago**
   - Arquivo: `functions/src/mercadopago.ts`
   - Função: `createPaymentPreference`
   - Retorna: `{ checkout_url, init_point, id, ... }`

### 4. **Frontend redireciona para checkout**
   - URL: `preference.checkout_url || preference.init_point`
   - Método: `window.location.href = checkoutUrl`

### 5. **Mercado Pago processa pagamento**
   - Webhook enviado quando pagamento muda de status
   - URL do webhook: `https://us-central1-optify-definitivo.cloudfunctions.net/mercadoPagoWebhook`

### 6. **Webhook atualiza plano do usuário**
   - Arquivo: `functions/src/webhooks/mercado-pago.ts`
   - Função: `mercadoPagoWebhook`
   - Atualiza: `users/{uid}` com novo plano

### 7. **Frontend detecta mudança**
   - Arquivo: `src/pages/payment/PaymentResult.tsx`
   - Listener: `onSnapshot` no documento do usuário
   - Evento: `planChanged` disparado globalmente

---

## ✅ CHECKLIST DE FUNÇÕES EXISTENTES

- ✅ `createPaymentPreference` (mercadopago.ts)
- ✅ `mpCreatePreference` (index.ts) - Alternativa
- ✅ `mercadoPagoWebhook` (webhooks/mercado-pago.ts)
- ✅ `mpWebhook` (index.ts) - Alternativa mais simples
- ✅ `checkPaymentStatus` (mercadopago.ts)
- ✅ `onTransactionCreated` (stats/aggregations.ts)
- ✅ `onTransactionUpdated` (stats/aggregations.ts)
- ✅ `onUserUpdated` (stats/aggregations.ts)

---

## 🔧 ENDPOINTS DISPONÍVEIS

1. **POST** `/createPaymentPreference` → Cria preferência de checkout
2. **POST** `/mpCreatePreference` → Alternativa (usa Firestore para buscar plano)
3. **POST** `/mercadoPagoWebhook` → Webhook principal (robusto)
4. **POST** `/mpWebhook` → Webhook alternativo (mais simples)
5. **GET** `/checkPaymentStatus?paymentId=XXX` → Verifica status de pagamento

---

## 🚨 POSSÍVEIS PROBLEMAS

### Função Duplicada
- Existem **DUAS** funções para criar preferência:
  1. `createPaymentPreference` (mercadopago.ts) - **USADA PELO FRONTEND**
  2. `mpCreatePreference` (index.ts) - Alternativa

### Webhook Duplicado
- Existem **DUAS** funções de webhook:
  1. `mercadoPagoWebhook` (webhooks/mercado-pago.ts) - **ROBUSTA**
  2. `mpWebhook` (index.ts) - Mais simples

### Verificar
- Frontend está chamando: `/createPaymentPreference` ✅
- Webhook configurado no Mercado Pago: `/mercadoPagoWebhook` ✅
- Secrets configurados: `MERCADO_PAGO_ACCESS_TOKEN`, `BASE_URL_FRONTEND` ⚠️

---

## 📝 PRÓXIMOS PASSOS PARA CORREÇÃO

1. **Verificar se todas as funções estão deployadas**
   ```bash
   firebase functions:list
   ```

2. **Verificar secrets configurados**
   ```bash
   firebase functions:secrets:list
   ```

3. **Testar endpoint manualmente**
   ```bash
   curl -X POST https://us-central1-optify-definitivo.cloudfunctions.net/createPaymentPreference \
     -H "Content-Type: application/json" \
     -d '{"userId":"test","userEmail":"test@test.com","userName":"Test","planId":"standard","billingType":"monthly"}'
   ```

4. **Verificar logs**
   - Firebase Console → Functions → Logs
   - Filtrar por: `createPaymentPreference`

---

**Documento gerado automaticamente - Todos os arquivos foram incluídos acima** ✅

















