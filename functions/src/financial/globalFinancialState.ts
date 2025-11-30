import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions';
import * as admin from 'firebase-admin';
import { db } from '../config/firebase';

/**
 * Interfaces para o estado financeiro global
 */
interface DailyFinancialState {
  profit: number;
  deposits: number;
  withdraws: number;
}

interface MonthlyFinancialState {
  profit: number;
  deposits: number;
  withdraws: number;
}

interface EmployeePlatformBalance {
  [platformId: string]: number;
}

interface EmployeeFinancialState {
  name: string;
  profit: number;
  deposits: number;
  withdraws: number;
  platforms: EmployeePlatformBalance;
}

interface PlatformFinancialState {
  name: string;
  profit: number;
  deposits: number;
  withdraws: number;
}

interface GlobalFinancialState {
  updatedAt: admin.firestore.Timestamp;
  totals: {
    deposits: number;
    withdraws: number;
    profit: number;
    profitToday: number;
    profitThisWeek: number;
    profitThisMonth: number;
    profitThisYear: number;
  };
  daily: {
    [date: string]: DailyFinancialState;
  };
  monthly: {
    [month: string]: MonthlyFinancialState;
  };
  employees: {
    [employeeId: string]: EmployeeFinancialState;
  };
  platforms: {
    [platformId: string]: PlatformFinancialState;
  };
}

/**
 * Identifica se uma transação é Surebet
 */
function isSurebetTransaction(transaction: any): boolean {
  return transaction.description && transaction.description.startsWith('Surebet');
}

/**
 * Identifica se uma transação é FreeBet
 */
function isFreeBetTransaction(transaction: any): boolean {
  return transaction.description && transaction.description.startsWith('FreeBet');
}

/**
 * Calcula o lucro de uma transação individual
 * REGRAS OFICIAIS:
 * - DEPÓSITO: NEGATIVO (exceto Surebet/FreeBet)
 * - SAQUE: POSITIVO
 * - SUREBET: SEMPRE POSITIVO (mesmo sendo deposit)
 * - FREEBET: SEMPRE POSITIVO quando há lucro
 */
function calculateTransactionProfit(transaction: any): number {
  const isSurebet = isSurebetTransaction(transaction);
  const isFreeBet = isFreeBetTransaction(transaction);
  
  if (isSurebet) {
    // Surebet sempre positivo
    return transaction.amount || 0;
  }
  
  if (isFreeBet) {
    // FreeBet sempre positivo quando há lucro (já está calculado no amount)
    return transaction.amount || 0;
  }
  
  // Transações normais
  if (transaction.type === 'withdraw') {
    return transaction.amount || 0; // Saque = positivo
  } else {
    return -(transaction.amount || 0); // Depósito = negativo
  }
}

/**
 * Formata data para YYYY-MM-DD
 */
function formatDate(date: Date | admin.firestore.Timestamp | string): string {
  if (date instanceof admin.firestore.Timestamp) {
    return date.toDate().toISOString().split('T')[0];
  }
  if (typeof date === 'string') {
    return date;
  }
  return date.toISOString().split('T')[0];
}

/**
 * Formata mês para YYYY-MM
 */
function formatMonth(date: Date | admin.firestore.Timestamp | string): string {
  const dateStr = formatDate(date);
  return dateStr.substring(0, 7);
}

/**
 * Obtém data de hoje em YYYY-MM-DD (horário de São Paulo)
 */
function getTodayString(): string {
  const now = new Date();
  const saoPauloDate = new Date(now.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
  return saoPauloDate.toISOString().split('T')[0];
}

/**
 * Obtém início da semana em YYYY-MM-DD
 */
function getWeekStartString(): string {
  const today = new Date();
  const saoPauloDate = new Date(today.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
  const dayOfWeek = saoPauloDate.getDay();
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Segunda-feira
  saoPauloDate.setDate(saoPauloDate.getDate() + diff);
  return saoPauloDate.toISOString().split('T')[0];
}

/**
 * Obtém início do mês em YYYY-MM-DD
 */
function getMonthStartString(): string {
  const today = new Date();
  const saoPauloDate = new Date(today.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
  saoPauloDate.setDate(1);
  return saoPauloDate.toISOString().split('T')[0];
}

/**
 * Obtém início do ano em YYYY-MM-DD
 */
function getYearStartString(): string {
  const today = new Date();
  const saoPauloDate = new Date(today.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
  saoPauloDate.setMonth(0, 1);
  return saoPauloDate.toISOString().split('T')[0];
}


/**
 * Obtém o saldo manual mais recente para uma combinação funcionário+plataforma
 */
function getManualBalance(transactions: any[], employeeId: string, platformId: string): number | null {
  const manualAdjustments = transactions
    .filter((t: any) => 
      t.employeeId === employeeId && 
      t.platformId === platformId &&
      t.description && 
      t.description.includes('Ajuste manual de saldo')
    )
    .sort((a: any, b: any) => {
      const dateA = a.createdAt?.toDate?.()?.getTime() || 
                    (a.createdAt?.seconds ? a.createdAt.seconds * 1000 : 0) ||
                    (a.updatedAt?.toDate?.()?.getTime() || new Date(a.date || 0).getTime());
      const dateB = b.createdAt?.toDate?.()?.getTime() || 
                    (b.createdAt?.seconds ? b.createdAt.seconds * 1000 : 0) ||
                    (b.updatedAt?.toDate?.()?.getTime() || new Date(b.date || 0).getTime());
      return dateB - dateA;
    });
  
  if (manualAdjustments.length > 0) {
    return Number(manualAdjustments[0].amount || 0);
  }
  
  return null;
}

/**
 * Calcula o saldo de uma combinação funcionário+plataforma
 */
function calculateEmployeePlatformBalance(
  transactions: any[],
  employeeId: string,
  platformId: string
): number {
  // Verificar se existe ajuste manual
  const manualBalance = getManualBalance(transactions, employeeId, platformId);
  if (manualBalance !== null) {
    return manualBalance;
  }
  
  // Calcular saldo baseado em transações
  let balance = 0;
  const empPlatformTransactions = transactions.filter(
    (t: any) => t.employeeId === employeeId && t.platformId === platformId
  );
  
  for (const transaction of empPlatformTransactions) {
    const isSurebet = isSurebetTransaction(transaction);
    
    if (isSurebet) {
      // Surebet sempre adiciona ao saldo (positivo)
      balance += transaction.amount || 0;
    } else if (transaction.type === 'withdraw') {
      // Saque adiciona ao saldo
      balance += transaction.amount || 0;
    } else {
      // Depósito reduz o saldo
      balance -= transaction.amount || 0;
    }
  }
  
  return balance;
}

/**
 * Função principal: Calcula o estado financeiro global do usuário
 */
export async function calculateGlobalFinancialState(userId: string): Promise<GlobalFinancialState> {
  logger.info(`Calculando estado financeiro global para usuário: ${userId}`);
  
  try {
    // 1. Buscar todos os dados necessários
    const [employeesSnap, platformsSnap, transactionsSnap, dailySummariesSnap] = await Promise.all([
      db.collection('users').doc(userId).collection('employees').get(),
      db.collection('users').doc(userId).collection('platforms').get(),
      db.collection('users').doc(userId).collection('transactions').get(),
      db.collection('users').doc(userId).collection('dailySummaries').get(),
    ]);
    
    // Buscar operações Surebet (não usado atualmente, mas mantido para possível uso futuro)
    try {
      await db.collection('users').doc(userId).collection('surebetRecords').get();
    } catch (error) {
      logger.warn('Erro ao buscar registros Surebet:', error);
    }
    
    // Buscar histórico FreeBet (não usado atualmente, mas mantido para possível uso futuro)
    try {
      await db.collection('users').doc(userId).collection('freebetHistory').get();
    } catch (error) {
      logger.warn('Erro ao buscar histórico FreeBet:', error);
    }
    
    // Converter para arrays com tipos adequados
    const employees = employeesSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as any[];
    
    const platforms = platformsSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as any[];
    
    const transactions = transactionsSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as any[];
    
    const dailySummaries = dailySummariesSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as any[];
    
    // 2. Criar mapa de datas fechadas (com resumo diário)
    const closedDates = new Set<string>();
    const dailySummariesByDate = new Map<string, any>();
    
    for (const summary of dailySummaries) {
      const dateKey = formatDate(summary.date);
      closedDates.add(dateKey);
      dailySummariesByDate.set(dateKey, summary);
    }
    
    // 3. Processar transações por dia (ignorando dias fechados)
    const dailyState: { [date: string]: DailyFinancialState } = {};
    const monthlyState: { [month: string]: MonthlyFinancialState } = {};
    
    // Primeiro, processar resumos diários
    for (const summary of dailySummaries) {
      const dateKey = formatDate(summary.date);
      const monthKey = formatMonth(summary.date);
      
      const profit = summary.profit || summary.margin || 0;
      const deposits = summary.totalDeposits || 0;
      const withdraws = summary.totalWithdraws || 0;
      
      // Adicionar ao estado diário
      dailyState[dateKey] = {
        profit,
        deposits,
        withdraws,
      };
      
      // Adicionar ao estado mensal
      if (!monthlyState[monthKey]) {
        monthlyState[monthKey] = {
          profit: 0,
          deposits: 0,
          withdraws: 0,
        };
      }
      monthlyState[monthKey].profit += profit;
      monthlyState[monthKey].deposits += deposits;
      monthlyState[monthKey].withdraws += withdraws;
    }
    
    // Depois, processar transações de dias não fechados
    for (const transaction of transactions) {
      const transactionDate = formatDate(transaction.date);
      
      // Se o dia está fechado, pular (já foi processado no resumo)
      if (closedDates.has(transactionDate)) {
        continue;
      }
      
      // Verificar se é FreeBet ou Surebet já incluído no resumo
      const isFreeBet = isFreeBetTransaction(transaction);
      const isSurebet = isSurebetTransaction(transaction);
      
      if ((isFreeBet || isSurebet) && dailySummariesByDate.has(transactionDate)) {
        // FreeBet/Surebet já está no resumo diário, pular
        continue;
      }
      
      const transactionProfit = calculateTransactionProfit(transaction);
      const monthKey = formatMonth(transaction.date);
      
      // Adicionar ao estado diário
      if (!dailyState[transactionDate]) {
        dailyState[transactionDate] = {
          profit: 0,
          deposits: 0,
          withdraws: 0,
        };
      }
      
      // Calcular depósitos e saques separando Surebet/FreeBet
      if (isSurebet || isFreeBet) {
        // Surebet/FreeBet não conta como depósito normal
        dailyState[transactionDate].profit += transactionProfit;
      } else if (transaction.type === 'deposit') {
        dailyState[transactionDate].deposits += transaction.amount || 0;
        dailyState[transactionDate].profit += transactionProfit;
      } else {
        dailyState[transactionDate].withdraws += transaction.amount || 0;
        dailyState[transactionDate].profit += transactionProfit;
      }
      
      // Adicionar ao estado mensal
      if (!monthlyState[monthKey]) {
        monthlyState[monthKey] = {
          profit: 0,
          deposits: 0,
          withdraws: 0,
        };
      }
      
      if (isSurebet || isFreeBet) {
        monthlyState[monthKey].profit += transactionProfit;
      } else if (transaction.type === 'deposit') {
        monthlyState[monthKey].deposits += transaction.amount || 0;
        monthlyState[monthKey].profit += transactionProfit;
      } else {
        monthlyState[monthKey].withdraws += transaction.amount || 0;
        monthlyState[monthKey].profit += transactionProfit;
      }
    }
    
    // 4. Calcular totais gerais
    let totalDeposits = 0;
    let totalWithdraws = 0;
    let totalProfit = 0;
    
    for (const daily of Object.values(dailyState)) {
      totalDeposits += daily.deposits;
      totalWithdraws += daily.withdraws;
      totalProfit += daily.profit;
    }
    
    // 5. Calcular lucros por período
    const today = getTodayString();
    const weekStart = getWeekStartString();
    const monthStart = getMonthStartString();
    const yearStart = getYearStartString();
    
    let profitToday = 0;
    let profitThisWeek = 0;
    let profitThisMonth = 0;
    let profitThisYear = 0;
    
    for (const [date, daily] of Object.entries(dailyState)) {
      if (date >= yearStart) {
        profitThisYear += daily.profit;
      }
      if (date >= monthStart) {
        profitThisMonth += daily.profit;
      }
      if (date >= weekStart) {
        profitThisWeek += daily.profit;
      }
      if (date === today) {
        profitToday = daily.profit;
      }
    }
    
    // 6. Calcular por funcionário
    const employeesState: { [employeeId: string]: EmployeeFinancialState } = {};
    
    for (const employee of employees) {
      const employeeTransactions = transactions.filter((t: any) => 
        !closedDates.has(formatDate(t.date)) || // Incluir transações de dias não fechados
        (closedDates.has(formatDate(t.date)) && 
         !isFreeBetTransaction(t) && 
         !isSurebetTransaction(t)) // Ou transações normais de dias fechados (já no resumo)
      );
      
      let employeeProfit = 0;
      let employeeDeposits = 0;
      let employeeWithdraws = 0;
      const employeePlatforms: EmployeePlatformBalance = {};
      
      // Processar resumos diários que incluem este funcionário
      for (const summary of dailySummaries) {
        const byEmployee = summary.byEmployee || [];
        const empSummary = byEmployee.find((emp: any) => emp.employeeId === employee.id);
        if (empSummary) {
          employeeProfit += empSummary.profit || 0;
          employeeDeposits += empSummary.deposits || 0;
          employeeWithdraws += empSummary.withdraws || 0;
        }
      }
      
      // Processar transações do funcionário em dias não fechados
      const empTransactions = employeeTransactions.filter((t: any) => 
        t.employeeId === employee.id && !closedDates.has(formatDate(t.date))
      );
      
      for (const transaction of empTransactions) {
        const isFreeBet = isFreeBetTransaction(transaction);
        const isSurebet = isSurebetTransaction(transaction);
        const transactionProfit = calculateTransactionProfit(transaction);
        
        if (isSurebet || isFreeBet) {
          employeeProfit += transactionProfit;
        } else if (transaction.type === 'deposit') {
          employeeDeposits += transaction.amount || 0;
          employeeProfit += transactionProfit;
        } else {
          employeeWithdraws += transaction.amount || 0;
          employeeProfit += transactionProfit;
        }
        
        // Calcular saldo por plataforma
        if (transaction.platformId) {
          if (!employeePlatforms[transaction.platformId]) {
            employeePlatforms[transaction.platformId] = 0;
          }
          const balance = calculateEmployeePlatformBalance(
            transactions,
            employee.id,
            transaction.platformId
          );
          employeePlatforms[transaction.platformId] = balance;
        }
      }
      
      // Calcular saldos de plataformas que não tiveram transações recentes
      for (const platform of platforms) {
        if (!employeePlatforms[platform.id]) {
          const balance = calculateEmployeePlatformBalance(
            transactions,
            employee.id,
            platform.id
          );
          if (balance !== 0) {
            employeePlatforms[platform.id] = balance;
          }
        }
      }
      
      employeesState[employee.id] = {
        name: employee.name || 'Funcionário sem nome',
        profit: employeeProfit,
        deposits: employeeDeposits,
        withdraws: employeeWithdraws,
        platforms: employeePlatforms,
      };
    }
    
    // 7. Calcular por plataforma
    const platformsState: { [platformId: string]: PlatformFinancialState } = {};
    
    for (const platform of platforms) {
      const platformTransactions = transactions.filter((t: any) => 
        t.platformId === platform.id && !closedDates.has(formatDate(t.date))
      );
      
      let platformProfit = 0;
      let platformDeposits = 0;
      let platformWithdraws = 0;
      
      for (const transaction of platformTransactions) {
        const isFreeBet = isFreeBetTransaction(transaction);
        const isSurebet = isSurebetTransaction(transaction);
        const transactionProfit = calculateTransactionProfit(transaction);
        
        if (isSurebet || isFreeBet) {
          platformProfit += transactionProfit;
        } else if (transaction.type === 'deposit') {
          platformDeposits += transaction.amount || 0;
          platformProfit += transactionProfit;
        } else {
          platformWithdraws += transaction.amount || 0;
          platformProfit += transactionProfit;
        }
      }
      
      // Os resumos diários não têm breakdown por plataforma, então não adicionamos aqui
      // Se necessário, podemos adicionar lógica para extrair isso dos byEmployee
      
      platformsState[platform.id] = {
        name: platform.name || 'Plataforma sem nome',
        profit: platformProfit,
        deposits: platformDeposits,
        withdraws: platformWithdraws,
      };
    }
    
    // 8. Criar objeto final
    const globalState: GlobalFinancialState = {
      updatedAt: admin.firestore.Timestamp.now(),
      totals: {
        deposits: totalDeposits,
        withdraws: totalWithdraws,
        profit: totalProfit,
        profitToday,
        profitThisWeek,
        profitThisMonth,
        profitThisYear,
      },
      daily: dailyState,
      monthly: monthlyState,
      employees: employeesState,
      platforms: platformsState,
    };
    
    // 9. Salvar no Firestore
    await db
      .collection('users')
      .doc(userId)
      .collection('globalFinancialState')
      .doc('main')
      .set(globalState);
    
    logger.info(`Estado financeiro global calculado e salvo para usuário: ${userId}`);
    
    return globalState;
  } catch (error) {
    logger.error(`Erro ao calcular estado financeiro global para ${userId}:`, error);
    throw error;
  }
}

/**
 * Trigger: Atualiza estado quando transação é criada/atualizada/deletada
 */
export const onTransactionWrite = onDocumentWritten(
  {
    document: 'users/{userId}/transactions/{transactionId}',
    memory: '512MiB',
    timeoutSeconds: 540,
  },
  async (event) => {
    try {
      const userId = event.params.userId;
      if (!userId) {
        logger.warn('UserId não encontrado no evento de transação');
        return;
      }
      
      logger.info(`Atualizando estado financeiro após mudança em transação para usuário: ${userId}`);
      await calculateGlobalFinancialState(userId);
    } catch (error) {
      logger.error('Erro ao atualizar estado financeiro após mudança em transação:', error);
      // Não lançar erro para evitar retry infinito
    }
  }
);

/**
 * Trigger: Atualiza estado quando resumo diário é criado/atualizado/deletado
 */
export const onDailySummaryWrite = onDocumentWritten(
  {
    document: 'users/{userId}/dailySummaries/{summaryId}',
    memory: '512MiB',
    timeoutSeconds: 540,
  },
  async (event) => {
    try {
      const userId = event.params.userId;
      if (!userId) {
        logger.warn('UserId não encontrado no evento de resumo diário');
        return;
      }
      
      logger.info(`Atualizando estado financeiro após mudança em resumo diário para usuário: ${userId}`);
      await calculateGlobalFinancialState(userId);
    } catch (error) {
      logger.error('Erro ao atualizar estado financeiro após mudança em resumo diário:', error);
    }
  }
);

/**
 * Trigger: Atualiza estado quando registro Surebet é criado/atualizado/deletado
 */
export const onSurebetWrite = onDocumentWritten(
  {
    document: 'users/{userId}/surebetRecords/{recordId}',
    memory: '512MiB',
    timeoutSeconds: 540,
  },
  async (event) => {
    try {
      const userId = event.params.userId;
      if (!userId) {
        logger.warn('UserId não encontrado no evento de registro Surebet');
        return;
      }
      
      logger.info(`Atualizando estado financeiro após mudança em registro Surebet para usuário: ${userId}`);
      await calculateGlobalFinancialState(userId);
    } catch (error) {
      logger.error('Erro ao atualizar estado financeiro após mudança em registro Surebet:', error);
    }
  }
);

/**
 * Trigger: Atualiza estado quando registro FreeBet é criado/atualizado/deletado
 */
export const onFreeBetWrite = onDocumentWritten(
  {
    document: 'users/{userId}/freebetHistory/{entryId}',
    memory: '512MiB',
    timeoutSeconds: 540,
  },
  async (event) => {
    try {
      const userId = event.params.userId;
      if (!userId) {
        logger.warn('UserId não encontrado no evento de histórico FreeBet');
        return;
      }
      
      logger.info(`Atualizando estado financeiro após mudança em histórico FreeBet para usuário: ${userId}`);
      await calculateGlobalFinancialState(userId);
    } catch (error) {
      logger.error('Erro ao atualizar estado financeiro após mudança em histórico FreeBet:', error);
    }
  }
);

/**
 * Endpoint HTTPS: Obter estado financeiro
 */
export const getFinancialState = onCall(
  {
    enforceAppCheck: false,
    memory: '256MiB',
    timeoutSeconds: 60,
  },
  async (request) => {
    const userId = request.auth?.uid;
    if (!userId) {
      throw new HttpsError('unauthenticated', 'Usuário não autenticado');
    }
    
    try {
      const stateDoc = await db
        .collection('users')
        .doc(userId)
        .collection('globalFinancialState')
        .doc('main')
        .get();
      
      if (!stateDoc.exists) {
        // Se não existe, calcular agora
        logger.info(`Estado financeiro não encontrado, calculando para usuário: ${userId}`);
        return await calculateGlobalFinancialState(userId);
      }
      
      return stateDoc.data() as GlobalFinancialState;
    } catch (error) {
      logger.error(`Erro ao obter estado financeiro para ${userId}:`, error);
      throw new HttpsError('internal', 'Erro ao obter estado financeiro');
    }
  }
);

/**
 * Endpoint HTTPS: Recalcular estado financeiro
 */
export const recalculateFinancialState = onCall(
  {
    enforceAppCheck: false,
    memory: '512MiB',
    timeoutSeconds: 540,
  },
  async (request) => {
    const userId = request.auth?.uid;
    if (!userId) {
      throw new HttpsError('unauthenticated', 'Usuário não autenticado');
    }
    
    try {
      logger.info(`Recalculando estado financeiro para usuário: ${userId}`);
      return await calculateGlobalFinancialState(userId);
    } catch (error) {
      logger.error(`Erro ao recalcular estado financeiro para ${userId}:`, error);
      throw new HttpsError('internal', 'Erro ao recalcular estado financeiro');
    }
  }
);






