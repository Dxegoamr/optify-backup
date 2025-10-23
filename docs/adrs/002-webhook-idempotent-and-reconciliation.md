# ADR 002: Webhook Idempotente com Reconciliação Diária

## Status
✅ Aceito

## Contexto

Webhooks do Mercado Pago podem:
- Ser enviados múltiplas vezes (retry automático)
- Chegar fora de ordem
- Falhar temporariamente
- Ter atrasos significativos

Precisamos garantir que:
- Cada pagamento seja processado exatamente uma vez
- Divergências sejam detectadas e corrigidas
- O sistema seja resiliente a falhas temporárias

## Decisão

Implementar **webhook idempotente** com **reconciliação diária** usando três camadas de proteção:

### 1. Verificação HMAC
```typescript
function verifyHmac(signature: string, rawBody: string, secret: string) {
  const expectedHash = crypto.createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex');
  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(expectedHash));
}
```

### 2. Idempotência
```typescript
// Chave única por pagamento
const idemKey = `mp:${paymentId}`;

// Verificar se já processado
if (await alreadyProcessed(idemKey)) {
  return res.status(200).send('already_processed');
}

// Processar e marcar como processado
await applyBusinessEffects(paymentData);
await markProcessed(idemKey);
```

### 3. Reconciliação Diária
```typescript
export const reconcilePayments = onSchedule(
  { schedule: '0 2 * * *' }, // Todo dia às 2h
  async () => {
    // Buscar transações pendentes
    const pending = await db.collection('transactions_plans')
      .where('status', '==', 'pending')
      .where('createdAt', '>=', yesterday)
      .get();

    // Para cada transação, buscar status real na API
    for (const tx of pending.docs) {
      const paymentData = await fetchPaymentFromAPI(tx.data().transactionId);
      
      // Aplicar efeitos se status mudou
      if (paymentData.status !== 'pending') {
        await applyBusinessEffects(paymentData);
      }
    }
  }
);
```

### 4. Persistência de Eventos
```typescript
// Salvar evento bruto para auditoria
await db.collection('payments_events').doc(paymentId).set({
  eventId: paymentId,
  type,
  data: paymentData,
  timestamp: FieldValue.serverTimestamp(),
  processed: false,
});
```

## Alternativas Consideradas

### 1. Apenas verificação HMAC
❌ **Rejeitado**: Não previne replays, sem auditoria

### 2. Idempotência no Mercado Pago
❌ **Rejeitado**: Não temos controle sobre o Mercado Pago

### 3. Queue com retry manual
❌ **Rejeitado**: Complexidade desnecessária, Firebase já tem retry

## Consequências

### Positivas
- ✅ Zero duplicações de pagamento
- ✅ Auditoria completa (eventos persistidos)
- ✅ Resiliência a falhas temporárias
- ✅ Correção automática de divergências
- ✅ Segurança com HMAC

### Negativas
- ⚠️ Custo extra de leitura (verificação de idempotência)
- ⚠️ Storage extra (eventos persistidos)
- ⚠️ Scheduled function usa quota

### Mitigações
- Limpeza automática de chaves antigas (7 dias)
- Limpeza de eventos antigos (90 dias)
- Índices otimizados para queries de reconciliação

## Métricas de Sucesso

- ✅ Taxa de duplicação: 0%
- ✅ Taxa de divergência: < 0.1%
- ✅ Tempo de reconciliação: < 5min
- ✅ Custo de idempotência: < $1/mês

## Implementação

```typescript
// Fluxo completo
export const mercadoPagoWebhook = onRequest(async (req, res) => {
  // 1. Verificar HMAC
  if (!verifyHmac(signature, rawBody, secret)) {
    return res.status(401).send('Unauthorized');
  }

  // 2. Verificar idempotência
  const idemKey = `mp:${paymentId}`;
  if (await alreadyProcessed(idemKey)) {
    return res.status(200).send('already_processed');
  }

  // 3. Buscar dados atuais (server-to-server)
  const paymentData = await fetchPaymentFromAPI(paymentId);

  // 4. Persistir evento
  await saveRawEvent(paymentId, type, paymentData);

  // 5. Aplicar efeitos de negócio
  await applyBusinessEffects(paymentData);

  // 6. Marcar como processado
  await markProcessed(idemKey, { paymentId, status: paymentData.status });

  return res.status(200).send('ok');
});
```

## Referências

- [Mercado Pago Webhooks](https://www.mercadopago.com.br/developers/pt/docs/your-integrations/notifications/webhooks)
- [Idempotency Patterns](https://stripe.com/docs/api/idempotent_requests)
- [HMAC Security](https://en.wikipedia.org/wiki/HMAC)

---

**Data**: Dezembro 2024  
**Autor**: Diego Kamor  
**Revisores**: -  
**Status**: Implementado e em produção
