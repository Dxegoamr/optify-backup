# Prompt para Correção de Problema no Calendário Mensal - FreeBet e Resumos Desatualizados

## Contexto do Sistema

Estou trabalhando em um sistema de gestão financeira chamado Optify, construído com React/TypeScript e Firebase. O sistema gerencia transações financeiras (depósitos, saques, FreeBet e Surebet) e calcula lucros diários e mensais.

## Problema Específico Reportado

### Situação Atual:
1. **Dashboard mostra corretamente**: R$ 300,00 (um saque de 300 foi adicionado)
2. **Calendário Mensal mostra incorretamente**: R$ -110,00 (valor antigo de um resumo diário)

### Cenário que Causou o Problema:
1. Usuário tinha operações anteriores que geraram um resumo diário com profit = -110
2. Usuário excluiu todas as operações anteriores
3. Usuário adicionou apenas um saque de R$ 300,00
4. **Resultado esperado**: Calendário deveria mostrar R$ 300,00
5. **Resultado atual**: Calendário mostra R$ -110,00 (valor do resumo antigo)

### Comportamento Atual (ERRADO):
- O calendário está usando resumos diários do dia atual
- Quando há um resumo diário antigo/desatualizado, ele usa esse valor em vez de calcular das transações atuais
- O resumo antigo não foi atualizado após as exclusões

### Comportamento Esperado (CORRETO):
- Para o dia atual: SEMPRE calcular diretamente das transações atuais (ignorar resumos)
- Para dias passados fechados: usar resumos diários
- Para dias passados não fechados: calcular das transações

## Código Atual com Problema

### MonthlyCalendar.tsx - Função dailyProfits

```typescript
const dailyProfits = useMemo(() => {
  const profits = new Map<string, number>();
  const closedDates = new Set<string>();
  
  // 1️⃣ PROCESSAR HISTÓRICO (dias fechados)
  historicalSummaries.forEach((summary: any) => {
    // Converter data para string "YYYY-MM-DD"
    let dateKey: string;
    
    if (typeof summary.date === 'string') {
      dateKey = summary.date;
    } else if (summary.date && summary.date.toDate) {
      // Firebase Timestamp
      dateKey = format(summary.date.toDate(), 'yyyy-MM-dd');
    } else {
      // Date object
      dateKey = format(new Date(summary.date), 'yyyy-MM-dd');
    }
    
    closedDates.add(dateKey);
    profits.set(dateKey, summary.profit || summary.margin || 0);
  });
  
  // 2️⃣ PROCESSAR TODAS AS TRANSAÇÕES POR DIA (não fechadas ainda)
  allTransactions.forEach((transaction: any) => {
    const transactionDate = transaction.date;
    
    // PROBLEMA: Se a data está em closedDates, retorna sem processar
    // Isso significa que se existe um resumo (mesmo desatualizado), 
    // as transações atuais não são processadas
    if (closedDates.has(transactionDate)) {
      return;
    }
    
    // Verificar se é uma transação de FreeBet
    const isFreeBet = transaction.description && transaction.description.startsWith('FreeBet');
    
    // PROBLEMA: Se é FreeBet e já existe profit no Map, ignora
    // Mas o profit pode ser de um resumo antigo/desatualizado
    if (isFreeBet && profits.has(transactionDate)) {
      return;
    }
    
    // Verificar se é uma transação de Surebet
    const isSurebet = transaction.description && transaction.description.startsWith('Surebet');
    
    // PROBLEMA: Mesma lógica problemática para Surebet
    if (isSurebet && profits.has(transactionDate)) {
      return;
    }
    
    // Calcular lucro desta transação
    let transactionProfit;
    if (isSurebet) {
      transactionProfit = transaction.amount;
    } else {
      transactionProfit = transaction.type === 'withdraw' ? transaction.amount : -transaction.amount;
    }
    
    // PROBLEMA: Se já existe profit (de resumo antigo), soma
    // Mas deveria SUBSTITUIR se for o dia atual
    if (profits.has(transactionDate)) {
      const currentProfit = profits.get(transactionDate) || 0;
      const newProfit = currentProfit + transactionProfit;
      profits.set(transactionDate, newProfit);
    } else {
      profits.set(transactionDate, transactionProfit);
    }
  });
  
  return profits;
}, [historicalSummaries, allTransactions]);
```

## Problemas Identificados

### Problema 1: Usa Resumos do Dia Atual
- O código adiciona TODOS os resumos ao Map, incluindo resumos do dia atual
- Resumos do dia atual podem estar desatualizados (não refletem exclusões recentes)
- **Solução**: Excluir resumos do dia atual, sempre calcular das transações

### Problema 2: Não Trata FreeBet Corretamente
- FreeBet não está sendo processado corretamente na lógica de transações
- FreeBet deveria sempre somar positivo, mas está sendo ignorado se já existe profit
- **Solução**: Usar função `calculateProfit()` que trata FreeBet corretamente

### Problema 3: Soma em vez de Substituir para Dia Atual
- Se existe um resumo antigo e há novas transações, está somando
- Para o dia atual, deveria SUBSTITUIR o valor do resumo pelo cálculo das transações
- **Solução**: Para dia atual, ignorar resumos e calcular apenas das transações

### Problema 4: Não Usa Função Reutilizável
- O código tem lógica duplicada de cálculo de lucro
- Não usa a função `calculateProfit()` que foi criada para unificar cálculos
- **Solução**: Usar `calculateProfit()` e `isSameDate()` helpers

## Solução Necessária

### Mudanças no MonthlyCalendar.tsx:

1. **Excluir resumos do dia atual**:
   ```typescript
   const today = getCurrentDateStringInSaoPaulo();
   
   historicalSummaries.forEach((summary: any) => {
     let dateKey: string;
     // ... conversão de data ...
     
     // EXCLUIR resumos do dia atual
     if (isSameDate(dateKey, today)) {
       return; // Não processar resumos do dia atual
     }
     
     closedDates.add(dateKey);
     profits.set(dateKey, summary.profit || summary.margin || 0);
   });
   ```

2. **Para o dia atual, calcular apenas das transações**:
   ```typescript
   // Agrupar transações por data
   const transactionsByDate = new Map<string, Transaction[]>();
   
   allTransactions.forEach((transaction: any) => {
     const transactionDate = transaction.date;
     
     // Se o dia está fechado E não é hoje, ignorar (já está no resumo)
     if (closedDates.has(transactionDate) && !isSameDate(transactionDate, today)) {
       return;
     }
     
     // Agrupar por data
     if (!transactionsByDate.has(transactionDate)) {
       transactionsByDate.set(transactionDate, []);
     }
     transactionsByDate.get(transactionDate)!.push(transaction);
   });
   
   // Calcular lucro para cada dia usando função reutilizável
   transactionsByDate.forEach((transactions, date) => {
     const dayProfit = calculateProfit(transactions);
     
     // Para o dia atual, SUBSTITUIR qualquer valor existente
     if (isSameDate(date, today)) {
       profits.set(date, dayProfit);
     } else {
       // Para outros dias, somar se não existe resumo
       if (!closedDates.has(date)) {
         profits.set(date, dayProfit);
       }
     }
   });
   ```

3. **Importar helpers necessários**:
   ```typescript
   import { calculateProfit, isSameDate } from '@/utils/financial-calculations';
   import { getCurrentDateStringInSaoPaulo } from '@/utils/timezone';
   ```

## Código Completo do MonthlyCalendar.tsx

```typescript
import { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Lock } from 'lucide-react';
import { useFirebaseAuth } from '@/contexts/FirebaseAuthContext';
import { useTransactions, useAllDailySummaries } from '@/hooks/useFirestore';
import { getCurrentDateInSaoPaulo, formatDateInSaoPaulo, getCurrentDateStringInSaoPaulo } from '@/utils/timezone';
import { usePlanLimitations } from '@/hooks/usePlanLimitations';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import DayTransactionsModal from './DayTransactionsModal';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isToday, isPast } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { calculateProfit, isSameDate } from '@/utils/financial-calculations';

const MonthlyCalendar = () => {
  const [currentDate, setCurrentDate] = useState(getCurrentDateInSaoPaulo());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const { user } = useFirebaseAuth();
  const { canEditPreviousCalendarDays } = usePlanLimitations();

  // Buscar histórico de dias fechados
  const { data: historicalSummaries = [] } = useAllDailySummaries(user?.uid || '');
  
  // Buscar todas as transações
  const { data: allTransactions = [] } = useTransactions(user?.uid || '');
  
  // Calcular lucros diários - CORRIGIDO
  const dailyProfits = useMemo(() => {
    const profits = new Map<string, number>();
    const closedDates = new Set<string>();
    const today = getCurrentDateStringInSaoPaulo();
    
    // 1️⃣ PROCESSAR HISTÓRICO (dias fechados, EXCETO o dia atual)
    historicalSummaries.forEach((summary: any) => {
      // Converter data para string "YYYY-MM-DD"
      let dateKey: string;
      
      if (typeof summary.date === 'string') {
        dateKey = summary.date;
      } else if (summary.date && summary.date.toDate) {
        dateKey = format(summary.date.toDate(), 'yyyy-MM-dd');
      } else {
        dateKey = format(new Date(summary.date), 'yyyy-MM-dd');
      }
      
      // CORREÇÃO: Excluir resumos do dia atual
      if (isSameDate(dateKey, today)) {
        return; // Não processar resumos do dia atual
      }
      
      closedDates.add(dateKey);
      profits.set(dateKey, summary.profit || summary.margin || 0);
    });
    
    // 2️⃣ PROCESSAR TRANSAÇÕES POR DIA
    // Agrupar transações por data
    const transactionsByDate = new Map<string, any[]>();
    
    allTransactions.forEach((transaction: any) => {
      const transactionDate = transaction.date;
      
      // Se o dia está fechado E não é hoje, ignorar (já está no resumo)
      if (closedDates.has(transactionDate) && !isSameDate(transactionDate, today)) {
        return;
      }
      
      // Agrupar por data
      if (!transactionsByDate.has(transactionDate)) {
        transactionsByDate.set(transactionDate, []);
      }
      transactionsByDate.get(transactionDate)!.push(transaction);
    });
    
    // 3️⃣ CALCULAR LUCRO PARA CADA DIA usando função reutilizável
    transactionsByDate.forEach((transactions, date) => {
      const dayProfit = calculateProfit(transactions);
      
      // Para o dia atual, SEMPRE SUBSTITUIR qualquer valor existente
      if (isSameDate(date, today)) {
        profits.set(date, dayProfit);
      } else {
        // Para outros dias não fechados, usar o lucro calculado
        if (!closedDates.has(date)) {
          profits.set(date, dayProfit);
        }
      }
    });
    
    return profits;
  }, [historicalSummaries, allTransactions]);

  // ... resto do código permanece igual ...
};
```

## Regras Importantes

1. **Dia Atual**: Sempre calcular das transações atuais, ignorar resumos
2. **Dias Fechados**: Usar apenas resumos diários (não processar transações)
3. **Dias Abertos (passados)**: Calcular das transações (não há resumo)
4. **FreeBet**: Sempre positivo, tratado corretamente por `calculateProfit()`
5. **Consistência**: Usar mesma lógica do Dashboard e Relatórios

## Exemplo de Cálculo Correto

**Cenário:**
- Resumo antigo: profit = -110 (desatualizado)
- Transações atuais: Saque de R$ 300,00

**Cálculo Esperado:**
```
1. Excluir resumo do dia atual (não usar -110)
2. Calcular das transações: calculateProfit([{type: 'withdraw', amount: 300}])
3. Resultado: R$ 300,00
```

**Cálculo Atual (ERRADO):**
```
1. Adiciona resumo: profit = -110
2. Tenta processar transações, mas retorna porque date está em closedDates
3. Resultado: R$ -110,00 (ERRADO)
```

## Perguntas para o ChatGPT

1. Como garantir que o calendário sempre use transações atuais para o dia atual?
2. Como evitar que resumos desatualizados afetem o cálculo do dia atual?
3. Como unificar a lógica de cálculo entre Dashboard, Relatórios e Calendário?
4. Como garantir que FreeBet seja sempre tratado corretamente no calendário?

Por favor, corrija o `MonthlyCalendar.tsx` para:
1. ✅ Sempre calcular o dia atual das transações (ignorar resumos)
2. ✅ Usar função `calculateProfit()` para cálculos consistentes
3. ✅ Usar helper `isSameDate()` para comparação de datas
4. ✅ Garantir que FreeBet seja sempre positivo
5. ✅ Manter consistência com Dashboard e Relatórios

---

# CÓDIGOS RELACIONADOS PARA ANÁLISE

## 1. Função calculateProfit() - Utilitário Reutilizável

```typescript
// Arquivo: src/utils/financial-calculations.ts

export interface Transaction {
  id?: string;
  type: 'deposit' | 'withdraw';
  amount: number;
  description?: string;
  date?: string;
  [key: string]: any;
}

/**
 * Calcula o lucro total baseado em transações
 * REGRA: withdraws - deposits + freebet + surebet
 */
export function calculateProfit(transactions: Transaction[]): number {
  if (!transactions || transactions.length === 0) {
    return 0;
  }

  // Separar FreeBet, Surebet e transações normais
  const freebetTransactions = transactions.filter((t) =>
    t.description && t.description.startsWith('FreeBet')
  );
  
  const surebetTransactions = transactions.filter((t) =>
    t.description && t.description.startsWith('Surebet')
  );
  
  const otherDeposits = transactions.filter((t) =>
    t.type === 'deposit' &&
    (!t.description || (!t.description.startsWith('Surebet') && !t.description.startsWith('FreeBet')))
  );
  
  const withdraws = transactions.filter((t) => t.type === 'withdraw');

  // Calcular totais
  const totalFreebetProfit = freebetTransactions.reduce((sum, t) => sum + Number(t.amount || 0), 0);
  const totalSurebetProfit = surebetTransactions.reduce((sum, t) => sum + Number(t.amount || 0), 0);
  const totalDeposits = otherDeposits.reduce((sum, t) => sum + Number(t.amount || 0), 0);
  const totalWithdraws = withdraws.reduce((sum, t) => sum + Number(t.amount || 0), 0);

  // FreeBet e Surebet sempre positivos no lucro
  // Depósitos são negativos, saques são positivos
  const profit = totalWithdraws - totalDeposits + totalSurebetProfit + totalFreebetProfit;

  return profit;
}

/**
 * Verifica se duas datas são iguais (formato YYYY-MM-DD)
 */
export function isSameDate(date1: string, date2: string): boolean {
  if (!date1 || !date2) return false;
  
  const normalized1 = date1.trim();
  const normalized2 = date2.trim();
  
  return normalized1 === normalized2;
}
```

## 2. Dashboard.tsx - Como Calcula Receita do Dia (CORRETO)

```typescript
// Arquivo: src/pages/Dashboard.tsx
// Importações
import { calculateProfit, isSameDate } from '@/utils/financial-calculations';
import { getCurrentDateStringInSaoPaulo, getCurrentDateInSaoPaulo } from '@/utils/timezone';

// Dentro do componente Dashboard:

const today = getCurrentDateStringInSaoPaulo(); // Formato: 'YYYY-MM-DD'
const { data: todayTransactions = [] } = useTransactions(user?.uid || '', today, today);
const { data: dailySummaries = [] } = useAllDailySummaries(user?.uid || '');

// CORREÇÃO: Para o dia atual, SEMPRE calcular diretamente das transações
const todayRevenue = calculateProfit(todayTransactions);

// Calcular receita mensal
const currentYear = getCurrentDateInSaoPaulo().getFullYear();
const currentMonth = getCurrentDateInSaoPaulo().getMonth();

// Filtrar fechamentos diários do mês atual (EXCETO o dia atual)
const monthlySummaries = dailySummaries.filter((summary: any) => {
  const summaryDate = new Date(summary.date);
  const isCurrentMonth = summaryDate.getFullYear() === currentYear && summaryDate.getMonth() === currentMonth;
  // Excluir resumos do dia atual usando helper isSameDate
  return isCurrentMonth && !isSameDate(summary.date, today);
});

// Somar lucros dos fechamentos diários (apenas dias passados, não o dia atual)
const monthlyRevenueFromSummaries = monthlySummaries.reduce((total: number, summary: any) => {
  return total + (summary.profit || summary.margin || 0);
}, 0);

// Para o dia atual e outros dias não fechados, calcular diretamente das transações
const closedDates = new Set(monthlySummaries.map((summary: any) => summary.date));

const openTransactions = monthlyTransactions.filter((transaction: any) => {
  const transactionDate = transaction.date;

  // Se o dia está fechado E não é hoje, não processar (já está no resumo)
  if (closedDates.has(transactionDate) && !isSameDate(transactionDate, today)) {
    return false;
  }

  // Para o dia atual, sempre incluir todas as transações
  if (isSameDate(transactionDate, today)) {
    return true;
  }

  // Para outros dias não fechados, incluir normalmente
  return true;
});

// Usar função reutilizável para calcular lucro das transações abertas
const monthlyRevenueFromTransactions = calculateProfit(openTransactions);

const monthlyRevenue = monthlyRevenueFromSummaries + monthlyRevenueFromTransactions;
```

## 3. MonthlyCalendar.tsx - Código Atual (COM PROBLEMA)

```typescript
// Arquivo: src/components/dashboard/MonthlyCalendar.tsx

import { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Lock } from 'lucide-react';
import { useFirebaseAuth } from '@/contexts/FirebaseAuthContext';
import { useTransactions, useAllDailySummaries } from '@/hooks/useFirestore';
import { getCurrentDateInSaoPaulo, formatDateInSaoPaulo } from '@/utils/timezone';
import { usePlanLimitations } from '@/hooks/usePlanLimitations';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import DayTransactionsModal from './DayTransactionsModal';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isToday, isPast } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const MonthlyCalendar = () => {
  const [currentDate, setCurrentDate] = useState(getCurrentDateInSaoPaulo());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const { user } = useFirebaseAuth();
  const { canEditPreviousCalendarDays } = usePlanLimitations();

  // Buscar histórico de dias fechados
  const { data: historicalSummaries = [] } = useAllDailySummaries(user?.uid || '');
  
  // Buscar todas as transações
  const { data: allTransactions = [] } = useTransactions(user?.uid || '');
  
  // Calcular lucros diários - PROBLEMA AQUI
  const dailyProfits = useMemo(() => {
    const profits = new Map<string, number>();
    const closedDates = new Set<string>();
    
    // 1️⃣ PROCESSAR HISTÓRICO (dias fechados)
    historicalSummaries.forEach((summary: any) => {
      // Converter data para string "YYYY-MM-DD"
      let dateKey: string;
      
      if (typeof summary.date === 'string') {
        dateKey = summary.date;
      } else if (summary.date && summary.date.toDate) {
        // Firebase Timestamp
        dateKey = format(summary.date.toDate(), 'yyyy-MM-dd');
      } else {
        // Date object
        dateKey = format(new Date(summary.date), 'yyyy-MM-dd');
      }
      
      // PROBLEMA: Adiciona TODOS os resumos, incluindo do dia atual
      closedDates.add(dateKey);
      profits.set(dateKey, summary.profit || summary.margin || 0);
    });
    
    // 2️⃣ PROCESSAR TODAS AS TRANSAÇÕES POR DIA (não fechadas ainda)
    allTransactions.forEach((transaction: any) => {
      const transactionDate = transaction.date;
      
      // PROBLEMA: Se a data está em closedDates, retorna sem processar
      // Isso significa que se existe um resumo (mesmo desatualizado), 
      // as transações atuais não são processadas
      if (closedDates.has(transactionDate)) {
        return;
      }
      
      // Verificar se é uma transação de FreeBet
      const isFreeBet = transaction.description && transaction.description.startsWith('FreeBet');
      
      // PROBLEMA: Se é FreeBet e já existe profit no Map, ignora
      // Mas o profit pode ser de um resumo antigo/desatualizado
      if (isFreeBet && profits.has(transactionDate)) {
        return;
      }
      
      // Verificar se é uma transação de Surebet
      const isSurebet = transaction.description && transaction.description.startsWith('Surebet');
      
      // PROBLEMA: Mesma lógica problemática para Surebet
      if (isSurebet && profits.has(transactionDate)) {
        return;
      }
      
      // Calcular lucro desta transação
      let transactionProfit;
      if (isSurebet) {
        // Surebet sempre adiciona lucro positivo, mesmo sendo tipo 'deposit'
        transactionProfit = transaction.amount;
      } else {
        // PROBLEMA: FreeBet não está sendo tratado aqui!
        // Para outras transações, usar lógica normal
        transactionProfit = transaction.type === 'withdraw' ? transaction.amount : -transaction.amount;
      }
      
      // PROBLEMA: Se já existe profit (de resumo antigo), soma
      // Mas deveria SUBSTITUIR se for o dia atual
      if (profits.has(transactionDate)) {
        const currentProfit = profits.get(transactionDate) || 0;
        const newProfit = currentProfit + transactionProfit;
        profits.set(transactionDate, newProfit);
      } else {
        profits.set(transactionDate, transactionProfit);
      }
    });
    
    return profits;
  }, [historicalSummaries, allTransactions]);

  // ... resto do código ...
  
  const getProfitForDay = (day: number) => {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    const dateStr = format(date, 'yyyy-MM-dd');
    const profit = dailyProfits.get(dateStr);
    return profit;
  };

  // ... renderização do calendário ...
};
```

## 4. Relatorios.tsx - Como Calcula (CORRETO - para referência)

```typescript
// Arquivo: src/pages/Relatorios.tsx
// Importações
import { calculateProfit, isSameDate } from '@/utils/financial-calculations';
import { getCurrentDateStringInSaoPaulo } from '@/utils/timezone';

// Dentro do componente Relatorios:

const monthlyStats = useMemo(() => {
  const today = getCurrentDateStringInSaoPaulo();
  
  // Filtrar fechamentos diários do mês atual (EXCETO o dia atual)
  const monthlySummaries = dailySummaries.filter((summary: any) => {
    const summaryDate = new Date(summary.date);
    const isCurrentMonth = summaryDate.getFullYear() === selectedYear && summaryDate.getMonth() === selectedMonth - 1;
    // Excluir resumos do dia atual usando helper isSameDate
    return isCurrentMonth && !isSameDate(summary.date, today);
  });
  
  // Somar lucros dos fechamentos diários (apenas dias passados, não o dia atual)
  const monthlyRevenueFromSummaries = monthlySummaries.reduce((total: number, summary: any) => {
    return total + (summary.profit || summary.margin || 0);
  }, 0);
  
  // Para o dia atual e outros dias não fechados, calcular diretamente das transações
  const closedDates = new Set(monthlySummaries.map((summary: any) => summary.date));
  const openTransactions = monthlyTransactions.filter((transaction: any) => {
    const transactionDate = transaction.date;

    // Se o dia está fechado E não é hoje, não processar (já está no resumo)
    if (closedDates.has(transactionDate) && !isSameDate(transactionDate, today)) {
      return false;
    }

    // Para o dia atual, sempre incluir todas as transações
    if (isSameDate(transactionDate, today)) {
      return true;
    }

    // Para outros dias não fechados, incluir normalmente
    return true;
  });
  
  // Usar função reutilizável para calcular lucro das transações abertas
  const monthlyRevenueFromTransactions = calculateProfit(openTransactions);
  
  const profit = monthlyRevenueFromSummaries + monthlyRevenueFromTransactions;
  
  // ... resto do código ...
}, [monthlyTransactions, dailySummaries, selectedYear, selectedMonth]);
```

## 5. Estrutura de Dados

### Interface Transaction:
```typescript
export interface Transaction {
  id?: string;
  type: 'deposit' | 'withdraw';
  amount: number;
  description?: string; // Pode conter "FreeBet: ..." ou "Surebet: ..."
  date: string; // Formato: 'YYYY-MM-DD'
  employeeId?: string;
  platformId?: string;
  createdAt?: Date;
  updatedAt?: Date;
}
```

### Interface DailySummary:
```typescript
export interface UserDailySummary {
  id: string;
  date: string; // Formato: 'YYYY-MM-DD'
  totalDeposits: number;
  totalWithdraws: number;
  profit: number;
  margin?: number;
  transactionCount: number;
  transactionsSnapshot: any[]; // Array de transações do dia
  byEmployee: any[];
  createdAt: Date;
  updatedAt: Date;
}
```

## Resumo do Problema

**O que está acontecendo:**
1. Usuário exclui operações antigas
2. Resumo diário antigo ainda existe no Firebase com profit = -110
3. Usuário adiciona novo saque de R$ 300
4. Dashboard calcula corretamente: R$ 300 (usa apenas transações)
5. Calendário calcula incorretamente: R$ -110 (usa resumo antigo)

**Por que acontece:**
- Calendário adiciona resumos do dia atual ao Map
- Quando processa transações, retorna cedo se a data está em `closedDates`
- Não substitui o valor do resumo pelo cálculo das transações atuais

**Solução necessária:**
- Excluir resumos do dia atual do processamento
- Sempre calcular o dia atual das transações atuais
- Usar `calculateProfit()` para garantir tratamento correto de FreeBet
- Usar `isSameDate()` para comparação segura de datas

Por favor, corrija o `MonthlyCalendar.tsx` seguindo o mesmo padrão do Dashboard e Relatórios.

