# ADR 003: Agregações de Métricas Server-Side

## Status
✅ Aceito

## Contexto

O painel administrativo exibe métricas como:
- Receita total, semanal, mensal, diária
- Contagem de usuários ativos
- Distribuição de planos
- Melhor dia de vendas

Inicialmente, essas métricas eram calculadas no frontend a cada carregamento, resultando em:
- ❌ Alto número de reads (custoso)
- ❌ Performance ruim (5-10s para calcular)
- ❌ Inconsistências (cálculos diferentes)
- ❌ Vulnerabilidade (cliente pode manipular)

## Decisão

Implementar **agregações automáticas server-side** usando Firestore Triggers e Scheduled Functions.

### Arquitetura:

1. **Triggers em Tempo Real**
```typescript
export const onTransactionCreated = onDocumentCreated(
  { document: 'transactions_plans/{transactionId}' },
  async (event) => {
    const stats = await calculateGlobalStats();
    await db.collection('admin_stats').doc('global').set(stats);
  }
);
```

2. **Scheduled Recalculation**
```typescript
export const recalculateStatsDaily = onSchedule(
  { schedule: '0 1 * * *' }, // Todo dia às 1h
  async () => {
    const stats = await calculateGlobalStats();
    await db.collection('admin_stats').doc('global').set(stats);
  }
);
```

3. **Frontend Lê Agregações**
```typescript
// Antes: calcular no cliente (100+ reads)
const stats = calculateStatsLocally(transactions, users);

// Agora: ler agregação (1 read)
const statsDoc = await getDoc(doc(db, 'admin_stats', 'global'));
const stats = statsDoc.data();
```

## Alternativas Consideradas

### 1. BigQuery + Export diário
❌ **Rejeitado**: Custo alto, latência alta, complexidade desnecessária

### 2. Redis para cache
❌ **Rejeitado**: Infraestrutura extra, custo mensal, overhead de manutenção

### 3. Calcular apenas quando solicitado (on-demand)
❌ **Rejeitado**: Performance ruim, custo de reads alto

## Consequências

### Positivas
- ✅ Performance 50x melhor (< 200ms vs 5-10s)
- ✅ Custo 99% menor (1 read vs 100+ reads)
- ✅ Consistência garantida (única fonte de verdade)
- ✅ Segurança (zero cálculo no cliente)
- ✅ Histórico automático (daily_summaries)

### Negativas
- ⚠️ Latência de até 1h para estatísticas (trigger + cache)
- ⚠️ Custo extra de writes (triggers)
- ⚠️ Complexidade de manutenção (mais functions)

### Mitigações
- Recalculação diária para garantir consistência
- Fallback para cálculo local se agregação não existe
- Logs detalhados de discrepâncias
- Alertas se divergência > 5%

## Métricas de Sucesso

**Antes**:
- Tempo de carregamento: 5-10s
- Reads por carregamento: 100-500
- Custo mensal: ~$50 (em escala)

**Depois**:
- Tempo de carregamento: < 200ms ✅
- Reads por carregamento: 1-5 ✅
- Custo mensal: ~$2 ✅

## Estrutura de Dados

```typescript
// admin_stats/global
{
  totalUsers: 1523,
  activeUsers: 1204,
  totalRevenue: 125430.50,
  revenueToday: 2340.00,
  revenueWeek: 15680.00,
  revenueMonth: 45230.00,
  bestDay: "2024-12-15",
  totalTransactions: 3421,
  completedTransactions: 3156,
  pendingTransactions: 45,
  failedTransactions: 220,
  lastUpdated: Timestamp(2024-12-31 01:05:00)
}

// daily_summaries/{date}
{
  date: "2024-12-31",
  totalRevenue: 2340.00,
  totalTransactions: 23,
  activeUsers: 1204,
  newUsers: 15,
  churnUsers: 3
}
```

## Manutenção

### Verificar Consistência
```bash
# Forçar recalculação
gcloud functions call recalculateStatsDaily \
  --region=us-central1 \
  --project=optify-definitivo

# Comparar com cálculo local
# (via admin panel ou script)
```

### Adicionar Nova Métrica
1. Atualizar interface `AdminStats`
2. Adicionar cálculo em `calculateGlobalStats()`
3. Atualizar testes
4. Forçar recalculação completa

## Referências

- [Firebase Triggers](https://firebase.google.com/docs/functions/firestore-events)
- [Scheduled Functions](https://firebase.google.com/docs/functions/schedule-functions)
- [Firestore Data Aggregation](https://firebase.google.com/docs/firestore/solutions/aggregation)

---

**Data**: Dezembro 2024  
**Autor**: Diego Kamor  
**Revisores**: -  
**Status**: Implementado e em produção
