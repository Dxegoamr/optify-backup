# 🧮 MAPEAMENTO COMPLETO DA LÓGICA FINANCEIRA DO SISTEMA

## 📋 SUMÁRIO EXECUTIVO

Este documento mapeia **TODAS** as funções, cálculos e somatórias relacionadas a valores financeiros (lucro, saldo, depósitos, saques) em todo o sistema Optify.

### 🔍 RESUMO DOS PROBLEMAS IDENTIFICADOS

1. **MÚLTIPLOS PONTOS DE CÁLCULO**: Existem mais de 15 locais diferentes calculando lucro/saldo
2. **CÁLCULOS DUPLICADOS**: Mesma lógica repetida em vários arquivos
3. **INCONSISTÊNCIAS**: Diferentes abordagens para calcular o mesmo valor
4. **RISCO DE DUPLICAÇÃO**: FreeBet e Surebet podem ser contados duas vezes
5. **BACKEND E FRONTEND**: Cálculos ocorrem tanto no cliente quanto no servidor

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
  todayRevenue = todaySummary.profit || todaySummary.margin || 0;
  
  // Filtrar transações criadas depois do resumo diário
  const transactionsAfterSummary = todayTransactions.filter((transaction: any) => {
    const isFreeBet = transaction.description && transaction.description.startsWith('FreeBet');
    if (isFreeBet) return false;
    
    const isSurebet = transaction.description && transaction.description.startsWith('Surebet');
    if (isSurebet) return false;
    
    return true;
  });
  
  // Somar transações adicionais
  const additionalRevenue = transactionsAfterSummary.reduce((total: number, transaction: any) => {
    const isSurebet = transaction.description && transaction.description.startsWith('Surebet');
    let transactionProfit;
    if (isSurebet) {
      transactionProfit = transaction.amount; // Sempre positivo
    } else {
      transactionProfit = transaction.type === 'withdraw' ? transaction.amount : -transaction.amount;
    }
    return total + transactionProfit;
  }, 0);
  
  todayRevenue += additionalRevenue;
} else {
  // Se não existe resumo diário, calcular de todas as transações
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
- `dailySummaries` (resumos diários do Firestore)
- `todayTransactions` (transações do dia via hook `useTransactions`)

**Para onde envia o resultado:**
- Exibido no card "Receita Hoje" do Dashboard

**Atualiza banco de dados diretamente?**
- ❌ Não, apenas calcula para exibição

**Risco de somar duas vezes:**
- ⚠️ **SIM** - Implementa lógica para evitar duplicação de FreeBet e Surebet

**Risco de somar negativo:**
- ✅ Tratado - Surebet sempre soma positivo, outras transações seguem tipo

---

### 1.2. Receita Mensal (`monthlyRevenue`)

**Localização**: Linhas 109-183

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
  
  // Excluir FreeBet e Surebet se já estão no resumo diário
  const isFreeBet = transaction.description && transaction.description.startsWith('FreeBet');
  if (isFreeBet) {
    const summaryForDate = monthlySummaries.find((s: any) => s.date === transactionDate);
    if (summaryForDate) {
      return false;
    }
  }
  
  const isSurebet = transaction.description && transaction.description.startsWith('Surebet');
  if (isSurebet) {
    const summaryForDate = monthlySummaries.find((s: any) => s.date === transactionDate);
    if (summaryForDate) {
      return false;
    }
  }
  
  return true;
});

const monthlyRevenueFromTransactions = openTransactions.reduce((total: number, transaction: any) => {
  const isSurebet = transaction.description && transaction.description.startsWith('Surebet');
  let transactionProfit;
  if (isSurebet) {
    transactionProfit = transaction.amount; // Sempre positivo
  } else {
    transactionProfit = transaction.type === 'withdraw' ? transaction.amount : -transaction.amount;
  }
  return total + transactionProfit;
}, 0);

const monthlyRevenue = monthlyRevenueFromSummaries + monthlyRevenueFromTransactions;
```

**De onde vem os dados:**
- `dailySummaries` (resumos diários do Firestore)
- `monthlyTransactions` (transações do mês via hook `useTransactions`)

**Para onde envia o resultado:**
- Exibido no card "Receita do Mês" do Dashboard

**Atualiza banco de dados diretamente?**
- ❌ Não, apenas calcula para exibição

**Risco de somar duas vezes:**
- ⚠️ **SIM** - Implementa lógica para evitar duplicação

**Risco de somar negativo:**
- ✅ Tratado - Surebet sempre soma positivo

---

### 1.3. Gráfico Semanal (`generateWeeklyChartData`)

**Localização**: Linhas 258-302

**O que soma:**
- Receitas e despesas por dia dos últimos 7 dias
- Lucro acumulado da semana

**Como soma:**
```typescript
const receita = dayTransactions
  .filter(t => t.type === 'withdraw')
  .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  
const despesa = dayTransactions
  .filter(t => t.type === 'deposit')
  .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

const lucroAcumulado = chartData.length > 0 
  ? chartData[chartData.length - 1].lucroAcumulado + receita - despesa
  : receita - despesa;
```

**De onde vem os dados:**
- `recentTransactions` (transações dos últimos 7 dias)

**Para onde envia o resultado:**
- Gráfico de barras semanal no Dashboard

**Atualiza banco de dados diretamente?**
- ❌ Não

**Risco de somar duas vezes:**
- ⚠️ **SIM** - Não verifica se transações estão em resumos diários

**Risco de somar negativo:**
- ⚠️ **ATENÇÃO** - Não trata Surebet e FreeBet de forma especial

---

## 📂 2. RESUMO DO DIA (`src/pages/ResumoDia.tsx`)

### 2.1. Lucro do Dia (`profit`)

**Localização**: Linhas 117-132

**O que soma:**
- Lucro total do dia selecionado

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
const deposits = [...otherDeposits, ...surebetTransactions];

const totalSurebetProfit = surebetTransactions.reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0);
const totalDeposits = otherDeposits.reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0);
const totalWithdraws = withdraws.reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0);
const profit = totalWithdraws - totalDeposits + totalSurebetProfit;
```

**De onde vem os dados:**
- `todayTransactions` (transações do dia selecionado)

**Para onde envia o resultado:**
- Exibido no card principal de lucro
- Usado em gráficos e estatísticas

**Atualiza banco de dados diretamente?**
- ❌ Não, apenas calcula para exibição

**Risco de somar duas vezes:**
- ⚠️ **POSSÍVEL** - Não verifica se já existe resumo diário

**Risco de somar negativo:**
- ✅ Tratado - Surebet sempre soma positivo

---

### 2.2. Estatísticas por Plataforma (`platformStats`)

**Localização**: Linhas 145-167

**O que soma:**
- Depósitos, saques e lucro por plataforma no dia

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
    name: platform.name,
    deposits: platformDeposits,
    withdraws: platformWithdraws,
    profit: platformProfit,
    transactions: platformTransactions.length
  };
});
```

**De onde vem os dados:**
- `todayTransactions` filtradas por `platformId`

**Para onde envia o resultado:**
- Gráficos de pizza e barras por plataforma

**Atualiza banco de dados diretamente?**
- ❌ Não

**Risco de somar duas vezes:**
- ⚠️ **POSSÍVEL**

**Risco de somar negativo:**
- ✅ Tratado

---

### 2.3. Estatísticas por Funcionário (`employeeStats`)

**Localização**: Linhas 169-190

**O que soma:**
- Depósitos, saques e lucro por funcionário no dia

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
    name: employee.name,
    deposits: employeeDeposits,
    withdraws: employeeWithdraws,
    profit: employeeProfit,
    transactions: employeeTransactions.length
  };
});
```

**De onde vem os dados:**
- `todayTransactions` filtradas por `employeeId`

**Para onde envia o resultado:**
- Gráficos de barras por funcionário

**Atualiza banco de dados diretamente?**
- ❌ Não

**Risco de somar duas vezes:**
- ⚠️ **POSSÍVEL**

**Risco de somar negativo:**
- ✅ Tratado

---

### 2.4. Fechar Dia (`handleCloseDay`)

**Localização**: Linhas 196-281

**O que soma:**
- Totais de depósitos e saques para criar/atualizar resumo diário

**Como soma:**
```typescript
const depositsToClose = transactionsToClose.filter((t: any) => t.type === 'deposit');
const withdrawsToClose = transactionsToClose.filter((t: any) => t.type === 'withdraw');
const totalDepositsToClose = depositsToClose.reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0);
const totalWithdrawsToClose = withdrawsToClose.reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0);
const profitToClose = totalWithdrawsToClose - totalDepositsToClose;
```

**De onde vem os dados:**
- `transactionsToClose` (transações do dia a serem fechadas)

**Para onde envia o resultado:**
- Cria ou atualiza `UserDailySummary` no Firestore
- **⚠️ PROBLEMA**: Não trata Surebet separadamente aqui!

**Atualiza banco de dados diretamente?**
- ✅ Sim - Atualiza `dailySummaries` via `UserDailySummaryService`

**Risco de somar duas vezes:**
- ⚠️ **SIM** - Se já existe resumo, soma aos valores existentes

**Risco de somar negativo:**
- ⚠️ **PROBLEMA CRÍTICO** - Surebet seria subtraído aqui pois são `deposit`

---

### 2.5. Salvar em Outra Data (`handleSaveToAnotherDate`)

**Localização**: Linhas 283-381

**O que soma:**
- Totais para salvar em uma data diferente

**Como soma:**
```typescript
const depositsToSave = transactionsToSave.filter((t: any) => t.type === 'deposit');
const withdrawsToSave = transactionsToSave.filter((t: any) => t.type === 'withdraw');
const totalDepositsToSave = depositsToSave.reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0);
const totalWithdrawsToSave = withdrawsToSave.reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0);
const profitToSave = totalWithdrawsToSave - totalDepositsToSave;
```

**De onde vem os dados:**
- `transactionsToSave` (transações a serem movidas)

**Para onde envia o resultado:**
- Cria ou atualiza `UserDailySummary` em outra data

**Atualiza banco de dados diretamente?**
- ✅ Sim

**Risco de somar duas vezes:**
- ⚠️ **SIM**

**Risco de somar negativo:**
- ⚠️ **PROBLEMA CRÍTICO** - Mesmo problema do `handleCloseDay`

---

## 📂 3. CALENDÁRIO MENSAL (`src/components/dashboard/MonthlyCalendar.tsx`)

### 3.1. Lucros Diários (`dailyProfits`)

**Localização**: Linhas 36-120

**O que soma:**
- Lucro de cada dia do mês para exibição no calendário

**Como soma:**
```typescript
const dailyProfits = useMemo(() => {
  const profits = new Map<string, number>();
  const closedDates = new Set<string>();
  
  // 1. Processar histórico (dias fechados)
  historicalSummaries.forEach((summary: any) => {
    const dateKey = format(summary.date.toDate(), 'yyyy-MM-dd');
    closedDates.add(dateKey);
    profits.set(dateKey, summary.profit || summary.margin || 0);
  });
  
  // 2. Processar transações não fechadas
  allTransactions.forEach((transaction: any) => {
    const transactionDate = transaction.date;
    
    if (closedDates.has(transactionDate)) {
      return;
    }
    
    // Excluir FreeBet e Surebet se já existe resumo
    const isFreeBet = transaction.description && transaction.description.startsWith('FreeBet');
    if (isFreeBet && profits.has(transactionDate)) {
      return;
    }
    
    const isSurebet = transaction.description && transaction.description.startsWith('Surebet');
    if (isSurebet && profits.has(transactionDate)) {
      return;
    }
    
    // Calcular lucro da transação
    let transactionProfit;
    if (isSurebet) {
      transactionProfit = transaction.amount; // Sempre positivo
    } else {
      transactionProfit = transaction.type === 'withdraw' ? transaction.amount : -transaction.amount;
    }
    
    // Somar ao lucro do dia
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
- `historicalSummaries` (resumos diários)
- `allTransactions` (todas as transações)

**Para onde envia o resultado:**
- Exibido em cada dia do calendário mensal

**Atualiza banco de dados diretamente?**
- ❌ Não

**Risco de somar duas vezes:**
- ✅ Tratado - Exclui transações de dias fechados

**Risco de somar negativo:**
- ✅ Tratado - Surebet sempre positivo

---

## 📂 4. META MENSAL (`src/components/dashboard/MonthlyGoalCard.tsx`)

### 4.1. Lucro Mensal (`monthlyProfit`)

**Localização**: Linhas 49-115

**O que soma:**
- Lucro total do mês para calcular progresso da meta

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
  
  // Excluir FreeBet e Surebet se já estão no resumo
  const isFreeBet = transaction.description && transaction.description.startsWith('FreeBet');
  if (isFreeBet) {
    const summaryForDate = monthlySummaries.find((s: any) => s.date === transactionDate);
    if (summaryForDate) {
      return false;
    }
  }
  
  const isSurebet = transaction.description && transaction.description.startsWith('Surebet');
  if (isSurebet) {
    const summaryForDate = monthlySummaries.find((s: any) => s.date === transactionDate);
    if (summaryForDate) {
      return false;
    }
  }
  
  return true;
});

const monthlyRevenueFromTransactions = openTransactions.reduce((total: number, transaction: any) => {
  const isSurebet = transaction.description && transaction.description.startsWith('Surebet');
  let transactionProfit;
  if (isSurebet) {
    transactionProfit = transaction.amount; // Sempre positivo
  } else {
    transactionProfit = transaction.type === 'withdraw' ? transaction.amount : -transaction.amount;
  }
  return total + transactionProfit;
}, 0);

const monthlyProfit = monthlyRevenueFromSummaries + monthlyRevenueFromTransactions;
```

**De onde vem os dados:**
- `dailySummaries` (resumos diários)
- `monthlyTransactions` (transações do mês)

**Para onde envia o resultado:**
- Barra de progresso da meta mensal

**Atualiza banco de dados diretamente?**
- ❌ Não

**Risco de somar duas vezes:**
- ✅ Tratado

**Risco de somar negativo:**
- ✅ Tratado

---

## 📂 5. SALDOS (`src/pages/Saldos.tsx`)

### 5.1. Saldos por Plataforma (`calculatePlatformBalances`)

**Localização**: Linhas 68-142

**O que soma:**
- Saldo atual de cada funcionário por plataforma
- Saldo total geral

**Como soma:**
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
      
      // Verificar ajustes manuais (prioritários)
      const manualAdjustments = empTransactions.filter(
        (t: any) => t.description && t.description.includes('Ajuste manual de saldo')
      );
      
      if (manualAdjustments.length > 0) {
        // Usar último ajuste manual como saldo final
        const lastAdjustment = manualAdjustments.sort((a: any, b: any) => {
          // Ordenar por timestamp
          const timestampA = a.createdAt?.toDate?.()?.getTime() || 0;
          const timestampB = b.createdAt?.toDate?.()?.getTime() || 0;
          return timestampB - timestampA;
        })[0];
        
        const manualBalance = Number(lastAdjustment.amount || 0);
        balances[emp.id].platforms[plat.id] = manualBalance;
        balances[emp.id].total += manualBalance;
      } else {
        // Calcular normalmente
        const normalTransactions = empTransactions.filter(
          (t: any) => !t.description || !t.description.includes('Ajuste manual de saldo')
        );
        
        const deposits = normalTransactions
          .filter((t: any) => t.type === 'deposit')
          .reduce((s: number, t: any) => s + Number(t.amount || 0), 0);
        
        const withdraws = normalTransactions
          .filter((t: any) => t.type === 'withdraw')
          .reduce((s: number, t: any) => s + Number(t.amount || 0), 0);
        
        const balance = deposits - withdraws; // Saldo real (pode ser negativo)
        balances[emp.id].platforms[plat.id] = Math.max(0, balance); // Exibir apenas positivo
        balances[emp.id].total += Math.max(0, balance);
      }
    });
  });
  
  return Object.values(balances);
};

// Saldo total geral
const totalBalance = platformBalances.reduce((sum: number, emp: any) => sum + (emp.total || 0), 0);
```

**De onde vem os dados:**
- `allTransactions` (todas as transações)
- `employees` e `platforms`

**Para onde envia o resultado:**
- Tabela de saldos por funcionário e plataforma
- Card de saldo total

**Atualiza banco de dados diretamente?**
- ❌ Não

**Risco de somar duas vezes:**
- ⚠️ **SIM** - Não verifica resumos diários

**Risco de somar negativo:**
- ⚠️ **ATENÇÃO** - Não trata Surebet como lucro (considera como depósito normal)

---

## 📂 6. RELATÓRIOS (`src/pages/Relatorios.tsx`)

### 6.1. Estatísticas do Mês (`monthlyStats`)

**Localização**: Linhas 151-200

**O que soma:**
- Depósitos, saques e lucro do mês selecionado

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
  
  // ⚠️ PROBLEMA: Não trata Surebet e FreeBet aqui!
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

**De onde vem os dados:**
- `dailySummaries` e `monthlyTransactions`

**Para onde envia o resultado:**
- Cards de estatísticas do mês
- Gráficos

**Atualiza banco de dados diretamente?**
- ❌ Não

**Risco de somar duas vezes:**
- ✅ Tratado (exclui dias fechados)

**Risco de somar negativo:**
- ⚠️ **PROBLEMA CRÍTICO** - Surebet seria subtraído aqui!

---

### 6.2. Dados Diários (`dailyData`)

**Localização**: Linhas 244-338

**O que soma:**
- Lucro, depósitos e saques de cada dia do mês

**Como soma:**
```typescript
// Para cada dia do mês
for (let day = 1; day <= daysInMonth; day++) {
  const dateString = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  
  let dayProfit = 0;
  let dayDeposits = 0;
  let dayWithdraws = 0;
  
  // Verificar se há fechamento para este dia
  const summary = summariesByDate.get(dateString);
  if (summary) {
    // Usar dados do fechamento
    dayProfit = summary.profit || summary.margin || 0;
    dayDeposits = summary.totalDeposits || 0;
    dayWithdraws = summary.totalWithdraws || 0;
  } else {
    // Usar transações abertas
    const dayTransactionsOpen = openTransactionsByDate.get(dateString) || [];
    const deposits = dayTransactionsOpen.filter((t: any) => t.type === 'deposit');
    const withdraws = dayTransactionsOpen.filter((t: any) => t.type === 'withdraw');
    dayDeposits = deposits.reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0);
    dayWithdraws = withdraws.reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0);
    dayProfit = dayWithdraws - dayDeposits;
    // ⚠️ PROBLEMA: Não trata Surebet aqui!
  }
}
```

**De onde vem os dados:**
- `dailySummaries` e `monthlyTransactions`

**Para onde envia o resultado:**
- Gráfico de linha diário

**Atualiza banco de dados diretamente?**
- ❌ Não

**Risco de somar duas vezes:**
- ✅ Tratado

**Risco de somar negativo:**
- ⚠️ **PROBLEMA CRÍTICO** - Surebet seria subtraído

---

## 📂 7. FREEBET (`src/pages/FreeBetOperation.tsx`)

### 7.1. Cálculo de Lucro (`calculos`)

**Localização**: Linhas 81-106

**O que soma:**
- Total apostado, retorno, conversões e lucro geral da operação FreeBet

**Como soma:**
```typescript
const calculos = useMemo(() => {
  const totalApostado = funcionarios.reduce((sum, f) => sum + (f.valorApostado || 0), 0);
  const contaVencedora = funcionarios.find(f => f.vencedor);
  const retorno = contaVencedora?.retorno || 0;
  const perdaFreeBet = totalApostado - retorno;
  
  // Funcionários com freebet (não vencedores + vencedores que também recebem freebet)
  const funcionariosComFreebet = funcionarios.filter(
    f => !f.vencedor || (f.vencedor && f.vencedorRecebeFreebet === true)
  );
  
  const totalFreeBets = funcionariosComFreebet.length * valorFreeBet;
  
  // Calcular conversões das freebets
  const totalConversaoSaldo = funcionariosComFreebet.reduce(
    (sum, f) => sum + (f.conversaoSaldo || 0),
    0
  );
  
  // Lucro geral = (Retorno da conta vencedora + Total de conversões) - Total apostado
  const lucroGeral = (retorno + totalConversaoSaldo) - totalApostado;

  return {
    totalApostado,
    retorno,
    perdaFreeBet,
    totalFreeBets,
    totalConversaoSaldo,
    lucroGeral,
  };
}, [funcionarios, valorFreeBet, funcionariosComFreebet]);
```

**De onde vem os dados:**
- Estado local da operação FreeBet

**Para onde envia o resultado:**
- Exibido na tela da operação

**Atualiza banco de dados diretamente?**
- ❌ Não (apenas calcula)

---

### 7.2. Fechar Operação (`handleCloseOperation`)

**Localização**: Linhas 182-288

**O que soma:**
- Cria transação e atualiza resumo diário com lucro da operação

**Como soma:**
```typescript
const lucro = calculos.lucroGeral; // (retorno + totalConversaoSaldo) - totalApostado

// Criar transação (depósito se lucro > 0, saque se < 0)
let transactionId: string | undefined;
if (lucro !== 0) {
  const transactionType = lucro > 0 ? 'deposit' : 'withdraw';
  const transactionAmount = Math.abs(lucro);
  
  transactionId = await UserTransactionService.createTransaction(user.uid, {
    employeeId: '',
    platformId: '',
    type: transactionType,
    amount: transactionAmount,
    description: `FreeBet ${operation?.platformName || 'Operação'}`,
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
    profit: (existingSummary.profit || existingSummary.margin || 0) + lucro,
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
```

**De onde vem os dados:**
- `calculos.lucroGeral` (calculado acima)

**Para onde envia o resultado:**
- Cria `UserTransaction` no Firestore
- Atualiza/cria `UserDailySummary` no Firestore

**Atualiza banco de dados diretamente?**
- ✅ Sim

**Risco de somar duas vezes:**
- ✅ Tratado - Verifica se existe resumo antes de criar

**Risco de somar negativo:**
- ✅ Tratado - Usa `depositContribution` e `withdrawContribution` separados

---

## 📂 8. SURBET (`src/components/surebet/SurebetCalculator.tsx`)

### 8.1. Cálculo de Lucro Surebet (`calculations`)

**Localização**: Linhas 99-142

**O que soma:**
- Lucro individual por casa, lucro total e margem

**Como soma:**
```typescript
const calculations = useMemo(() => {
  // Cálculos individuais de cada casa
  const return1 = house1.odd * house1.stake;
  const return2 = house2.odd * house2.stake;
  const profit1 = return1 - calculations.totalInvested;
  const profit2 = return2 - calculations.totalInvested;
  
  // Lucro total da operação
  const totalProfit = returnAmount - totalInvested;
  
  // Margem de lucro (%)
  const margin = totalInvested > 0
    ? (totalProfit / totalInvested) * 100 
    : 0;
  
  return {
    profit1,
    profit2,
    totalProfit,
    margin,
    totalInvested,
    returnAmount
  };
}, [house1, house2, totalInvested, returnAmount]);
```

**De onde vem os dados:**
- Estado local da calculadora (odds e stakes)

**Para onde envia o resultado:**
- Exibido na calculadora
- Usado ao criar registros

---

### 8.2. Adicionar à Planilha (`handleSpreadsheet`)

**Localização**: Linhas 307-400

**O que soma:**
- Cria transação de lucro e atualiza resumo diário

**Como soma:**
```typescript
const lucroTotal = calculations.totalProfit; // Lucro total da operação

// Criar transação apenas se houver lucro
let transactionId: string | undefined;
if (lucroTotal > 0) {
  transactionId = await UserTransactionService.createTransaction(user.uid, {
    employeeId: '',
    platformId: '',
    type: 'deposit', // ⚠️ Tipo deposit mesmo sendo lucro positivo
    amount: lucroTotal,
    description: `Surebet - ${house1.name} vs ${house2.name}`,
    date: currentDate,
  });

  // Atualizar resumo diário
  const existingSummary = await UserDailySummaryService.getDailySummaryByDate(user.uid, currentDate);
  if (existingSummary) {
    await UserDailySummaryService.updateDailySummary(user.uid, existingSummary.id, {
      totalDeposits: (existingSummary.totalDeposits || 0) + lucroTotal, // Soma como depósito
      profit: (existingSummary.profit || existingSummary.margin || 0) + lucroTotal, // Mas soma no lucro!
      margin: (existingSummary.margin || existingSummary.profit || 0) + lucroTotal,
      transactionCount: (existingSummary.transactionCount || 0) + 1,
      updatedAt: new Date(),
    });
  } else {
    await UserDailySummaryService.createDailySummary(user.uid, {
      date: currentDate,
      totalDeposits: lucroTotal, // Armazena como depósito
      totalWithdraws: 0,
      profit: lucroTotal, // Mas é lucro
      margin: lucroTotal,
      transactionCount: 1,
      transactionsSnapshot: [],
      byEmployee: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }
}

// Criar dois registros na planilha Surebet (um para cada casa)
// ...código de criação dos registros...
```

**De onde vem os dados:**
- `calculations.totalProfit`

**Para onde envia o resultado:**
- Cria `UserTransaction` tipo 'deposit' com descrição "Surebet..."
- Atualiza/cria `UserDailySummary`
- Cria registros em `SurebetRecord`

**Atualiza banco de dados diretamente?**
- ✅ Sim

**Risco de somar duas vezes:**
- ✅ Tratado - Verifica resumo existente

**Risco de somar negativo:**
- ⚠️ **PROBLEMA** - Armazena como `deposit` mas deveria ser tratado diferente nos cálculos

---

### 8.3. Deletar Registro Surebet (`deleteRecord` em `SurebetSpreadsheet.tsx`)

**Localização**: Linhas 48-113

**O que soma:**
- Remove lucro da transação e atualiza resumo diário

**Como soma:**
```typescript
// Encontrar o registro com transactionId
const recordWithTransaction = operationRecords.find(r => r.transactionId);

if (recordWithTransaction?.transactionId) {
  // O lucro total da surebet é o mesmo valor em ambos os registros (profit)
  const firstRecord = operationRecords[0];
  const totalProfit = firstRecord?.profit || 0;

  // Excluir a transação
  await UserTransactionService.deleteTransaction(user.uid, recordWithTransaction.transactionId);

  // Atualizar resumo diário
  const existingSummary = await UserDailySummaryService.getDailySummaryByDate(user.uid, recordDate);
  
  if (existingSummary) {
    const newProfit = Math.max(0, (existingSummary.profit || existingSummary.margin || 0) - totalProfit);
    const newDeposits = Math.max(0, (existingSummary.totalDeposits || 0) - totalProfit);
    
    await UserDailySummaryService.updateDailySummary(user.uid, existingSummary.id, {
      totalDeposits: newDeposits,
      profit: newProfit,
      margin: newProfit,
      transactionCount: Math.max(0, (existingSummary.transactionCount || 0) - 1),
      updatedAt: new Date(),
    });
  }
}
```

**De onde vem os dados:**
- Registro Surebet sendo deletado

**Para onde envia o resultado:**
- Remove `UserTransaction`
- Atualiza `UserDailySummary`

**Atualiza banco de dados diretamente?**
- ✅ Sim

**Risco de somar duas vezes:**
- ✅ Tratado

**Risco de somar negativo:**
- ✅ Tratado - Usa `Math.max(0, ...)` para evitar valores negativos

---

## 📂 9. SERVIÇO DE FECHAMENTO DIÁRIO (`src/core/services/daily-closure.service.ts`)

### 9.1. Calcular Resumo Diário (`calculateDailySummary`)

**Localização**: Linhas 130-198

**O que soma:**
- Totais gerais e por funcionário para criar resumo diário

**Como soma:**
```typescript
private static async calculateDailySummary(
  userId: string, 
  date: string, 
  transactions: any[]
): Promise<Omit<DailySummary, 'id' | 'userId' | 'createdAt' | 'updatedAt'>> {
  
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
    employeeSummaries
  };
}
```

**De onde vem os dados:**
- `transactions` (transações do dia passadas como parâmetro)

**Para onde envia o resultado:**
- Retorna objeto para criar/atualizar `UserDailySummary`

**Atualiza banco de dados diretamente?**
- ❌ Não (retorna dados, quem chama atualiza)

**Risco de somar duas vezes:**
- ✅ Não aplicável (calcula de uma lista de transações)

**Risco de somar negativo:**
- ✅ Tratado - Surebet sempre positivo

---

## 📂 10. SERVIÇO DE TRANSAÇÕES (`src/core/services/user-specific.service.ts`)

### 10.1. Deletar Transação (`deleteTransaction`)

**Localização**: Linhas 218-267

**O que soma:**
- Remove valores do resumo diário ao deletar transação

**Como soma:**
```typescript
static async deleteTransaction(userId: string, transactionId: string): Promise<void> {
  // Buscar a transação antes de excluir
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
          // Se é FreeBet, apenas atualizar transactionCount
          await UserDailySummaryService.updateDailySummary(userId, existingSummary.id, {
            transactionCount: Math.max(0, (existingSummary.transactionCount || 0) - 1),
            updatedAt: new Date(),
          });
        } else {
          // Para transações normais, subtrair os valores do resumo diário
          const transactionProfit = transaction.type === 'withdraw' ? transaction.amount : -transaction.amount;
          const depositContribution = transaction.type === 'deposit' ? transaction.amount : 0;
          const withdrawContribution = transaction.type === 'withdraw' ? transaction.amount : 0;
          
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

**De onde vem os dados:**
- `transaction` (transação sendo deletada)

**Para onde envia o resultado:**
- Atualiza `UserDailySummary`

**Atualiza banco de dados diretamente?**
- ✅ Sim

**Risco de somar duas vezes:**
- ✅ Tratado

**Risco de somar negativo:**
- ⚠️ **PROBLEMA** - Surebet seria subtraído como depósito normal aqui!

---

## 📂 11. GESTÃO DE FUNCIONÁRIOS (`src/pages/GestaoFuncionarios.tsx`)

### 11.1. Totais do Dia (`totalDeposits`, `totalWithdraws`, `dailyBalance`)

**Localização**: Linhas 205-214

**O que soma:**
- Depósitos, saques e saldo do dia atual

**Como soma:**
```typescript
const totalDeposits = todayTransactions
  .filter(t => t.type === 'deposit')
  .reduce((sum, t) => sum + (t.amount || 0), 0);
  
const totalWithdraws = todayTransactions
  .filter(t => t.type === 'withdraw')
  .reduce((sum, t) => sum + (t.amount || 0), 0);
  
const dailyBalance = totalWithdraws - totalDeposits;
```

**De onde vem os dados:**
- `todayTransactions` (transações do dia)

**Para onde envia o resultado:**
- Cards de estatísticas do dia

**Atualiza banco de dados diretamente?**
- ❌ Não

**Risco de somar duas vezes:**
- ⚠️ **SIM** - Não verifica resumos diários

**Risco de somar negativo:**
- ⚠️ **PROBLEMA** - Surebet seria subtraído

---

### 11.2. Lucro por Funcionário (`getDayProfitLoss`)

**Localização**: Linhas 216-230

**O que soma:**
- Lucro/prejuízo de cada funcionário no dia

**Como soma:**
```typescript
const getDayProfitLoss = (employee: any) => {
  const employeeTodayTransactions = todayTransactions.filter(
    (t: any) => t.employeeId === employee.id
  );

  const deposits = employeeTodayTransactions
    .filter((t: any) => t.type === 'deposit')
    .reduce((sum: number, t: any) => sum + Number(t.amount), 0);

  const withdraws = employeeTodayTransactions
    .filter((t: any) => t.type === 'withdraw')
    .reduce((sum: number, t: any) => sum + Number(t.amount), 0);

  return withdraws - deposits; // Saque positivo, depósito negativo
};
```

**De onde vem os dados:**
- `todayTransactions` filtradas por funcionário

**Para onde envia o resultado:**
- Exibido na tabela de funcionários

**Atualiza banco de dados diretamente?**
- ❌ Não

**Risco de somar duas vezes:**
- ⚠️ **SIM**

**Risco de somar negativo:**
- ⚠️ **PROBLEMA** - Surebet seria subtraído

---

## 📂 12. NOTIFICAÇÕES (`src/hooks/useNotificationMonitor.ts`)

### 12.1. Cálculo de Lucro Mensal para Notificações

**Localização**: Linhas 86-110

**O que soma:**
- Lucro mensal para verificar progresso da meta

**Como soma:**
```typescript
// Calcular lucro mensal
const monthlySummaries = dailySummaries.filter((summary: any) => {
  const summaryDate = summary.date?.toDate?.() || new Date(summary.date);
  return summaryDate >= firstDay && summaryDate <= lastDay;
});

const monthlyRevenueFromSummaries = monthlySummaries.reduce((total: number, summary: any) => {
  return total + (summary.profit || summary.margin || 0);
}, 0);

const openTransactions = transactions.filter((t: any) => {
  const transactionDate = t.createdAt?.toDate?.() || new Date(t.createdAt);
  return transactionDate >= firstDay && transactionDate <= lastDay && t.status !== 'closed';
});

// Verificar se é uma transação de Surebet (sempre contribui positivamente para o lucro)
const monthlyRevenueFromTransactions = openTransactions.reduce((total: number, transaction: any) => {
  const isSurebet = transaction.description && transaction.description.startsWith('Surebet');
  if (isSurebet) {
    return total + transaction.amount; // Sempre positivo
  }
  return transaction.type === 'withdraw' ? total + transaction.amount : total - transaction.amount;
}, 0);

const monthlyProfit = monthlyRevenueFromSummaries + monthlyRevenueFromTransactions;
```

**De onde vem os dados:**
- `dailySummaries` e `transactions`

**Para onde envia o resultado:**
- Calcula porcentagem da meta para disparar notificações

**Atualiza banco de dados diretamente?**
- ❌ Não

**Risco de somar duas vezes:**
- ⚠️ **POSSÍVEL** - Filtro por `status !== 'closed'` pode não ser suficiente

**Risco de somar negativo:**
- ✅ Tratado - Surebet sempre positivo

---

## 📂 13. MODAL DE TRANSAÇÕES DO DIA (`src/components/dashboard/DayTransactionsModal.tsx`)

### 13.1. Resumo do Dia no Modal

**Localização**: Linhas 329-370

**O que soma:**
- Depósitos, saques e lucro do dia no modal

**Como soma:**
```typescript
// Depósitos
R$ {dayTransactions
  .filter((t: any) => t.type === 'deposit')
  .reduce((acc: number, t: any) => acc + Number(t.amount), 0)
  .toLocaleString('pt-BR')
}

// Saques
R$ {dayTransactions
  .filter((t: any) => t.type === 'withdraw')
  .reduce((acc: number, t: any) => acc + Number(t.amount), 0)
  .toLocaleString('pt-BR')
}

// Lucro
R$ {dayTransactions
  .reduce((acc: number, t: any) => 
    acc + (t.type === 'withdraw' ? t.amount : -t.amount), 0
  )
  .toLocaleString('pt-BR')
}
```

**De onde vem os dados:**
- `dayTransactions` (transações do dia selecionado)

**Para onde envia o resultado:**
- Exibido no modal

**Atualiza banco de dados diretamente?**
- ❌ Não

**Risco de somar duas vezes:**
- ⚠️ **SIM**

**Risco de somar negativo:**
- ⚠️ **PROBLEMA** - Surebet seria subtraído

---

## 📂 14. BACKEND (Functions) (`functions/src/stats/aggregations.ts`)

### 14.1. Estatísticas Globais (`calculateGlobalStats`)

**Localização**: Linhas 36-136

**O que soma:**
- Receita total, do dia, semana e mês para admin

**Como soma:**
```typescript
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

// Similar para revenueWeek e revenueMonth
```

**De onde vem os dados:**
- Collection `transactions_plans` (transações de planos, não transações de usuários)

**Para onde envia o resultado:**
- Collection `admin_stats`

**Atualiza banco de dados diretamente?**
- ✅ Sim

**Risco de somar duas vezes:**
- ⚠️ Não aplicável (soma apenas transações completadas)

**Risco de somar negativo:**
- ⚠️ Não aplicável (soma apenas valores positivos de transações de planos)

**Nota**: Este é um cálculo separado para estatísticas de ADMIN (receitas de planos), não afeta cálculos de usuários.

---

## 🔴 PROBLEMAS CRÍTICOS IDENTIFICADOS

### 1. **INCONSISTÊNCIA NO TRATAMENTO DE SURBET**

**Problema**: Surebet é armazenado como transação tipo `'deposit'`, mas deve ser tratado como lucro positivo em TODOS os cálculos.

**Locais com problema**:
- ❌ `ResumoDia.tsx` - `handleCloseDay` (linha 207) - Não trata Surebet
- ❌ `ResumoDia.tsx` - `handleSaveToAnotherDate` (linha 309) - Não trata Surebet
- ❌ `Relatorios.tsx` - `monthlyStats` (linha 171) - Não trata Surebet
- ❌ `Relatorios.tsx` - `dailyData` (linha 307) - Não trata Surebet
- ❌ `GestaoFuncionarios.tsx` - `totalDeposits` (linha 206) - Não trata Surebet
- ❌ `DayTransactionsModal.tsx` - Resumo (linha 357) - Não trata Surebet
- ❌ `user-specific.service.ts` - `deleteTransaction` (linha 248) - Não trata Surebet
- ❌ `Saldos.tsx` - `calculatePlatformBalances` (linha 124) - Não trata Surebet

**Locais corrigidos**:
- ✅ `Dashboard.tsx` - `todayRevenue` - Trata Surebet corretamente
- ✅ `Dashboard.tsx` - `monthlyRevenue` - Trata Surebet corretamente
- ✅ `ResumoDia.tsx` - `profit` - Trata Surebet corretamente
- ✅ `MonthlyCalendar.tsx` - `dailyProfits` - Trata Surebet corretamente
- ✅ `MonthlyGoalCard.tsx` - `monthlyProfit` - Trata Surebet corretamente
- ✅ `useNotificationMonitor.ts` - `monthlyProfit` - Trata Surebet corretamente
- ✅ `daily-closure.service.ts` - `calculateDailySummary` - Trata Surebet corretamente

---

### 2. **RISCO DE DUPLICAÇÃO DE TRANSAÇÕES**

**Problema**: FreeBet e Surebet podem ser contados duas vezes (uma vez na transação individual e outra no resumo diário).

**Locais com lógica de prevenção**:
- ✅ `Dashboard.tsx` - Exclui FreeBet/Surebet se já existe resumo
- ✅ `MonthlyCalendar.tsx` - Exclui FreeBet/Surebet se já existe resumo
- ✅ `MonthlyGoalCard.tsx` - Exclui FreeBet/Surebet se já existe resumo

**Locais sem proteção**:
- ⚠️ `ResumoDia.tsx` - Não verifica resumos antes de calcular
- ⚠️ `GestaoFuncionarios.tsx` - Calcula direto das transações
- ⚠️ `Saldos.tsx` - Calcula direto das transações
- ⚠️ `DayTransactionsModal.tsx` - Calcula direto das transações
- ⚠️ `Dashboard.tsx` - `generateWeeklyChartData` - Não verifica resumos

---

### 3. **MÚLTIPLAS FONTES DE VERDADE**

**Problema**: O mesmo valor é calculado em vários lugares diferentes, cada um com sua própria lógica.

**Exemplo**: O lucro mensal é calculado em:
1. `Dashboard.tsx` (linha 183)
2. `MonthlyGoalCard.tsx` (linha 115)
3. `Relatorios.tsx` (linha 175)
4. `useNotificationMonitor.ts` (linha 110)
5. `daily-closure.service.ts` (linha 150)

Cada um tem implementação ligeiramente diferente!

---

### 4. **CÁLCULOS NO FRONTEND E BACKEND**

**Frontend**:
- Todos os cálculos de lucro/depósitos/saques para exibição
- Criação de resumos diários manuais

**Backend**:
- `daily-closure.service.ts` - Fechamento automático
- `functions/src/stats/aggregations.ts` - Estatísticas de admin (separado)

**Problema**: Não há sincronização entre cálculos do frontend e backend.

---

## ✅ RECOMENDAÇÕES

### 1. **CRIAR FUNÇÃO CENTRAL DE CÁLCULO**

Criar um único serviço/utility que calcule lucro/saldo de forma consistente:

```typescript
// src/core/utils/financial-calculations.ts

export interface FinancialCalculationResult {
  totalDeposits: number;
  totalWithdraws: number;
  totalSurebetProfit: number;
  totalFreeBetProfit: number;
  profit: number;
  byEmployee: Record<string, EmployeeFinancialSummary>;
  byPlatform: Record<string, PlatformFinancialSummary>;
}

export function calculateFinancialSummary(
  transactions: UserTransaction[],
  includeClosedDates?: Set<string>
): FinancialCalculationResult {
  // Lógica única e centralizada
  // Trata Surebet, FreeBet, etc. corretamente
  // Retorna objeto padronizado
}
```

### 2. **PADRONIZAR CAMPOS NO BANCO**

Decidir se Surebet deve:
- Opção A: Ser armazenado como tipo especial (ex: `type: 'surebet'`)
- Opção B: Continuar como `'deposit'` mas sempre verificar descrição nos cálculos

### 3. **VALIDAR ANTES DE CRIAR RESUMO**

Sempre verificar se já existe resumo diário antes de criar novo ou recalcular.

### 4. **DOCUMENTAR REGRAS DE NEGÓCIO**

Criar documentação clara:
- Como Surebet afeta lucro
- Como FreeBet afeta lucro
- Quando excluir transações de cálculos
- Ordem de precedência (resumos vs transações)

---

## 📊 RESUMO ESTATÍSTICO

- **Total de arquivos com cálculos financeiros**: 14
- **Total de funções de cálculo**: 25+
- **Locais com problemas críticos**: 8
- **Locais já corrigidos**: 7
- **Cálculos duplicados**: 5 (lucro mensal)

---

**Data do mapeamento**: 2025-01-28  
**Versão do sistema**: Atual (após correções de Surebet)

