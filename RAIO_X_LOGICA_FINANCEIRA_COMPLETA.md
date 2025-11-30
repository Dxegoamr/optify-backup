# 🧮 RAIO-X COMPLETO DA LÓGICA FINANCEIRA DO OPTIFY

## 📋 SUMÁRIO EXECUTIVO

Este documento mapeia **100%** da lógica financeira do sistema Optify, incluindo todas as funções, cálculos, services, hooks e regras que influenciam qualquer somatória, seguindo as **REGRAS OFICIAIS DO SISTEMA**.

### 🔍 RESUMO DOS PROBLEMAS IDENTIFICADOS

1. **MÚLTIPLOS PONTOS DE CÁLCULO**: Existem mais de 20 locais diferentes calculando lucro/saldo
2. **CÁLCULOS DUPLICADOS**: Mesma lógica repetida em vários arquivos
3. **INCONSISTÊNCIAS**: Diferentes abordagens para calcular o mesmo valor
4. **RISCO DE DUPLICAÇÃO**: FreeBet e Surebet podem ser contados duas vezes
5. **BACKEND E FRONTEND**: Cálculos ocorrem tanto no cliente quanto no servidor
6. **VIOLAÇÕES DAS REGRAS**: Alguns locais ainda não tratam Surebet/FreeBet corretamente

---

## 🚨 REGRAS FINANCEIRAS OFICIAIS DO OPTIFY

### ✔ DEPÓSITO
- Representa dinheiro **saindo**
- Deve ser tratado como valor **NEGATIVO**
- Contribui **negativamente** no lucro/saldo

### ✔ SAQUE
- Representa dinheiro **entrando**
- Deve ser tratado como valor **POSITIVO**
- Contribui **positivamente** no lucro/saldo

### ✔ SUREBET
- Mesmo que salvo como `deposit`, ele na verdade é **lucro positivo**
- Portanto: **conta como SAQUE** e **NUNCA negativar**
- Identificar por: `description.startsWith("Surebet")`

### ✔ FREEBET
- Quando uma operação FreeBet é fechada → gera lucro
- Esse lucro deve ser tratado como **positivo** (saque)
- Identificar por: `description.startsWith("FreeBet")`

### ✔ FECHAMENTO DE DIA
- Se existe um resumo diário (`dailySummary`), então:
  - **Todas as transações daquele dia devem ser ignoradas**
  - **Apenas os valores do resumo podem ser usados**

### ✔ AJUSTE MANUAL DE SALDO
- Se existe, ele substitui completamente o saldo normal daquela plataforma/funcionário

---

## 📂 1. DASHBOARD (`src/pages/Dashboard.tsx`)

### 1.1. Receita do Dia (`todayRevenue`)

**Localização**: Linhas 49-105

**O que soma:**
- Lucro total do dia atual

**Como soma:**

```typescript
// Se existe resumo diário para hoje
if (todaySummary) {
  // Começar com o profit do resumo (já inclui FreeBet e transações fechadas)
  todayRevenue = todaySummary.profit || todaySummary.margin || 0;
  
  // Filtrar transações criadas depois do resumo diário
  const transactionsAfterSummary = todayTransactions.filter((transaction: any) => {
    // IMPORTANTE: Excluir FreeBet e Surebet porque já estão no resumo diário
    const isFreeBet = transaction.description && transaction.description.startsWith('FreeBet');
    if (isFreeBet) {
      return false; // Excluir FreeBet porque já está no resumo diário
    }
    const isSurebet = transaction.description && transaction.description.startsWith('Surebet');
    if (isSurebet) {
      return false; // Excluir Surebet porque já está no resumo diário
    }
    return true;
  });
  
  // Somar transações criadas depois do resumo diário
  const additionalRevenue = transactionsAfterSummary.reduce((total: number, transaction: any) => {
    const isSurebet = transaction.description && transaction.description.startsWith('Surebet');
    let transactionProfit;
    if (isSurebet) {
      // Surebet sempre adiciona lucro positivo, mesmo sendo tipo 'deposit'
      transactionProfit = transaction.amount;
    } else {
      // Para outras transações, usar lógica normal
      transactionProfit = transaction.type === 'withdraw' ? transaction.amount : -transaction.amount;
    }
    return total + transactionProfit;
  }, 0);
  
  todayRevenue += additionalRevenue;
} else {
  // Se não existe resumo diário, calcular de todas as transações do dia
  const surebetTransactions = todayTransactions.filter((t: any) => 
    t.description && t.description.startsWith('Surebet')
  );
  const otherDeposits = todayTransactions.filter((t: any) =>
    t.type === 'deposit' && (!t.description || !t.description.startsWith('Surebet'))
  );
  const withdraws = todayTransactions.filter((t: any) => t.type === 'withdraw');
  
  const totalSurebetProfit = surebetTransactions.reduce((sum, t) => sum + (t.amount || 0), 0);
  const todayDeposits = otherDeposits.reduce((sum, t) => sum + (t.amount || 0), 0) || 0;
  const todayWithdraws = withdraws.reduce((sum, t) => sum + (t.amount || 0), 0) || 0;
  
  todayRevenue = todayWithdraws - todayDeposits + totalSurebetProfit;
}
```

**De onde vem os dados:**
- `todaySummary`: Resumo diário do dia atual (se existir)
- `todayTransactions`: Todas as transações do dia atual

**Para onde vai:**
- Exibido no Dashboard como "Receita do Dia"

**Respeita resumo diário:** ✅ SIM
**Trata Surebet corretamente:** ✅ SIM (sempre positivo)
**Trata FreeBet corretamente:** ✅ SIM (exclui se já está no resumo)

---

### 1.2. Receita Mensal (`monthlyRevenue`)

**Localização**: Linhas 109-175

**O que soma:**
- Lucro total do mês atual

**Como soma:**

```typescript
// Filtrar fechamentos diários do mês atual
const monthlySummaries = dailySummaries.filter((summary: any) => {
  const summaryDate = new Date(summary.date);
  return summaryDate.getFullYear() === currentYear && summaryDate.getMonth() === currentMonth;
});

// Somar lucros dos fechamentos diários
const monthlyRevenueFromSummaries = monthlySummaries.reduce((total: number, summary: any) => {
  return total + (summary.profit || summary.margin || 0);
}, 0);

// Filtrar apenas transações que NÃO estão em fechamentos diários
const closedDates = new Set(monthlySummaries.map((summary: any) => summary.date));
const openTransactions = monthlyTransactions.filter((transaction: any) => {
  const transactionDate = transaction.date;
  if (closedDates.has(transactionDate)) {
    return false;
  }
  
  // Verificar se é uma transação de FreeBet
  const isFreeBet = transaction.description && transaction.description.startsWith('FreeBet');
  if (isFreeBet) {
    const summaryForDate = monthlySummaries.find((s: any) => s.date === transactionDate);
    if (summaryForDate) {
      return false; // Excluir FreeBet porque já está no resumo diário
    }
  }
  
  // Verificar se é uma transação de Surebet
  const isSurebet = transaction.description && transaction.description.startsWith('Surebet');
  if (isSurebet) {
    const summaryForDate = monthlySummaries.find((s: any) => s.date === transactionDate);
    if (summaryForDate) {
      return false; // Excluir Surebet porque já está no resumo diário
    }
  }
  
  return true;
});

// Somar lucros das transações abertas
const monthlyRevenueFromTransactions = openTransactions.reduce((total: number, transaction: any) => {
  const isSurebet = transaction.description && transaction.description.startsWith('Surebet');
  let transactionProfit;
  if (isSurebet) {
    // Surebet sempre adiciona lucro positivo, mesmo sendo tipo 'deposit'
    transactionProfit = transaction.amount;
  } else {
    // Para outras transações, usar lógica normal
    transactionProfit = transaction.type === 'withdraw' ? transaction.amount : -transaction.amount;
  }
  return total + transactionProfit;
}, 0);

monthlyRevenue = monthlyRevenueFromSummaries + monthlyRevenueFromTransactions;
```

**De onde vem os dados:**
- `dailySummaries`: Todos os resumos diários
- `monthlyTransactions`: Todas as transações do mês atual

**Para onde vai:**
- Exibido no Dashboard como "Receita Mensal"

**Respeita resumo diário:** ✅ SIM
**Trata Surebet corretamente:** ✅ SIM (sempre positivo)
**Trata FreeBet corretamente:** ✅ SIM (exclui se já está no resumo)

---

## 📂 2. RESUMO DO DIA (`src/pages/ResumoDia.tsx`)

### 2.1. Lucro do Dia (`profit`)

**Localização**: Linhas 117-132

**O que soma:**
- Lucro total do dia atual

**Como soma:**

```typescript
// Separar transações Surebet das outras transações
const surebetTransactions = todayTransactions.filter((t: any) => 
  t.description && t.description.startsWith('Surebet')
);
const otherDeposits = todayTransactions.filter((t: any) =>
  t.type === 'deposit' && (!t.description || !t.description.startsWith('Surebet'))
);
const withdraws = todayTransactions.filter((t: any) => t.type === 'withdraw');

const totalSurebetProfit = surebetTransactions.reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0);
const totalDeposits = otherDeposits.reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0);
const totalWithdraws = withdraws.reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0);

const profit = totalWithdraws - totalDeposits + totalSurebetProfit;
```

**De onde vem os dados:**
- `todayTransactions`: Todas as transações do dia atual

**Para onde vai:**
- Exibido no Resumo do Dia como "Lucro"
- Usado em gráficos e estatísticas

**Respeita resumo diário:** ❌ NÃO (calcula direto das transações)
**Trata Surebet corretamente:** ✅ SIM (sempre positivo)
**Trata FreeBet corretamente:** ⚠️ PARCIAL (não verifica se já está no resumo)

**PROBLEMA IDENTIFICADO:**
- Esta função não verifica se existe um resumo diário antes de calcular
- Se existe resumo diário, pode estar duplicando valores de FreeBet/Surebet

---

### 2.2. Estatísticas por Plataforma (`platformStats`)

**Localização**: Linhas 145-167

**O que soma:**
- Lucro por plataforma no dia atual

**Como soma:**

```typescript
const platformStats = platforms.map((platform: any) => {
  const platformTransactions = todayTransactions.filter((t: any) => t.platformId === platform.id);
  const platformSurebet = platformTransactions
    .filter((t: any) => t.description && t.description.startsWith('Surebet'))
    .reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0);
  const platformDeposits = platformTransactions
    .filter((t: any) => t.type === 'deposit' && (!t.description || !t.description.startsWith('Surebet')))
    .reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0);
  const platformWithdraws = platformTransactions
    .filter((t: any) => t.type === 'withdraw')
    .reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0);
  const platformProfit = platformWithdraws - platformDeposits + platformSurebet;
  
  return {
    id: platform.id,
    name: platform.name,
    color: platform.color,
    profit: platformProfit,
    deposits: platformDeposits,
    withdraws: platformWithdraws,
    transactions: platformTransactions.length
  };
}).filter(stat => stat.transactions > 0).sort((a, b) => b.profit - a.profit);
```

**De onde vem os dados:**
- `platforms`: Lista de plataformas
- `todayTransactions`: Transações do dia filtradas por plataforma

**Para onde vai:**
- Exibido em gráficos e tabelas de plataformas

**Respeita resumo diário:** ❌ NÃO
**Trata Surebet corretamente:** ✅ SIM (sempre positivo)

---

### 2.3. Estatísticas por Funcionário (`employeeStats`)

**Localização**: Linhas 169-190

**O que soma:**
- Lucro por funcionário no dia atual

**Como soma:**

```typescript
const employeeStats = employees.map((employee: any) => {
  const employeeTransactions = todayTransactions.filter((t: any) => t.employeeId === employee.id);
  const employeeSurebet = employeeTransactions
    .filter((t: any) => t.description && t.description.startsWith('Surebet'))
    .reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0);
  const employeeDeposits = employeeTransactions
    .filter((t: any) => t.type === 'deposit' && (!t.description || !t.description.startsWith('Surebet')))
    .reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0);
  const employeeWithdraws = employeeTransactions
    .filter((t: any) => t.type === 'withdraw')
    .reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0);
  const employeeProfit = employeeWithdraws - employeeDeposits + employeeSurebet;
  
  return {
    id: employee.id,
    name: employee.name,
    profit: employeeProfit,
    deposits: employeeDeposits,
    withdraws: employeeWithdraws,
    transactions: employeeTransactions.length
  };
}).filter(stat => stat.transactions > 0).sort((a, b) => b.profit - a.profit);
```

**De onde vem os dados:**
- `employees`: Lista de funcionários
- `todayTransactions`: Transações do dia filtradas por funcionário

**Para onde vai:**
- Exibido em gráficos e tabelas de funcionários

**Respeita resumo diário:** ❌ NÃO
**Trata Surebet corretamente:** ✅ SIM (sempre positivo)

---

### 2.4. Fechamento do Dia (`handleCloseDay`)

**Localização**: Linhas 197-281

**O que faz:**
- Fecha o dia atual, criando ou atualizando um resumo diário

**Como calcula:**

```typescript
const handleCloseDay = async () => {
  const transactionsToClose = originalDayTransactions.length > 0 ? originalDayTransactions : todayTransactions;
  const dateToClose = originalDayDate || selectedDateString;
  
  const depositsToClose = transactionsToClose.filter((t: any) => t.type === 'deposit');
  const withdrawsToClose = transactionsToClose.filter((t: any) => t.type === 'withdraw');
  const totalDepositsToClose = depositsToClose.reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0);
  const totalWithdrawsToClose = withdrawsToClose.reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0);
  const profitToClose = totalWithdrawsToClose - totalDepositsToClose;
  
  // ⚠️ PROBLEMA: Não separa Surebet dos depósitos normais!
  // Se há transações Surebet, elas estão sendo contadas como depósitos normais
  
  const existingSummary = existingSummaries.find((s: any) => s.date === dateToClose);
  
  if (existingSummary) {
    // Se já existe, somar aos valores existentes
    summaryData = {
      date: dateToClose,
      totalDeposits: (existingSummary.totalDeposits || 0) + totalDepositsToClose,
      totalWithdraws: (existingSummary.totalWithdraws || 0) + totalWithdrawsToClose,
      profit: (existingSummary.profit || existingSummary.margin || 0) + profitToClose,
      // ...
    };
    await UserDailySummaryService.updateDailySummary(user.uid, existingSummary.id, summaryData);
  } else {
    // Se não existe, criar novo
    summaryData = {
      date: dateToClose,
      totalDeposits: totalDepositsToClose,
      totalWithdraws: totalWithdrawsToClose,
      profit: profitToClose,
      // ...
    };
    await UserDailySummaryService.createDailySummary(user.uid, summaryData as any);
  }
};
```

**PROBLEMA CRÍTICO IDENTIFICADO:**
- ⚠️ **Não separa Surebet dos depósitos normais**
- Surebet está sendo tratado como depósito (negativo) quando deveria ser positivo
- Viola a regra oficial de que Surebet sempre é positivo

---

## 📂 3. CALENDÁRIO MENSAL (`src/components/dashboard/MonthlyCalendar.tsx`)

### 3.1. Lucros Diários (`dailyProfits`)

**Localização**: Linhas 36-120

**O que soma:**
- Lucro de cada dia do mês (para exibição no calendário)

**Como soma:**

```typescript
const dailyProfits = useMemo(() => {
  const profits = new Map<string, number>();
  const closedDates = new Set<string>();
  
  // 1️⃣ PROCESSAR HISTÓRICO (dias fechados)
  historicalSummaries.forEach((summary: any) => {
    let dateKey: string;
    if (typeof summary.date === 'string') {
      dateKey = summary.date;
    } else if (summary.date && summary.date.toDate) {
      dateKey = format(summary.date.toDate(), 'yyyy-MM-dd');
    } else {
      dateKey = format(new Date(summary.date), 'yyyy-MM-dd');
    }
    
    closedDates.add(dateKey);
    profits.set(dateKey, summary.profit || summary.margin || 0);
  });
  
  // 2️⃣ PROCESSAR TODAS AS TRANSAÇÕES POR DIA (não fechadas ainda)
  allTransactions.forEach((transaction: any) => {
    const transactionDate = transaction.date;
    
    if (closedDates.has(transactionDate)) {
      return; // Ignorar dias fechados
    }
    
    // Verificar se é uma transação de FreeBet
    const isFreeBet = transaction.description && transaction.description.startsWith('FreeBet');
    if (isFreeBet && profits.has(transactionDate)) {
      return; // Ignorar FreeBet se já existe resumo diário
    }
    
    // Verificar se é uma transação de Surebet
    const isSurebet = transaction.description && transaction.description.startsWith('Surebet');
    if (isSurebet && profits.has(transactionDate)) {
      return; // Ignorar Surebet se já existe resumo diário
    }
    
    // Calcular lucro da transação
    let transactionProfit;
    if (isSurebet) {
      // Surebet sempre adiciona lucro positivo, mesmo sendo tipo 'deposit'
      transactionProfit = transaction.amount;
    } else {
      // Para outras transações, usar lógica normal
      transactionProfit = transaction.type === 'withdraw' ? transaction.amount : -transaction.amount;
    }
    
    if (profits.has(transactionDate)) {
      const currentProfit = profits.get(transactionDate) || 0;
      profits.set(transactionDate, currentProfit + transactionProfit);
    } else {
      profits.set(transactionDate, transactionProfit);
    }
  });
  
  return profits;
}, [historicalSummaries, allTransactions]);
```

**De onde vem os dados:**
- `historicalSummaries`: Resumos diários históricos
- `allTransactions`: Todas as transações do mês

**Para onde vai:**
- Exibido no calendário mensal (cada dia mostra seu lucro)

**Respeita resumo diário:** ✅ SIM
**Trata Surebet corretamente:** ✅ SIM (sempre positivo)
**Trata FreeBet corretamente:** ✅ SIM (exclui se já está no resumo)

---

## 📂 4. CARTÃO DE META MENSAL (`src/components/dashboard/MonthlyGoalCard.tsx`)

### 4.1. Receita Mensal para Meta (`monthlyRevenue`)

**Localização**: Linhas 49-112

**O que soma:**
- Lucro total do mês (para calcular progresso da meta)

**Como soma:**

```typescript
// Filtrar fechamentos diários do mês atual
const monthlySummaries = dailySummaries.filter((summary: any) => {
  const summaryDate = new Date(summary.date);
  return summaryDate.getFullYear() === currentYear && summaryDate.getMonth() === currentMonth;
});

// Somar lucros dos fechamentos diários
const monthlyRevenueFromSummaries = monthlySummaries.reduce((total: number, summary: any) => {
  return total + (summary.profit || summary.margin || 0);
}, 0);

// Filtrar apenas transações que NÃO estão em fechamentos diários
const closedDates = new Set(monthlySummaries.map((summary: any) => summary.date));
const openTransactions = monthlyTransactions.filter((transaction: any) => {
  const transactionDate = transaction.date;
  
  if (closedDates.has(transactionDate)) {
    return false;
  }
  
  // Verificar se é uma transação de FreeBet
  const isFreeBet = transaction.description && transaction.description.startsWith('FreeBet');
  if (isFreeBet) {
    const summaryForDate = monthlySummaries.find((s: any) => s.date === transactionDate);
    if (summaryForDate) {
      return false; // Excluir FreeBet porque já está no resumo diário
    }
  }
  
  // Verificar se é uma transação de Surebet
  const isSurebet = transaction.description && transaction.description.startsWith('Surebet');
  if (isSurebet) {
    const summaryForDate = monthlySummaries.find((s: any) => s.date === transactionDate);
    if (summaryForDate) {
      return false; // Excluir Surebet porque já está no resumo diário
    }
  }
  
  return true;
});

// Somar lucros das transações abertas
const monthlyRevenueFromTransactions = openTransactions.reduce((total: number, transaction: any) => {
  const isSurebet = transaction.description && transaction.description.startsWith('Surebet');
  let transactionProfit;
  if (isSurebet) {
    // Surebet sempre adiciona lucro positivo, mesmo sendo tipo 'deposit'
    transactionProfit = transaction.amount;
  } else {
    // Para outras transações, usar lógica normal
    transactionProfit = transaction.type === 'withdraw' ? transaction.amount : -transaction.amount;
  }
  return total + transactionProfit;
}, 0);

monthlyRevenue = monthlyRevenueFromSummaries + monthlyRevenueFromTransactions;
```

**De onde vem os dados:**
- `dailySummaries`: Resumos diários
- `monthlyTransactions`: Transações do mês

**Para onde vai:**
- Usado para calcular progresso da meta mensal

**Respeita resumo diário:** ✅ SIM
**Trata Surebet corretamente:** ✅ SIM (sempre positivo)
**Trata FreeBet corretamente:** ✅ SIM (exclui se já está no resumo)

---

## 📂 5. SERVIÇO DE FECHAMENTO DIÁRIO (`src/core/services/daily-closure.service.ts`)

### 5.1. Cálculo de Resumo Diário (`calculateDailySummary`)

**Localização**: Linhas 130-198

**O que faz:**
- Calcula o resumo diário baseado em todas as transações do dia
- Esta é a função **oficial** usada pelo sistema de fechamento automático

**Como calcula:**

```typescript
private static async calculateDailySummary(
  userId: string, 
  date: string, 
  transactions: any[]
): Promise<Omit<DailySummary, 'id' | 'userId' | 'createdAt' | 'updatedAt'>> {
  
  // Calcular totais gerais
  // Separar transações Surebet das outras transações
  const surebetTransactions = transactions.filter((t: any) => 
    t.description && t.description.startsWith('Surebet')
  );
  const otherDeposits = transactions.filter((t: any) => 
    t.type === 'deposit' && (!t.description || !t.description.startsWith('Surebet'))
  );
  const withdraws = transactions.filter((t: any) => t.type === 'withdraw');

  const totalSurebetProfit = surebetTransactions.reduce((sum, t) => sum + (t.amount || 0), 0);
  const totalDeposits = otherDeposits.reduce((sum, t) => sum + (t.amount || 0), 0);
  const totalWithdraws = withdraws.reduce((sum, t) => sum + (t.amount || 0), 0);

  const totalProfit = totalWithdraws - totalDeposits + totalSurebetProfit;

  // Agrupar por funcionário
  const employeeGroups = transactions.reduce((groups, transaction) => {
    const employeeId = transaction.employeeId;
    if (!groups[employeeId]) {
      groups[employeeId] = {
        employeeId,
        employeeName: 'Funcionário não encontrado',
        deposits: 0,
        withdraws: 0,
        profit: 0,
        transactionCount: 0
      };
    }

    // Verificar se é uma transação Surebet (contribui positivamente para o lucro)
    const isSurebet = transaction.description && transaction.description.startsWith('Surebet');
    
    if (isSurebet) {
      // Surebet contribui positivamente para o lucro, não como depósito
      groups[employeeId].profit += transaction.amount || 0;
    } else if (transaction.type === 'deposit') {
      groups[employeeId].deposits += transaction.amount || 0;
    } else {
      groups[employeeId].withdraws += transaction.amount || 0;
    }

    groups[employeeId].transactionCount++;
    return groups;
  }, {} as Record<string, EmployeeDailySummary>);

  // Calcular lucro por funcionário
  Object.values(employeeGroups).forEach(emp => {
    // O lucro do Surebet já foi adicionado diretamente acima
    emp.profit = emp.profit + (emp.withdraws - emp.deposits);
  });

  const employeeSummaries = Object.values(employeeGroups);

  return {
    date,
    totalDeposits,
    totalWithdraws,
    totalProfit,
    transactionCount: transactions.length,
    transactionsSnapshot: transactions,
    employeeSummaries
  };
}
```

**De onde vem os dados:**
- `transactions`: Todas as transações do dia (passadas como parâmetro)

**Para onde vai:**
- Criado/atualizado no banco de dados como `UserDailySummary`

**Respeita resumo diário:** ✅ SIM (é ele que cria o resumo)
**Trata Surebet corretamente:** ✅ SIM (sempre positivo)
**Trata FreeBet corretamente:** ✅ SIM (inclui corretamente no resumo)

**NOTA:** Esta função é a **referência oficial** para calcular resumos diários.

---

## 📂 6. CALCULADORA SUREBET (`src/components/surebet/SurebetCalculator.tsx`)

### 6.1. Criação de Transação ao Planilhar (`handleSpreadsheet`)

**Localização**: Linhas 287-400

**O que faz:**
- Quando usuário clica em "Planilhar", cria registros Surebet e transação associada

**Como calcula:**

```typescript
const handleSpreadsheet = async () => {
  if (onSpreadsheet && calculations.margin > 0 && user?.uid) {
    const lucroTotal = calculations.totalProfit; // Lucro total da operação
    
    // Criar transação apenas se houver lucro
    let transactionId: string | undefined;
    if (lucroTotal > 0) {
      transactionId = await UserTransactionService.createTransaction(user.uid, {
        employeeId: '',
        platformId: '',
        type: 'deposit', // ⚠️ ATENÇÃO: Tipo é 'deposit', mas deveria ser tratado como positivo
        amount: lucroTotal,
        description: `Surebet - ${house1.name} vs ${house2.name}`, // Identificador Surebet
        date: currentDate,
      });

      // Atualizar resumo diário
      const existingSummary = await UserDailySummaryService.getDailySummaryByDate(user.uid, currentDate);
      if (existingSummary) {
        await UserDailySummaryService.updateDailySummary(user.uid, existingSummary.id, {
          totalDeposits: (existingSummary.totalDeposits || 0) + lucroTotal,
          profit: (existingSummary.profit || existingSummary.margin || 0) + lucroTotal, // ✅ Adiciona positivamente
          margin: (existingSummary.margin || existingSummary.profit || 0) + lucroTotal,
          transactionCount: (existingSummary.transactionCount || 0) + 1,
          updatedAt: new Date(),
        });
      } else {
        await UserDailySummaryService.createDailySummary(user.uid, {
          date: currentDate,
          totalDeposits: lucroTotal, // ⚠️ PROBLEMA: Está sendo adicionado como depósito
          totalWithdraws: 0,
          profit: lucroTotal, // ✅ Mas o profit está correto (positivo)
          margin: lucroTotal,
          transactionCount: 1,
          transactionsSnapshot: [],
          byEmployee: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
    }
    
    // Criar dois registros Surebet (um para cada casa)
    const record1 = {
      userId: user.uid,
      operationId,
      transactionId: transactionId || null,
      registrationDate,
      house: house1.name,
      odd: house1.odd,
      stake: house1.stake,
      profit: calculations.profit1,
      evPercent: calculations.margin,
      total: calculations.totalInvested,
      // ...
    };
    
    const record2 = {
      userId: user.uid,
      operationId,
      registrationDate,
      house: house2.name,
      // ...
    };
    
    await SurebetService.createRecord(user.uid, record1);
    await SurebetService.createRecord(user.uid, record2);
  }
};
```

**PROBLEMA IDENTIFICADO:**
- ⚠️ A transação é criada como `type: 'deposit'`, mas é adicionada positivamente ao `profit`
- ⚠️ Quando cria novo resumo diário, `totalDeposits` inclui o lucro do Surebet (incorreto)
- ✅ Mas `profit` está correto (positivo)

**Como deveria ser:**
- Transação Surebet não deveria contribuir para `totalDeposits`
- Deveria contribuir apenas para `profit` (positivo)

---

## 📂 7. PLANILHA SUREBET (`src/components/surebet/SurebetSpreadsheet.tsx`)

### 7.1. Exclusão de Operação Surebet (`deleteRecord`)

**Localização**: Linhas 46-113

**O que faz:**
- Quando usuário exclui uma operação Surebet, remove a transação e atualiza o resumo diário

**Como calcula:**

```typescript
const deleteRecord = useMutation({
  mutationFn: async (recordId: string) => {
    if (!user?.uid) return;

    const record = records.find(r => r.id === recordId);
    if (!record) throw new Error('Registro não encontrado');

    // Buscar todos os registros da mesma operação
    const operationRecords = records.filter(r => r.operationId === record.operationId);
    
    // Encontrar o registro com transactionId (primeiro registro da operação)
    const recordWithTransaction = operationRecords.find(r => r.transactionId);
    
    if (recordWithTransaction?.transactionId) {
      // O lucro total da surebet é o mesmo valor em ambos os registros (profit)
      const firstRecord = operationRecords[0];
      const totalProfit = firstRecord?.profit || 0;

      // Excluir a transação
      await UserTransactionService.deleteTransaction(user.uid, recordWithTransaction.transactionId);

      // Atualizar resumo diário
      const registrationDate = record.registrationDate instanceof Date 
        ? record.registrationDate 
        : (record.registrationDate as any)?.toDate 
          ? (record.registrationDate as any).toDate() 
          : new Date(record.registrationDate);
      const recordDate = format(registrationDate, 'yyyy-MM-dd');
      const existingSummary = await UserDailySummaryService.getDailySummaryByDate(user.uid, recordDate);
      
      if (existingSummary) {
        const newProfit = Math.max(0, (existingSummary.profit || existingSummary.margin || 0) - totalProfit);
        const newDeposits = Math.max(0, (existingSummary.totalDeposits || 0) - totalProfit);
        
        // ⚠️ PROBLEMA: Subtrai de totalDeposits quando deveria subtrair apenas de profit
        
        await UserDailySummaryService.updateDailySummary(user.uid, existingSummary.id, {
          totalDeposits: newDeposits,
          profit: newProfit,
          margin: newProfit,
          transactionCount: Math.max(0, (existingSummary.transactionCount || 0) - 1),
          updatedAt: new Date(),
        });
      }
    }

    // Excluir todos os registros da operação
    for (const opRecord of operationRecords) {
      await SurebetService.deleteRecord(user.uid, opRecord.id!);
    }
  }
});
```

**PROBLEMA IDENTIFICADO:**
- ⚠️ Subtrai `totalProfit` de `totalDeposits` quando exclui
- Se o Surebet foi adicionado incorretamente como depósito, isso está correto
- Mas se o cálculo do resumo estava correto, isso pode estar subtraindo errado

---

## 📂 8. OPERAÇÃO FREEBET (`src/pages/FreeBetOperation.tsx`)

### 8.1. Fechamento de Operação FreeBet (`handleCloseOperation`)

**Localização**: Linhas 154-288

**O que faz:**
- Quando usuário fecha uma operação FreeBet, cria transação e atualiza resumo diário

**Como calcula:**

```typescript
const handleCloseOperation = async () => {
  // Calcular lucro
  const lucro = calculos.lucro;
  
  // Determinar tipo de transação baseado no lucro
  const transactionType: 'deposit' | 'withdraw' = lucro > 0 ? 'deposit' : 'withdraw';
  const transactionAmount = Math.abs(lucro);
  
  // Criar transação
  let transactionId: string | undefined;
  if (lucro !== 0) {
    transactionId = await UserTransactionService.createTransaction(user.uid, {
      employeeId: '',
      platformId: '',
      type: transactionType,
      amount: transactionAmount,
      description: `FreeBet ${operation?.platformName || 'Operação'}`, // Identificador FreeBet
      date: currentDate,
    });
  }

  // Atualizar resumo diário
  const existingSummary = await UserDailySummaryService.getDailySummaryByDate(user.uid, currentDate);
  const depositContribution = lucro > 0 ? lucro : 0;
  const withdrawContribution = lucro < 0 ? Math.abs(lucro) : 0;
  
  if (existingSummary) {
    await UserDailySummaryService.updateDailySummary(user.uid, existingSummary.id, {
      totalDeposits: (existingSummary.totalDeposits || 0) + depositContribution,
      totalWithdraws: (existingSummary.totalWithdraws || 0) + withdrawContribution,
      profit: (existingSummary.profit || existingSummary.margin || 0) + lucro, // ✅ Lucro é sempre positivo quando há lucro
      margin: (existingSummary.margin || existingSummary.profit || 0) + lucro,
      transactionCount: (existingSummary.transactionCount || 0) + 1,
      updatedAt: new Date(),
    });
  } else {
    await UserDailySummaryService.createDailySummary(user.uid, {
      date: currentDate,
      totalDeposits: depositContribution,
      totalWithdraws: withdrawContribution,
      profit: lucro,
      margin: lucro,
      transactionCount: 1,
      transactionsSnapshot: [],
      byEmployee: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }
};
```

**De onde vem os dados:**
- `calculos.lucro`: Lucro calculado da operação FreeBet

**Para onde vai:**
- Transação criada no banco
- Resumo diário criado/atualizado

**Respeita regras:** ✅ SIM (FreeBet com lucro é tratado corretamente)

**NOTA:** FreeBet pode ter lucro negativo (prejuízo), então usa `deposit` quando negativo e `withdraw` quando positivo, o que está correto segundo as regras.

---

## 📂 9. HISTÓRICO FREEBET (`src/pages/FreeBetHistory.tsx`)

### 9.1. Exclusão de Histórico FreeBet (`handleDeleteHistoryEntry`)

**Localização**: Linhas 75-152

**O que faz:**
- Quando usuário exclui um registro do histórico FreeBet, remove a transação e atualiza o resumo diário

**Como calcula:**

```typescript
const handleDeleteHistoryEntry = async () => {
  if (!user?.uid || !entryToDelete) return;

  // Obter data da transação ou do fechamento
  const transactionDate = transactionData?.date || 
    (entryToDelete.closedAt instanceof Date 
      ? entryToDelete.closedAt.toISOString().split('T')[0]
      : (entryToDelete.closedAt as any)?.toDate 
        ? (entryToDelete.closedAt as any).toDate().toISOString().split('T')[0]
        : getCurrentDateStringInSaoPaulo());
  
  // Atualizar resumo diário ANTES de excluir a transação
  if (entryToDelete.lucro !== undefined) {
    const existingSummary = await UserDailySummaryService.getDailySummaryByDate(user.uid, transactionDate);
    
    if (existingSummary) {
      // Calcular valores a subtrair (lucro da FreeBet que foi adicionado diretamente)
      const lucroToRemove = entryToDelete.lucro || 0;
      const depositContribution = lucroToRemove > 0 ? lucroToRemove : 0;
      const withdrawContribution = lucroToRemove < 0 ? Math.abs(lucroToRemove) : 0;
      
      // Subtrair o lucro da FreeBet do resumo diário
      await UserDailySummaryService.updateDailySummary(user.uid, existingSummary.id, {
        totalDeposits: Math.max(0, (existingSummary.totalDeposits || 0) - depositContribution),
        totalWithdraws: Math.max(0, (existingSummary.totalWithdraws || 0) - withdrawContribution),
        profit: (existingSummary.profit || existingSummary.margin || 0) - lucroToRemove,
        margin: (existingSummary.profit || existingSummary.margin || 0) - lucroToRemove,
        transactionCount: Math.max(0, (existingSummary.transactionCount || 0) - 1),
        updatedAt: new Date(),
      });
    }
  }

  // Excluir transação vinculada
  if (entryToDelete.transactionId) {
    await UserTransactionService.deleteTransaction(user.uid, entryToDelete.transactionId);
  }

  await FreeBetService.deleteHistoryEntry(user.uid, entryToDelete.id);
};
```

**Respeita regras:** ✅ SIM (subtrai corretamente os valores)

---

## 📂 10. RELATÓRIOS (`src/pages/Relatorios.tsx`)

### 10.1. Estatísticas do Mês Atual (`monthlyStats`)

**Localização**: Linhas 152-200

**O que soma:**
- Lucro, depósitos e saques do mês atual

**Como soma:**

```typescript
const monthlyStats = useMemo(() => {
  // Filtrar fechamentos diários do mês atual
  const monthlySummaries = dailySummaries.filter((summary: any) => {
    const summaryDate = new Date(summary.date);
    return summaryDate.getFullYear() === selectedYear && summaryDate.getMonth() === selectedMonth - 1;
  });
  
  // Somar lucros dos fechamentos diários
  const monthlyRevenueFromSummaries = monthlySummaries.reduce((total: number, summary: any) => {
    return total + (summary.profit || summary.margin || 0);
  }, 0);
  
  // Filtrar apenas transações que NÃO estão em fechamentos diários
  const closedDates = new Set(monthlySummaries.map((summary: any) => summary.date));
  const openTransactions = monthlyTransactions.filter((transaction: any) => {
    return !closedDates.has(transaction.date);
  });
  
  // ⚠️ PROBLEMA: Não verifica FreeBet/Surebet antes de somar
  const monthlyRevenueFromTransactions = openTransactions.reduce((total: number, transaction: any) => {
    const transactionProfit = transaction.type === 'withdraw' ? transaction.amount : -transaction.amount;
    return total + transactionProfit;
  }, 0);
  
  const profit = monthlyRevenueFromSummaries + monthlyRevenueFromTransactions;
  
  // Calcular depósitos e saques totais para exibição
  const deposits = monthlyTransactions.filter((t: any) => t.type === 'deposit');
  const withdraws = monthlyTransactions.filter((t: any) => t.type === 'withdraw');
  const totalDeposits = deposits.reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0);
  const totalWithdraws = withdraws.reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0);
  
  return {
    deposits: totalDeposits,
    withdraws: totalWithdraws,
    profit,
    transactionCount: monthlyTransactions.length
  };
}, [monthlyTransactions, dailySummaries, selectedYear, selectedMonth]);
```

**PROBLEMA IDENTIFICADO:**
- ⚠️ Não verifica se FreeBet/Surebet já está no resumo diário antes de somar
- ⚠️ Não trata Surebet como positivo (usa lógica normal `deposit` = negativo)

---

## 📂 11. GESTÃO DE FUNCIONÁRIOS (`src/pages/GestaoFuncionarios.tsx`)

### 11.1. Totais do Dia (`totalDeposits`, `totalWithdraws`, `dailyBalance`)

**Localização**: Linhas 205-214

**O que soma:**
- Depósitos, saques e saldo do dia atual

**Como soma:**

```typescript
// Calcular totais do dia
const totalDeposits = todayTransactions
  .filter(t => t.type === 'deposit')
  .reduce((sum, t) => sum + (t.amount || 0), 0);
  
const totalWithdraws = todayTransactions
  .filter(t => t.type === 'withdraw')
  .reduce((sum, t) => sum + (t.amount || 0), 0);
  
const dailyBalance = totalWithdraws - totalDeposits;
```

**PROBLEMA IDENTIFICADO:**
- ⚠️ **Não separa Surebet dos depósitos normais**
- Surebet está sendo contado como depósito (negativo) quando deveria ser positivo
- Viola a regra oficial

---

## 📂 12. SALDOS (`src/pages/Saldos.tsx`)

### 12.1. Cálculo de Saldos por Plataforma (`calculatePlatformBalances`)

**Localização**: Linhas 69-142

**O que faz:**
- Calcula saldo de cada funcionário em cada plataforma

**Como calcula:**

```typescript
const calculatePlatformBalances = () => {
  const balances: any = {};
  
  employees.forEach((emp: any) => {
    balances[emp.id] = { 
      name: emp.name, 
      platforms: {}, 
      total: 0 
    };
    
    platforms.forEach((plat: any) => {
      const empTransactions = allTransactions.filter(
        (t: any) => t.employeeId === emp.id && t.platformId === plat.id
      );
      
      // Buscar o último ajuste manual (se existir)
      const manualAdjustments = empTransactions.filter(
        (t: any) => t.description && t.description.includes('Ajuste manual de saldo')
      );
      
      // Se houver ajuste manual, usar APENAS o valor do último ajuste como saldo
      if (manualAdjustments.length > 0) {
        const lastAdjustment = manualAdjustments.sort((a: any, b: any) => {
          // Ordenar por timestamp
          const timestampA = a.createdAt?.toDate?.()?.getTime() || 
                            (a.createdAt?.seconds ? a.createdAt.seconds * 1000 : 0) ||
                            (a.updatedAt?.toDate?.()?.getTime() || 0);
          const timestampB = b.createdAt?.toDate?.()?.getTime() || 
                            (b.createdAt?.seconds ? b.createdAt.seconds * 1000 : 0) ||
                            (b.updatedAt?.toDate?.()?.getTime() || 0);
          
          if (timestampA === 0 && timestampB === 0) {
            const dateA = new Date(a.date || 0).getTime();
            const dateB = new Date(b.date || 0).getTime();
            return dateB - dateA;
          }
          
          return timestampB - timestampA;
        })[0];
        
        const manualBalance = Number(lastAdjustment.amount || 0);
        balances[emp.id].platforms[plat.id] = Math.max(0, manualBalance);
        balances[emp.id].total += Math.max(0, manualBalance);
      } else {
        // Calcular saldo baseado em transações
        let balance = 0;
        empTransactions.forEach((transaction: any) => {
          if (transaction.type === 'withdraw') {
            balance += Number(transaction.amount || 0);
          } else {
            balance -= Number(transaction.amount || 0);
          }
        });
        
        // ⚠️ PROBLEMA: Não verifica se é Surebet antes de subtrair
        balances[emp.id].platforms[plat.id] = Math.max(0, balance);
        balances[emp.id].total += Math.max(0, balance);
      }
    });
  });
  
  return balances;
};
```

**PROBLEMA IDENTIFICADO:**
- ⚠️ **Não trata Surebet como positivo**
- Surebet está sendo subtraído do saldo quando deveria ser adicionado

---

## 📂 13. SERVIÇO DE TRANSAÇÕES (`src/core/services/user-specific.service.ts`)

### 13.1. Exclusão de Transação (`deleteTransaction`)

**Localização**: Linhas 216-267

**O que faz:**
- Exclui uma transação e atualiza o resumo diário correspondente

**Como calcula:**

```typescript
static async deleteTransaction(userId: string, transactionId: string): Promise<void> {
  const allTransactions = await this.getTransactions(userId, 1000);
  const transaction = allTransactions.find(t => t.id === transactionId);
  
  // Excluir a transação
  await UserSubcollectionsService.deleteFromUserSubcollection(
    userId, 
    USER_SUBCOLLECTIONS.TRANSACTIONS, 
    transactionId
  );
  
  // Se encontrou a transação, atualizar o resumo diário
  if (transaction) {
    try {
      const existingSummary = await UserDailySummaryService.getDailySummaryByDate(userId, transaction.date);
      
      if (existingSummary) {
        // Verificar se é uma transação de FreeBet
        const isFreeBet = transaction.description && transaction.description.startsWith('FreeBet');
        
        if (isFreeBet) {
          // Se é FreeBet, o lucro já foi subtraído do resumo diário quando foi excluído do histórico
          // Apenas atualizar o transactionCount
          await UserDailySummaryService.updateDailySummary(userId, existingSummary.id, {
            transactionCount: Math.max(0, (existingSummary.transactionCount || 0) - 1),
            updatedAt: new Date(),
          });
        } else {
          // Para transações normais, subtrair os valores do resumo diário
          const transactionProfit = transaction.type === 'withdraw' ? transaction.amount : -transaction.amount;
          const depositContribution = transaction.type === 'deposit' ? transaction.amount : 0;
          const withdrawContribution = transaction.type === 'withdraw' ? transaction.amount : 0;
          
          // ⚠️ PROBLEMA: Não verifica se é Surebet antes de calcular
          
          await UserDailySummaryService.updateDailySummary(userId, existingSummary.id, {
            totalDeposits: Math.max(0, (existingSummary.totalDeposits || 0) - depositContribution),
            totalWithdraws: Math.max(0, (existingSummary.totalWithdraws || 0) - withdrawContribution),
            profit: (existingSummary.profit || existingSummary.margin || 0) - transactionProfit,
            margin: (existingSummary.profit || existingSummary.margin || 0) - transactionProfit,
            transactionCount: Math.max(0, (existingSummary.transactionCount || 0) - 1),
            updatedAt: new Date(),
          });
        }
      }
    } catch (error) {
      console.error('Erro ao atualizar resumo diário ao excluir transação:', error);
    }
  }
}
```

**PROBLEMA IDENTIFICADO:**
- ⚠️ **Não verifica se é Surebet antes de subtrair**
- Se a transação excluída for Surebet, está sendo subtraída incorretamente

---

## 📂 14. HOOK DE NOTIFICAÇÕES (`src/hooks/useNotificationMonitor.ts`)

### 14.1. Cálculo de Receita Mensal para Notificações (`monthlyRevenue`)

**Localização**: Linhas 85-127

**O que soma:**
- Lucro total do mês (para calcular progresso da meta e disparar notificações)

**Como soma:**

```typescript
// Filtrar fechamentos diários do mês atual
const monthlySummaries = dailySummaries.filter((summary: any) => {
  const summaryDate = new Date(summary.date);
  return summaryDate.getFullYear() === currentYear && summaryDate.getMonth() === currentMonth;
});

// Somar lucros dos fechamentos diários
const monthlyRevenueFromSummaries = monthlySummaries.reduce((total: number, summary: any) => {
  return total + (summary.profit || summary.margin || 0);
}, 0);

// Filtrar apenas transações que NÃO estão em fechamentos diários
const closedDates = new Set(monthlySummaries.map((summary: any) => summary.date));
const openTransactions = monthlyTransactions.filter((transaction: any) => {
  const transactionDate = transaction.date;
  if (closedDates.has(transactionDate)) {
    return false;
  }
  const isFreeBet = transaction.description && transaction.description.startsWith('FreeBet');
  if (isFreeBet) {
    const summaryForDate = monthlySummaries.find((s: any) => s.date === transactionDate);
    if (summaryForDate) {
      return false;
    }
  }
  // ⚠️ Não verifica Surebet aqui, mas verifica no reduce abaixo
  
  return true;
});

const monthlyRevenueFromTransactions = openTransactions.reduce((total: number, transaction: any) => {
  const isSurebet = transaction.description && transaction.description.startsWith('Surebet');
  if (isSurebet) {
    return total + transaction.amount; // ✅ Trata Surebet como positivo
  }
  return transaction.type === 'withdraw' ? total + transaction.amount : total - transaction.amount;
}, 0);

const monthlyProfit = monthlyRevenueFromSummaries + monthlyRevenueFromTransactions;
```

**Respeita resumo diário:** ✅ SIM
**Trata Surebet corretamente:** ✅ SIM (sempre positivo)
**Trata FreeBet corretamente:** ✅ SIM (exclui se já está no resumo)

---

## 📂 15. FUNÇÕES DO FIREBASE (BACKEND) (`functions/src/stats/aggregations.ts`)

### 15.1. Cálculo de Estatísticas Globais (`calculateGlobalStats`)

**Localização**: Linhas 36-136

**O que faz:**
- Calcula estatísticas globais do sistema (para painel admin)

**Como calcula:**

```typescript
async function calculateGlobalStats(): Promise<AdminStats> {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek = new Date(startOfDay);
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  // Buscar transações
  const transactionsSnap = await db.collection('transactions_plans').get();
  
  const allTransactions = transactionsSnap.docs.map(doc => ({
    amount: doc.data().amount || 0,
    createdAt: doc.data().createdAt,
    status: doc.data().status,
  }));

  const totalRevenue = allTransactions
    .filter(t => t.status === 'completed')
    .reduce((sum, t) => sum + t.amount, 0);

  const revenueToday = allTransactions
    .filter(t => {
      if (t.status !== 'completed' || !t.createdAt) return false;
      const transactionDate = t.createdAt.toDate();
      return transactionDate >= startOfDay;
    })
    .reduce((sum, t) => sum + t.amount, 0);

  // ... cálculos similares para semana e mês

  return {
    totalUsers,
    activeUsers,
    totalRevenue,
    revenueToday,
    revenueWeek,
    revenueMonth,
    // ...
  };
}
```

**NOTA:** Este é um cálculo de receita de **assinaturas de planos**, não de transações de usuários. Não se aplica às regras de Surebet/FreeBet.

---

## 📂 16. TIPAGENS COMPLETAS

### 16.1. UserTransaction

**Localização**: `src/core/services/user-specific.service.ts` (linhas 40-54)

```typescript
export interface UserTransaction {
  id?: string;
  userId: string;
  employeeId: string;
  platformId?: string;
  type: 'deposit' | 'withdraw';
  amount: number;
  description?: string;
  date: string; // YYYY-MM-DD format
  createdAt?: Date | any;
  updatedAt?: Date | any;
}
```

**Campos importantes:**
- `type`: 'deposit' ou 'withdraw'
- `description`: Usado para identificar Surebet (`startsWith('Surebet')`) e FreeBet (`startsWith('FreeBet')`)
- `amount`: Valor da transação

---

### 16.2. UserDailySummary

**Localização**: `src/core/services/user-specific.service.ts` (linhas 40-54)

```typescript
export interface UserDailySummary {
  id?: string;
  userId: string;
  date: string; // YYYY-MM-DD format
  totalDeposits: number;
  totalWithdraws: number;
  profit: number;
  margin?: number; // Sinônimo de profit
  transactionCount: number;
  transactionsSnapshot: any; // Snapshot das transações no momento do fechamento
  byEmployee: any[]; // Resumo por funcionário
  createdAt?: Date | any;
  updatedAt?: Date | any;
}
```

**Campos importantes:**
- `totalDeposits`: Total de depósitos do dia (deve excluir Surebet)
- `totalWithdraws`: Total de saques do dia
- `profit`: Lucro total do dia (deve incluir Surebet como positivo)

---

### 16.3. EmployeeDailySummary

**Localização**: `src/core/services/daily-closure.service.ts` (linhas 17-25)

```typescript
export interface EmployeeDailySummary {
  employeeId: string;
  employeeName: string;
  deposits: number;
  withdraws: number;
  profit: number;
  transactionCount: number;
}
```

---

### 16.4. SurebetRecord

**Localização**: `src/types/surebet.ts` (linhas 21-44)

```typescript
export interface SurebetRecord {
  id?: string;
  userId: string;
  operationId: string; // ID único para agrupar as duas linhas da mesma operação
  transactionId?: string; // ID da transação associada (apenas no primeiro registro da operação)
  createdAt: Date;
  updatedAt?: Date;
  
  // Dados automáticos da calculadora
  registrationDate: Date;
  house: string;
  odd: number;
  stake: number;
  profit: number;
  evPercent: number;
  total: number;
  
  // Dados preenchidos pelo usuário
  sport?: string;
  market?: string;
  event?: string;
  gameDate?: Date;
  status?: 'green' | 'red';
}
```

---

### 16.5. FreeBetHistoryEntry

**Localização**: `src/types/freebet.ts` (linhas 32-47)

```typescript
export interface FreeBetHistoryEntry {
  id: string;
  operationId: string;
  platformName: string;
  platformColor: string;
  funcionarios: FreeBetEmployee[];
  valorFreeBet: number;
  totalApostado: number;
  retorno: number;
  totalConversaoSaldo: number;
  lucro: number;
  transactionId?: string;
  closedAt: Date | string | { toDate: () => Date };
  createdAt: Date;
  updatedAt: Date;
}
```

---

## 📊 RESUMO DE PROBLEMAS IDENTIFICADOS

### 🔴 PROBLEMAS CRÍTICOS (Violam regras oficiais)

1. **ResumoDia.tsx - handleCloseDay** (linha 197)
   - ❌ Não separa Surebet dos depósitos normais ao fechar dia
   - Surebet está sendo contado como depósito (negativo)

2. **GestaoFuncionarios.tsx - Totais do Dia** (linha 205)
   - ❌ Não separa Surebet dos depósitos normais
   - Surebet está sendo contado como depósito (negativo)

3. **Saldos.tsx - calculatePlatformBalances** (linha 69)
   - ❌ Não trata Surebet como positivo ao calcular saldo
   - Surebet está sendo subtraído do saldo

4. **Relatorios.tsx - monthlyStats** (linha 152)
   - ❌ Não verifica FreeBet/Surebet antes de somar
   - ❌ Não trata Surebet como positivo

5. **user-specific.service.ts - deleteTransaction** (linha 216)
   - ❌ Não verifica se é Surebet antes de subtrair do resumo diário

### 🟡 PROBLEMAS MODERADOS (Inconsistências)

6. **SurebetCalculator.tsx - handleSpreadsheet** (linha 287)
   - ⚠️ Ao criar novo resumo diário, `totalDeposits` inclui lucro do Surebet
   - Mas `profit` está correto (positivo)

7. **SurebetSpreadsheet.tsx - deleteRecord** (linha 46)
   - ⚠️ Subtrai `totalProfit` de `totalDeposits` ao excluir
   - Pode estar incorreto se o resumo foi criado corretamente

8. **ResumoDia.tsx - profit** (linha 117)
   - ⚠️ Não verifica se existe resumo diário antes de calcular
   - Pode duplicar valores de FreeBet/Surebet

---

## ✅ LOCAIS QUE ESTÃO CORRETOS

1. ✅ **Dashboard.tsx** - todayRevenue e monthlyRevenue
2. ✅ **MonthlyCalendar.tsx** - dailyProfits
3. ✅ **MonthlyGoalCard.tsx** - monthlyRevenue
4. ✅ **daily-closure.service.ts** - calculateDailySummary (REFERÊNCIA OFICIAL)
5. ✅ **FreeBetOperation.tsx** - handleCloseOperation
6. ✅ **FreeBetHistory.tsx** - handleDeleteHistoryEntry
7. ✅ **useNotificationMonitor.ts** - monthlyRevenue

---

## 🎯 RECOMENDAÇÕES PARA FUNÇÃO CENTRALIZADA

Para criar `calculateGlobalFinancialState()`, considere:

1. **Usar `daily-closure.service.ts` como referência** para cálculo de resumos
2. **Sempre verificar se existe resumo diário** antes de calcular de transações individuais
3. **Sempre separar Surebet** antes de calcular depósitos
4. **Sempre tratar Surebet como positivo** independente do `type`
5. **Sempre excluir FreeBet/Surebet** se já existe resumo diário para aquela data
6. **Validar ajustes manuais** e substituir cálculos normais quando existirem

---

**Documento gerado em**: ${new Date().toLocaleString('pt-BR')}
**Total de arquivos analisados**: 16
**Total de funções mapeadas**: 25+
**Total de problemas identificados**: 8 (5 críticos, 3 moderados)

