# Prompt para Correção de Problema de Soma de FreeBet e Exclusão de Transações

## Contexto do Sistema

Estou trabalhando em um sistema de gestão financeira chamado Optify, construído com React/TypeScript e Firebase. O sistema gerencia transações financeiras (depósitos, saques, FreeBet e Surebet) e calcula lucros diários e mensais.

## Estrutura de Dados

### Tipos de Transações:
- **Depósito (deposit)**: Valor negativo no lucro (reduz o lucro)
- **Saque (withdraw)**: Valor positivo no lucro (aumenta o lucro)
- **FreeBet**: Sempre POSITIVO no lucro (mesmo que seja tipo 'deposit')
- **Surebet**: Sempre POSITIVO no lucro (mesmo que seja tipo 'deposit')

### Resumos Diários (DailySummary):
Quando um dia é "fechado", todas as transações daquele dia são consolidadas em um `DailySummary` que contém:
- `totalDeposits`: Soma de depósitos normais (sem FreeBet/Surebet)
- `totalWithdraws`: Soma de saques
- `profit`: Lucro total do dia (calculado como: withdraws - deposits + surebet + freebet)
- `transactionCount`: Número de transações
- `transactionsSnapshot`: Array com todas as transações do dia

## Problema Principal

### Cenário 1: Exclusão de Transações Causa Valores Incorretos

**Situação:**
1. Usuário registra: Depósito R$ 100,00 + Saque R$ 210,00
2. Lucro esperado: R$ 110,00 (210 - 100)
3. Usuário registra FreeBet de R$ 50,00 de lucro
4. Lucro esperado após FreeBet: R$ 160,00 (110 + 50)
5. **PROBLEMA**: Ao excluir todas as transações, o sistema mostra lucro negativo de R$ 60,00 em vez de R$ 0,00

**Comportamento Atual:**
- Quando uma transação é excluída, o sistema tenta subtrair valores do resumo diário
- Isso causa inconsistências porque:
  - Se o resumo diário foi criado com base em todas as transações, e depois algumas são excluídas, o resumo fica desatualizado
  - A lógica de subtração não considera corretamente FreeBet e Surebet
  - Quando todas as transações são excluídas, o resumo diário ainda existe com valores antigos

**Comportamento Esperado:**
- Ao excluir uma transação, o sistema deve RECALCULAR o resumo diário baseado nas transações RESTANTES
- Se não houver mais transações, o resumo diário deve ser DELETADO ou zerado
- O cálculo deve sempre refletir o estado atual das transações

### Cenário 2: Receita Mensal Não Atualiza

**Situação:**
1. Usuário tem lucro de R$ 110,00 no dia (depósito 100 + saque 210)
2. Usuário fecha FreeBet de R$ 50,00
3. Lucro esperado: R$ 160,00
4. **PROBLEMA**: Receita do mês mostra R$ 50,00 em vez de R$ 160,00
5. Usuário registra novo saque de R$ 300,00
6. **PROBLEMA**: Receita do mês continua mostrando R$ 50,00, mas receita do dia mostra corretamente

**Comportamento Atual:**
- A receita mensal está usando resumos diários que podem estar desatualizados
- Quando há um resumo diário para o dia atual, o sistema usa esse resumo em vez de calcular das transações atuais
- Novas transações não são refletidas na receita mensal se já existe resumo diário

**Comportamento Esperado:**
- A receita do dia atual deve SEMPRE ser calculada diretamente das transações (não usar resumo diário)
- A receita mensal deve usar resumos diários apenas para dias passados
- Para o dia atual, sempre calcular das transações atuais

### Cenário 3: FreeBet Sobrepondo em vez de Somar

**Situação:**
1. Lucro inicial: R$ 110,00 (depósito 100 + saque 210)
2. Usuário fecha FreeBet de R$ 50,00
3. **PROBLEMA**: Lucro fica R$ 50,00 (sobrepôs) em vez de R$ 160,00 (deveria somar)

**Comportamento Atual:**
- Quando FreeBet é fechado e já existe resumo diário, o sistema SUBSTITUI o resumo em vez de SOMAR
- O código atual tem lógica que substitui o resumo diário quando já existe um

**Comportamento Esperado:**
- FreeBet deve SOMAR ao lucro existente, não substituir
- Se já existe resumo diário e há FreeBet, deve somar: `existingProfit + freebetProfit`

## Código Atual (Problemas Identificados)

### 1. Função de Exclusão (`user-specific.service.ts`):

```typescript
static async deleteTransaction(userId: string, transactionId: string): Promise<void> {
  // Buscar transação antes de excluir
  const transaction = allTransactions.find(t => t.id === transactionId);
  
  // Excluir transação
  await UserSubcollectionsService.deleteFromUserSubcollection(...);
  
  // PROBLEMA: Tenta subtrair valores do resumo diário
  if (existingSummary) {
    // Lógica de subtração que causa inconsistências
    await UserDailySummaryService.updateDailySummary(userId, existingSummary.id, {
      totalDeposits: (existingSummary.totalDeposits || 0) - depositContribution,
      totalWithdraws: (existingSummary.totalWithdraws || 0) - withdrawContribution,
      profit: (existingSummary.profit || 0) - transactionProfit,
      // ...
    });
  }
}
```

**Problema**: Subtrai valores em vez de recalcular baseado nas transações restantes.

### 2. Cálculo de Receita do Dia (`Dashboard.tsx`):

```typescript
if (todaySummary) {
  // PROBLEMA: Usa resumo diário e tenta somar transações novas
  todayRevenue = todaySummary.profit || todaySummary.margin || 0;
  
  // Filtra transações criadas depois do resumo
  const transactionsAfterSummary = todayTransactions.filter(...);
  // ...
}
```

**Problema**: Usa resumo diário que pode estar desatualizado. Deveria sempre calcular das transações atuais.

### 3. Cálculo de Receita Mensal (`Dashboard.tsx` e `Relatorios.tsx`):

```typescript
// PROBLEMA: Usa resumos diários incluindo o dia atual
const monthlySummaries = dailySummaries.filter((summary: any) => {
  return summaryDate.getFullYear() === currentYear && 
         summaryDate.getMonth() === currentMonth;
});

// Soma resumos + transações abertas
const monthlyRevenue = monthlyRevenueFromSummaries + monthlyRevenueFromTransactions;
```

**Problema**: Inclui resumo do dia atual que pode estar desatualizado. Deveria excluir resumos do dia atual e sempre calcular das transações.

### 4. Fechamento de Dia com FreeBet (`ResumoDia.tsx`):

```typescript
if (existingSummary) {
  // PROBLEMA: Substitui resumo em vez de somar FreeBet
  summaryData = {
    profit: profitToClose, // Substitui, não soma
    // ...
  };
}
```

**Problema**: Quando há FreeBet e já existe resumo, deveria somar o FreeBet ao lucro existente.

## Regras de Negócio Importantes

1. **FreeBet**: Sempre positivo no lucro, mesmo sendo tipo 'deposit'
2. **Surebet**: Sempre positivo no lucro, mesmo sendo tipo 'deposit'
3. **Depósito Normal**: Negativo no lucro (reduz)
4. **Saque**: Positivo no lucro (aumenta)
5. **Resumo Diário**: Deve refletir EXATAMENTE o estado atual das transações
6. **Dia Atual**: Sempre calcular das transações atuais, nunca usar resumo diário

## Soluções Necessárias

### 1. Corrigir Exclusão de Transações:
- Recalcular resumo diário baseado nas transações RESTANTES após exclusão
- Se não houver mais transações, deletar o resumo diário
- Tratar FreeBet, Surebet e transações normais corretamente no recálculo

### 2. Corrigir Receita do Dia:
- Sempre calcular diretamente das transações do dia atual
- Ignorar resumo diário para o dia atual
- Incluir FreeBet e Surebet corretamente no cálculo

### 3. Corrigir Receita Mensal:
- Excluir resumos diários do dia atual do cálculo mensal
- Calcular receita do dia atual diretamente das transações
- Usar resumos diários apenas para dias passados

### 4. Corrigir Fechamento com FreeBet:
- Quando há FreeBet e já existe resumo diário, SOMAR o lucro do FreeBet
- Não substituir o resumo, mas adicionar o FreeBet ao lucro existente

## Estrutura de Arquivos

- `src/core/services/user-specific.service.ts`: Contém `deleteTransaction` e métodos de resumo diário
- `src/pages/Dashboard.tsx`: Calcula receita do dia e mensal
- `src/pages/Relatorios.tsx`: Calcula estatísticas mensais
- `src/pages/ResumoDia.tsx`: Função `handleCloseDay` que fecha o dia

## Perguntas para o ChatGPT

1. Como recalcular corretamente o resumo diário após excluir uma transação?
2. Qual a melhor abordagem para garantir que o dia atual sempre use transações atuais?
3. Como implementar a lógica de somar FreeBet ao lucro existente sem substituir?
4. Como garantir consistência entre receita do dia e receita mensal?

## Exemplo de Cálculo Correto

**Cenário:**
- Depósito: R$ 100,00
- Saque: R$ 210,00
- FreeBet: R$ 50,00

**Cálculo Esperado:**
```
Lucro = Saques - Depósitos + FreeBet + Surebet
Lucro = 210 - 100 + 50 + 0
Lucro = R$ 160,00
```

**Após Excluir FreeBet:**
```
Lucro = 210 - 100 + 0 + 0
Lucro = R$ 110,00
```

**Após Excluir Todas as Transações:**
```
Lucro = 0 - 0 + 0 + 0
Lucro = R$ 0,00
(Resumo diário deve ser deletado)
```

## Estado Atual do Código (Após Tentativas de Correção)

### Código Atual de Exclusão (Já Modificado):

```typescript
static async deleteTransaction(userId: string, transactionId: string): Promise<void> {
  const allTransactions = await this.getTransactions(userId, 1000);
  const transaction = allTransactions.find(t => t.id === transactionId);
  const transactionDate = transaction?.date;
  
  // Excluir a transação
  await UserSubcollectionsService.deleteFromUserSubcollection(...);
  
  if (transaction && transactionDate) {
    const existingSummary = await UserDailySummaryService.getDailySummaryByDate(userId, transactionDate);
    
    if (existingSummary) {
      // Buscar transações RESTANTES após exclusão
      const remainingTransactions = await this.getTransactionsByDateRange(
        userId, transactionDate, transactionDate
      );
      
      // Se não há mais transações, deletar resumo
      if (remainingTransactions.length === 0) {
        await UserDailySummaryService.deleteDailySummary(userId, existingSummary.id);
        return;
      }
      
      // Recalcular baseado nas transações restantes
      const freebetTransactions = remainingTransactions.filter((t: any) => 
        t.description && t.description.startsWith('FreeBet')
      );
      const surebetTransactions = remainingTransactions.filter((t: any) => 
        t.description && t.description.startsWith('Surebet')
      );
      const otherDeposits = remainingTransactions.filter((t: any) =>
        t.type === 'deposit' && 
        (!t.description || (!t.description.startsWith('Surebet') && !t.description.startsWith('FreeBet')))
      );
      const withdraws = remainingTransactions.filter((t: any) => t.type === 'withdraw');
      
      const totalFreebetProfit = freebetTransactions.reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0);
      const totalSurebetProfit = surebetTransactions.reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0);
      const totalDeposits = otherDeposits.reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0);
      const totalWithdraws = withdraws.reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0);
      
      const recalculatedProfit = totalWithdraws - totalDeposits + totalSurebetProfit + totalFreebetProfit;
      
      await UserDailySummaryService.updateDailySummary(userId, existingSummary.id, {
        totalDeposits: totalDeposits,
        totalWithdraws: totalWithdraws,
        profit: recalculatedProfit,
        margin: recalculatedProfit,
        transactionCount: remainingTransactions.length,
        transactionsSnapshot: remainingTransactions,
        updatedAt: new Date(),
      });
    }
  }
}
```

**Status**: Esta lógica foi implementada, mas ainda há problemas.

### Código Atual de Receita do Dia (Já Modificado):

```typescript
// CORREÇÃO: Para o dia atual, SEMPRE calcular diretamente das transações
const surebetTransactions = todayTransactions.filter((t: any) =>
  t.description && t.description.startsWith('Surebet')
);
const freebetTransactions = todayTransactions.filter((t: any) =>
  t.description && t.description.startsWith('FreeBet')
);
const otherDeposits = todayTransactions.filter((t: any) =>
  t.type === 'deposit' && 
  (!t.description || (!t.description.startsWith('Surebet') && !t.description.startsWith('FreeBet')))
);
const withdraws = todayTransactions.filter((t: any) => t.type === 'withdraw');

const totalSurebetProfit = surebetTransactions.reduce((sum, t) => sum + (t.amount || 0), 0);
const totalFreebetProfit = freebetTransactions.reduce((sum, t) => sum + (t.amount || 0), 0);
const todayDeposits = otherDeposits.reduce((sum, t) => sum + (t.amount || 0), 0) || 0;
const todayWithdraws = withdraws.reduce((sum, t) => sum + (t.amount || 0), 0) || 0;

const todayRevenue = todayWithdraws - todayDeposits + totalSurebetProfit + totalFreebetProfit;
```

**Status**: Esta lógica parece correta, mas pode haver problemas na receita mensal.

### Código Atual de Receita Mensal (Já Modificado):

```typescript
// Filtrar fechamentos diários do mês atual (EXCETO o dia atual)
const monthlySummaries = dailySummaries.filter((summary: any) => {
  const summaryDate = new Date(summary.date);
  const isCurrentMonth = summaryDate.getFullYear() === currentYear && summaryDate.getMonth() === currentMonth;
  const isToday = summary.date === today;
  return isCurrentMonth && !isToday; // Excluir resumos do dia atual
});

// Somar lucros dos fechamentos diários (apenas dias passados)
const monthlyRevenueFromSummaries = monthlySummaries.reduce((total: number, summary: any) => {
  return total + (summary.profit || summary.margin || 0);
}, 0);

// Para o dia atual e outros dias não fechados, calcular diretamente das transações
const closedDates = new Set(monthlySummaries.map((summary: any) => summary.date));
const openTransactions = monthlyTransactions.filter((transaction: any) => {
  const transactionDate = transaction.date;
  if (closedDates.has(transactionDate) && transactionDate !== today) {
    return false;
  }
  if (transactionDate === today) {
    return true; // Sempre incluir transações do dia atual
  }
  return true;
});

const monthlyRevenueFromTransactions = openTransactions.reduce((total: number, transaction: any) => {
  const isSurebet = transaction.description && transaction.description.startsWith('Surebet');
  const isFreeBet = transaction.description && transaction.description.startsWith('FreeBet');
  let transactionProfit;
  if (isSurebet || isFreeBet) {
    transactionProfit = transaction.amount;
  } else {
    transactionProfit = transaction.type === 'withdraw' ? transaction.amount : -transaction.amount;
  }
  return total + transactionProfit;
}, 0);

const monthlyRevenue = monthlyRevenueFromSummaries + monthlyRevenueFromTransactions;
```

**Status**: Esta lógica foi implementada, mas ainda há problemas.

## Problemas Persistindo

Apesar das correções implementadas, o usuário ainda relata:

1. **Ao excluir todas as transações**: Sistema mostra lucro negativo em vez de zero
2. **Ao excluir FreeBet**: Sistema mostra valores incorretos
3. **Ao adicionar nova transação**: Receita mensal não atualiza, mas receita do dia atualiza

## Possíveis Causas Raiz

1. **Cache/Estado Desatualizado**: O React Query pode estar usando cache antigo
2. **Timing de Atualização**: O resumo diário pode não estar sendo atualizado antes do cálculo
3. **Lógica de Fechamento**: O fechamento de dia pode estar criando resumos incorretos
4. **Sincronização**: Pode haver problema de sincronização entre exclusão e recálculo

## Observações Importantes

- O sistema usa Firebase Firestore para armazenar dados
- As transações têm campo `description` que identifica FreeBet (`description.startsWith('FreeBet')`) e Surebet (`description.startsWith('Surebet')`)
- O campo `date` nas transações está no formato 'YYYY-MM-DD'
- Os resumos diários são armazenados em `dailySummaries` collection
- Quando um dia é fechado, as transações são deletadas e consolidadas no resumo
- O sistema usa React Query para cache e invalidação de queries
- Há hooks `useDeleteTransaction` que invalidam queries após exclusão

## O Que Precisa Ser Corrigido

Por favor, ajude-me a identificar e corrigir:

1. **Por que a exclusão ainda causa valores incorretos?**
   - A lógica de recálculo está correta?
   - Há problema de timing/async?
   - O cache está sendo invalidado corretamente?

2. **Por que a receita mensal não atualiza?**
   - A lógica de exclusão do dia atual está funcionando?
   - As queries estão sendo refetchadas?
   - Há problema na ordem de execução?

3. **Como garantir que FreeBet sempre some?**
   - A lógica de fechamento está correta?
   - Como detectar quando há FreeBet nas transações a serem fechadas?

4. **Como garantir consistência total?**
   - Qual a melhor estratégia para manter dados sincronizados?
   - Devo recalcular tudo sempre ou usar cache inteligente?

Por favor, forneça uma solução completa e testada que resolva todos esses problemas.

## Relatos Específicos do Usuário

### Relato 1: Exclusão Causando Valores Negativos
"Excluí as movimentações que fiz (100 de depósito, 210 de saque e 50 de freebet) e fiquei negativado 60. Isso não era pra acontecer."

**Análise:**
- Depósito: -R$ 100,00
- Saque: +R$ 210,00  
- FreeBet: +R$ 50,00
- Lucro esperado: R$ 160,00
- Após excluir tudo, deveria ser: R$ 0,00
- Mas está mostrando: -R$ 60,00

### Relato 2: Exclusão de FreeBet Causando Problema
"Quando exclui a operação da freebet eu fiquei -110."

**Análise:**
- Antes: R$ 160,00 (depósito 100 + saque 210 + freebet 50)
- Após excluir FreeBet: Deveria ser R$ 110,00
- Mas está mostrando: -R$ 110,00 (invertido!)

### Relato 3: Nova Transação Não Atualiza Receita Mensal
"Registrei um saque de 300 e ainda continua -110 mas lá na receita hoje consta a soma certa."

**Análise:**
- Receita do dia: Está correta (mostra valores atualizados)
- Receita mensal: Está incorreta (mostra -R$ 110,00)
- Nova transação de R$ 300,00 não está sendo refletida na receita mensal

## Diagnóstico

Os problemas indicam que:

1. **A exclusão está invertendo sinais ou subtraindo incorretamente**
2. **A receita mensal está usando dados em cache ou resumos desatualizados**
3. **Há uma desconexão entre o cálculo do dia e o cálculo mensal**

## Informações Técnicas Adicionais

### Hooks e Serviços Usados:
- `useTransactions`: Busca transações do Firebase
- `useAllDailySummaries`: Busca resumos diários
- `useDeleteTransaction`: Hook que chama `UserTransactionService.deleteTransaction`
- `UserTransactionService.getTransactionsByDateRange`: Busca transações por data
- `UserDailySummaryService.getDailySummaryByDate`: Busca resumo diário por data
- `UserDailySummaryService.updateDailySummary`: Atualiza resumo diário
- `UserDailySummaryService.deleteDailySummary`: Deleta resumo diário

### Fluxo de Dados:
1. Usuário exclui transação → `useDeleteTransaction` → `UserTransactionService.deleteTransaction`
2. `deleteTransaction` exclui do Firebase e recalcula resumo diário
3. React Query invalida queries relacionadas
4. Componentes refazem fetch dos dados
5. Cálculos são refeitos com novos dados

### Possíveis Pontos de Falha:
- **Timing**: O resumo pode não estar atualizado quando o cálculo é feito
- **Cache**: React Query pode estar usando cache antigo
- **Async**: Operações assíncronas podem não estar sendo aguardadas corretamente
- **Lógica de Sinal**: Pode haver inversão de sinais em algum lugar

Por favor, analise todo o código e forneça uma solução robusta que garanta:
1. ✅ Exclusão sempre recalcula corretamente
2. ✅ Receita do dia sempre atualizada
3. ✅ Receita mensal sempre sincronizada
4. ✅ FreeBet sempre somado corretamente
5. ✅ Sem valores negativos incorretos
6. ✅ Consistência entre todas as páginas

---

# CÓDIGOS COMPLETOS SOLICITADOS

## 1. UserTransactionService.deleteTransaction - Código Completo

```typescript
// Arquivo: src/core/services/user-specific.service.ts
// Classe: UserTransactionService

static async deleteTransaction(userId: string, transactionId: string): Promise<void> {
  // Buscar a transação antes de excluir para atualizar o resumo diário
  const allTransactions = await this.getTransactions(userId, 1000);
  const transaction = allTransactions.find(t => t.id === transactionId);
  const transactionDate = transaction?.date;
  
  // Excluir a transação
  await UserSubcollectionsService.deleteFromUserSubcollection(
    userId, 
    USER_SUBCOLLECTIONS.TRANSACTIONS, 
    transactionId
  );
  
  // Se encontrou a transação, recalcular o resumo diário baseado nas transações restantes
  if (transaction && transactionDate) {
    try {
      const existingSummary = await UserDailySummaryService.getDailySummaryByDate(userId, transactionDate);
      
      if (existingSummary) {
        // Buscar todas as transações RESTANTES do dia após a exclusão
        const remainingTransactions = await this.getTransactionsByDateRange(
          userId,
          transactionDate,
          transactionDate
        );
        
        // Se não há mais transações, deletar o resumo diário
        if (remainingTransactions.length === 0) {
          await UserDailySummaryService.deleteDailySummary(userId, existingSummary.id);
          return;
        }
        
        // CORREÇÃO: Recalcular o resumo diário baseado nas transações RESTANTES
        // Separar FreeBet, Surebet e transações normais
        const freebetTransactions = remainingTransactions.filter((t: any) => 
          t.description && t.description.startsWith('FreeBet')
        );
        const surebetTransactions = remainingTransactions.filter((t: any) => 
          t.description && t.description.startsWith('Surebet')
        );
        const otherDeposits = remainingTransactions.filter((t: any) =>
          t.type === 'deposit' && 
          (!t.description || (!t.description.startsWith('Surebet') && !t.description.startsWith('FreeBet')))
        );
        const withdraws = remainingTransactions.filter((t: any) => t.type === 'withdraw');
        
        // Calcular totais corretamente
        const totalFreebetProfit = freebetTransactions.reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0);
        const totalSurebetProfit = surebetTransactions.reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0);
        const totalDeposits = otherDeposits.reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0);
        const totalWithdraws = withdraws.reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0);
        
        // FreeBet e Surebet sempre positivos no lucro
        const recalculatedProfit = totalWithdraws - totalDeposits + totalSurebetProfit + totalFreebetProfit;
        
        // Atualizar o resumo diário com os valores recalculados
        await UserDailySummaryService.updateDailySummary(userId, existingSummary.id, {
          totalDeposits: totalDeposits,
          totalWithdraws: totalWithdraws,
          profit: recalculatedProfit,
          margin: recalculatedProfit,
          transactionCount: remainingTransactions.length,
          transactionsSnapshot: remainingTransactions,
          updatedAt: new Date(),
        });
      }
    } catch (error) {
      console.error('Erro ao atualizar resumo diário ao excluir transação:', error);
      // Não falhar a exclusão se a atualização do resumo falhar
    }
  }
}

// Métodos auxiliares usados acima:
static async getTransactions(userId: string, limitCount: number = 100): Promise<UserTransaction[]> {
  return UserSubcollectionsService.getAllFromUserSubcollection<UserTransaction>(
    userId, 
    USER_SUBCOLLECTIONS.TRANSACTIONS,
    [limit(limitCount)]
  );
}

static async getTransactionsByDateRange(userId: string, startDate: string, endDate: string): Promise<UserTransaction[]> {
  const transactions = await UserSubcollectionsService.getAllFromUserSubcollection<UserTransaction>(
    userId, 
    USER_SUBCOLLECTIONS.TRANSACTIONS,
    [
      where('date', '>=', startDate),
      where('date', '<=', endDate)
    ]
  );
  return transactions;
}
```

## 2. UserDailySummaryService - Código Completo

```typescript
// Arquivo: src/core/services/user-specific.service.ts
// Classe: UserDailySummaryService

export class UserDailySummaryService {
  static async createDailySummary(userId: string, summaryData: Omit<UserDailySummary, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    return UserSubcollectionsService.addToUserSubcollection(
      userId,
      USER_SUBCOLLECTIONS.DAILY_SUMMARIES,
      summaryData
    );
  }

  static async getAllDailySummaries(userId: string): Promise<UserDailySummary[]> {
    const summaries = await UserSubcollectionsService.getAllFromUserSubcollection<UserDailySummary>(
      userId,
      USER_SUBCOLLECTIONS.DAILY_SUMMARIES,
      []
    );
    return summaries;
  }

  static async updateDailySummary(userId: string, summaryId: string, summaryData: Partial<UserDailySummary>): Promise<void> {
    return UserSubcollectionsService.updateUserSubcollection(
      userId,
      USER_SUBCOLLECTIONS.DAILY_SUMMARIES,
      summaryId,
      summaryData
    );
  }

  static async deleteDailySummary(userId: string, summaryId: string): Promise<void> {
    return UserSubcollectionsService.deleteFromUserSubcollection(
      userId,
      USER_SUBCOLLECTIONS.DAILY_SUMMARIES,
      summaryId
    );
  }

  static async getDailySummaries(userId: string, limitCount: number = 30): Promise<UserDailySummary[]> {
    return UserSubcollectionsService.getAllFromUserSubcollection<UserDailySummary>(
      userId, 
      USER_SUBCOLLECTIONS.DAILY_SUMMARIES,
      [orderBy('date', 'desc'), limit(limitCount)]
    );
  }

  static async getDailySummaryByDate(userId: string, date: string): Promise<UserDailySummary | null> {
    const summaries = await UserSubcollectionsService.getAllFromUserSubcollection<UserDailySummary>(
      userId, 
      USER_SUBCOLLECTIONS.DAILY_SUMMARIES,
      [where('date', '==', date), limit(1)]
    );
    
    return summaries.length > 0 ? summaries[0] : null;
  }
}

// Interface UserDailySummary:
export interface UserDailySummary {
  id: string;
  date: string; // Formato: 'YYYY-MM-DD'
  totalDeposits: number;
  totalWithdraws: number;
  profit: number;
  margin?: number;
  transactionCount: number;
  transactionsSnapshot: any; // Array de transações
  byEmployee: any[];
  createdAt: Date;
  updatedAt: Date;
}
```

## 3. UserSubcollectionsService - Código Completo (Helper usado por todos os serviços)

```typescript
// Arquivo: src/core/services/user-subcollections.service.ts

import { 
  doc, 
  setDoc, 
  getDoc, 
  collection, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '@/integrations/firebase/config';

export class UserSubcollectionsService {
  private static usersCollection = 'users';

  static async getAllFromUserSubcollection<T>(
    userId: string, 
    subcollection: string,
    constraints: any[] = []
  ): Promise<T[]> {
    try {
      const subcollectionRef = collection(db, this.usersCollection, userId, subcollection);
      const q = query(subcollectionRef, ...constraints);
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date()
      })) as T[];
    } catch (error) {
      console.error(`Erro ao buscar todos de ${subcollection}:`, error);
      throw new Error(`Falha ao buscar dados de ${subcollection}`);
    }
  }

  static async addToUserSubcollection<T>(
    userId: string, 
    subcollection: string, 
    data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<string> {
    try {
      const subcollectionRef = collection(db, this.usersCollection, userId, subcollection);
      const dataWithTimestamps = {
        ...data,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      const docRef = await addDoc(subcollectionRef, dataWithTimestamps);
      return docRef.id;
    } catch (error) {
      console.error(`Erro ao adicionar em ${subcollection}:`, error);
      throw new Error(`Falha ao adicionar dados em ${subcollection}`);
    }
  }

  static async updateUserSubcollection<T>(
    userId: string, 
    subcollection: string, 
    docId: string, 
    data: Partial<T>
  ): Promise<void> {
    try {
      const docRef = doc(db, this.usersCollection, userId, subcollection, docId);
      
      const cleanData = Object.fromEntries(
        Object.entries(data).filter(([_, value]) => value !== undefined)
      );
      
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        await updateDoc(docRef, {
          ...cleanData,
          updatedAt: serverTimestamp()
        });
      } else {
        await setDoc(docRef, {
          ...cleanData,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }
    } catch (error) {
      console.error(`Erro ao atualizar ${subcollection}:`, error);
      throw new Error(`Falha ao atualizar dados de ${subcollection}`);
    }
  }

  static async deleteFromUserSubcollection(
    userId: string, 
    subcollection: string, 
    docId: string
  ): Promise<void> {
    try {
      const docRef = doc(db, this.usersCollection, userId, subcollection, docId);
      await deleteDoc(docRef);
    } catch (error) {
      console.error(`Erro ao deletar de ${subcollection}:`, error);
      throw new Error(`Falha ao deletar dados de ${subcollection}`);
    }
  }
}

// Constantes para as subcoleções
export const USER_SUBCOLLECTIONS = {
  PROFILE: 'profile',
  CONFIG: 'config',
  EMPLOYEES: 'employees',
  PLATFORMS: 'platforms',
  TRANSACTIONS: 'transactions',
  DAILY_SUMMARIES: 'dailySummaries',
  ACCOUNTS: 'accounts',
  PAYMENTS: 'payments',
  GOALS: 'goals',
  REPORTS: 'reports',
  SUREBET_RECORDS: 'surebetRecords'
} as const;
```

## 4. Dashboard.tsx - Cálculo de Receita do Dia e Mensal

```typescript
// Arquivo: src/pages/Dashboard.tsx
// Apenas a parte que calcula receita do dia e mensal

// Imports relevantes:
import { getCurrentDateStringInSaoPaulo, getCurrentDateInSaoPaulo } from '@/utils/timezone';
import { useTransactions, useAllDailySummaries } from '@/hooks/useFirestore';

// Dentro do componente Dashboard:

const today = getCurrentDateStringInSaoPaulo(); // Formato: 'YYYY-MM-DD'
const { data: todayTransactions = [] } = useTransactions(user?.uid || '', today, today);
const { data: monthlyTransactions = [] } = useTransactions(user?.uid || '', firstDayOfMonth, lastDayOfMonth);
const { data: dailySummaries = [] } = useAllDailySummaries(user?.uid || '');

// CORREÇÃO: Para o dia atual, SEMPRE calcular diretamente das transações (não usar resumo diário)
const surebetTransactions = todayTransactions.filter((t: any) =>
  t.description && t.description.startsWith('Surebet')
);
const freebetTransactions = todayTransactions.filter((t: any) =>
  t.description && t.description.startsWith('FreeBet')
);
const otherDeposits = todayTransactions.filter((t: any) =>
  t.type === 'deposit' && 
  (!t.description || (!t.description.startsWith('Surebet') && !t.description.startsWith('FreeBet')))
);
const withdraws = todayTransactions.filter((t: any) => t.type === 'withdraw');

const totalSurebetProfit = surebetTransactions.reduce((sum, t) => sum + (t.amount || 0), 0);
const totalFreebetProfit = freebetTransactions.reduce((sum, t) => sum + (t.amount || 0), 0);
const todayDeposits = otherDeposits.reduce((sum, t) => sum + (t.amount || 0), 0) || 0;
const todayWithdraws = withdraws.reduce((sum, t) => sum + (t.amount || 0), 0) || 0;

// FreeBet e Surebet sempre positivos no lucro
const todayRevenue = todayWithdraws - todayDeposits + totalSurebetProfit + totalFreebetProfit;

// Calcular receita mensal
const currentYear = getCurrentDateInSaoPaulo().getFullYear();
const currentMonth = getCurrentDateInSaoPaulo().getMonth();

// Filtrar fechamentos diários do mês atual (EXCETO o dia atual)
const monthlySummaries = dailySummaries.filter((summary: any) => {
  const summaryDate = new Date(summary.date);
  const isCurrentMonth = summaryDate.getFullYear() === currentYear && summaryDate.getMonth() === currentMonth;
  const isToday = summary.date === today;
  // Excluir resumos do dia atual - vamos calcular direto das transações para garantir precisão
  return isCurrentMonth && !isToday;
});

// Somar lucros dos fechamentos diários (apenas dias passados, não o dia atual)
const monthlyRevenueFromSummaries = monthlySummaries.reduce((total: number, summary: any) => {
  return total + (summary.profit || summary.margin || 0);
}, 0);

// Para o dia atual e outros dias não fechados, calcular diretamente das transações
const closedDates = new Set(monthlySummaries.map((summary: any) => summary.date));

// Filtrar transações que NÃO estão em fechamentos diários (ou são do dia atual)
const openTransactions = monthlyTransactions.filter((transaction: any) => {
  const transactionDate = transaction.date;

  // Se o dia está fechado E não é hoje, não processar (já está no resumo)
  if (closedDates.has(transactionDate) && transactionDate !== today) {
    return false;
  }

  // Para o dia atual, sempre incluir todas as transações
  if (transactionDate === today) {
    return true;
  }

  // Para outros dias não fechados, incluir normalmente
  return true;
});

const monthlyRevenueFromTransactions = openTransactions.reduce((total: number, transaction: any) => {
  // Verificar se é uma transação de Surebet (sempre contribui positivamente para o lucro)
  const isSurebet = transaction.description && transaction.description.startsWith('Surebet');
  // Verificar se é uma transação de FreeBet (sempre positiva quando há lucro)
  const isFreeBet = transaction.description && transaction.description.startsWith('FreeBet');
  
  let transactionProfit;
  if (isSurebet || isFreeBet) {
    // Surebet e FreeBet sempre adicionam lucro positivo
    transactionProfit = transaction.amount;
  } else {
    // Para outras transações, usar lógica normal
    transactionProfit = transaction.type === 'withdraw' ? transaction.amount : -transaction.amount;
  }
  return total + transactionProfit;
}, 0);

const monthlyRevenue = monthlyRevenueFromSummaries + monthlyRevenueFromTransactions;
```

## 5. ResumoDia.tsx - Função handleCloseDay Completa

```typescript
// Arquivo: src/pages/ResumoDia.tsx
// Função: handleCloseDay

const handleCloseDay = async () => {
  try {
    // CORREÇÃO: Usar transações do dia original se disponíveis
    const transactionsToClose = originalDayTransactions.length > 0 ? originalDayTransactions : todayTransactions;
    const dateToClose = originalDayDate || selectedDateString;
    
    // CORREÇÃO: Separar Surebet dos depósitos normais (seguindo regras oficiais)
    const surebetTransactions = transactionsToClose.filter((t: any) => 
      t.description && t.description.startsWith('Surebet')
    );
    const otherDeposits = transactionsToClose.filter((t: any) =>
      t.type === 'deposit' && (!t.description || !t.description.startsWith('Surebet'))
    );
    const withdrawsToClose = transactionsToClose.filter((t: any) => t.type === 'withdraw');
    
    // Calcular totais corretamente
    const totalSurebetProfit = surebetTransactions.reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0);
    const totalDepositsToClose = otherDeposits.reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0);
    const totalWithdrawsToClose = withdrawsToClose.reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0);
    
    // CORREÇÃO: Surebet sempre positivo no lucro
    const profitToClose = totalWithdrawsToClose - totalDepositsToClose + totalSurebetProfit;
    
    console.log('Fechando dia - Data:', dateToClose);
    console.log('Fechando dia - Transações originais:', originalDayTransactions);
    console.log('Fechando dia - Transações selecionadas:', transactionsToClose);
    console.log('Fechando dia - Total Deposits:', totalDepositsToClose);
    console.log('Fechando dia - Total Withdraws:', totalWithdrawsToClose);
    console.log('Fechando dia - Profit:', profitToClose);
    
    if (!user?.uid) {
      toast.error('Usuário não autenticado');
      return;
    }

    // Verificar se já existe um fechamento para este dia
    const existingSummaries = await UserDailySummaryService.getAllDailySummaries(user.uid);
    const existingSummary = existingSummaries.find((s: any) => s.date === dateToClose);
    
    let summaryData;
    
    if (existingSummary) {
      // CORREÇÃO: Se já existe, SUBSTITUIR em vez de somar (evita duplicação)
      summaryData = {
        date: dateToClose,
        totalDeposits: totalDepositsToClose, // Apenas depósitos normais (sem Surebet)
        totalWithdraws: totalWithdrawsToClose,
        profit: profitToClose, // Inclui Surebet como positivo
        transactionCount: transactionsToClose.length,
        transactionsSnapshot: transactionsToClose, // Substituir snapshot
        byEmployee: [],
        margin: profitToClose,
        createdAt: existingSummary.createdAt,
        updatedAt: new Date(),
      };
      
      console.log('Substituindo fechamento existente (evitando duplicação):', summaryData);
      await UserDailySummaryService.updateDailySummary(user.uid, existingSummary.id, summaryData);
    } else {
      // Se não existe, criar novo
      summaryData = {
        date: dateToClose,
        totalDeposits: totalDepositsToClose, // Apenas depósitos normais (sem Surebet)
        totalWithdraws: totalWithdrawsToClose,
        profit: profitToClose, // Inclui Surebet como positivo
        transactionCount: transactionsToClose.length,
        transactionsSnapshot: transactionsToClose,
        byEmployee: [],
        margin: profitToClose,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      console.log('Criando novo fechamento:', summaryData);
      await UserDailySummaryService.createDailySummary(user.uid, summaryData as any);
    }
    
    // Deletar todas as transações do dia
    const deletePromises = transactionsToClose.map((transaction: any) => 
      deleteTransactionMutation.mutateAsync(transaction.id)
    );
    await Promise.all(deletePromises);
    
    toast.success('Dia fechado com sucesso!');
    setCloseDialogOpen(false);
    
    // Redirecionar para o dashboard
    setTimeout(() => {
      window.location.href = '/dashboard';
    }, 1000);
  } catch (error) {
    console.error('Erro ao fechar o dia:', error);
    toast.error('Erro ao fechar o dia. Tente novamente.');
  }
};
```

## 6. Exemplos de Documentos do Firestore

### Exemplo de Transação:

```json
{
  "id": "abc123def456",
  "userId": "user_xyz789",
  "employeeId": "emp_001",
  "platformId": "plat_001",
  "type": "deposit",
  "amount": 100.00,
  "description": "FreeBet: Aposta vencedora",
  "date": "2025-01-15",
  "createdAt": {
    "_seconds": 1736966400,
    "_nanoseconds": 0
  },
  "updatedAt": {
    "_seconds": 1736966400,
    "_nanoseconds": 0
  }
}
```

**Ou transação normal:**
```json
{
  "id": "def456ghi789",
  "userId": "user_xyz789",
  "employeeId": "emp_001",
  "platformId": "plat_001",
  "type": "withdraw",
  "amount": 210.00,
  "description": "",
  "date": "2025-01-15",
  "createdAt": {
    "_seconds": 1736970000,
    "_nanoseconds": 0
  },
  "updatedAt": {
    "_seconds": 1736970000,
    "_nanoseconds": 0
  }
}
```

### Exemplo de Resumo Diário:

```json
{
  "id": "summary_abc123",
  "userId": "user_xyz789",
  "date": "2025-01-15",
  "totalDeposits": 100.00,
  "totalWithdraws": 210.00,
  "profit": 110.00,
  "margin": 110.00,
  "transactionCount": 2,
  "transactionsSnapshot": [
    {
      "id": "abc123def456",
      "type": "deposit",
      "amount": 100.00,
      "description": "",
      "date": "2025-01-15"
    },
    {
      "id": "def456ghi789",
      "type": "withdraw",
      "amount": 210.00,
      "description": "",
      "date": "2025-01-15"
    }
  ],
  "byEmployee": [],
  "createdAt": {
    "_seconds": 1736973600,
    "_nanoseconds": 0
  },
  "updatedAt": {
    "_seconds": 1736973600,
    "_nanoseconds": 0
  }
}
```

**Observações Importantes:**
- O campo `date` está sempre no formato string `'YYYY-MM-DD'`
- Os timestamps `createdAt` e `updatedAt` são objetos Firebase Timestamp que podem ser convertidos com `.toDate()`
- O campo `transactionsSnapshot` armazena um array com as transações originais do dia
- O campo `description` pode estar vazio (`""`) ou conter strings como `"FreeBet: ..."` ou `"Surebet: ..."`

---

## Pontos Críticos para Análise

1. **Conversão de Datas**: Todos os campos `date` são strings no formato `'YYYY-MM-DD'`. Não há conversão de timezone na busca.
2. **Timing de Exclusão**: Quando `handleCloseDay` deleta transações, ele chama `deleteTransactionMutation.mutateAsync` que chama `deleteTransaction`. Isso pode causar race conditions.
3. **Falta de FreeBet no handleCloseDay**: A função `handleCloseDay` não está tratando FreeBet separadamente - apenas Surebet. FreeBet está sendo tratado como depósito normal!
4. **Sincronização**: Quando múltiplas exclusões acontecem em sequência (como em `Promise.all(deletePromises)`), cada uma tenta recalcular o resumo diário, podendo causar inconsistências.

Por favor, analise esses códigos completos e identifique todos os bugs e problemas de lógica.

