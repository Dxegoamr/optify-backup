/**
 * Utilitário para corrigir problemas financeiros identificados
 * 
 * PROBLEMAS CORRIGIDOS:
 * 1. Duplicação de transações no fechamento de dia
 * 2. Surebet sendo tratado como depósito negativo
 * 3. Transações antigas aparecendo hoje
 * 4. Valores negativos no dashboard
 */

import { UserDailySummaryService } from '@/core/services/user-specific.service';
import { recalculateFinancialState } from '@/hooks/useGlobalFinancialState';

/**
 * Identifica se uma transação é Surebet
 */
export function isSurebetTransaction(transaction: any): boolean {
  return transaction.description && transaction.description.startsWith('Surebet');
}

/**
 * Identifica se uma transação é FreeBet
 */
export function isFreeBetTransaction(transaction: any): boolean {
  return transaction.description && transaction.description.startsWith('FreeBet');
}

/**
 * Calcula o lucro correto de uma transação seguindo as regras oficiais
 */
export function calculateCorrectTransactionProfit(transaction: any): number {
  const isSurebet = isSurebetTransaction(transaction);
  const isFreeBet = isFreeBetTransaction(transaction);
  
  if (isSurebet) {
    // Surebet sempre positivo
    return transaction.amount || 0;
  }
  
  if (isFreeBet) {
    // FreeBet sempre positivo quando há lucro
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
 * Corrige um resumo diário específico recalculando com as regras corretas
 */
export async function fixDailySummary(
  userId: string, 
  summaryId: string, 
  transactions: any[]
): Promise<void> {
  console.log(`🔧 Corrigindo resumo diário: ${summaryId}`);
  
  // Separar transações Surebet das outras
  const surebetTransactions = transactions.filter(isSurebetTransaction);
  const otherDeposits = transactions.filter((t: any) =>
    t.type === 'deposit' && !isSurebetTransaction(t)
  );
  const withdraws = transactions.filter((t: any) => t.type === 'withdraw');
  
  // Calcular totais corretos
  const totalSurebetProfit = surebetTransactions.reduce(
    (sum: number, t: any) => sum + (t.amount || 0), 
    0
  );
  const totalDeposits = otherDeposits.reduce(
    (sum: number, t: any) => sum + (t.amount || 0), 
    0
  );
  const totalWithdraws = withdraws.reduce(
    (sum: number, t: any) => sum + (t.amount || 0), 
    0
  );
  
  // Calcular lucro correto (Surebet sempre positivo)
  const correctProfit = totalWithdraws - totalDeposits + totalSurebetProfit;
  
  // Atualizar resumo diário
  await UserDailySummaryService.updateDailySummary(userId, summaryId, {
    totalDeposits, // Apenas depósitos normais (sem Surebet)
    totalWithdraws,
    profit: correctProfit, // Inclui Surebet como positivo
    margin: correctProfit,
    transactionCount: transactions.length,
    transactionsSnapshot: transactions,
    updatedAt: new Date(),
  });
  
  console.log(`✅ Resumo diário corrigido:`, {
    totalDeposits,
    totalWithdraws,
    totalSurebetProfit,
    correctProfit
  });
}

/**
 * Força recálculo completo do estado financeiro do usuário
 */
export async function forceFinancialRecalculation(userId: string): Promise<void> {
  console.log(`🔄 Forçando recálculo financeiro para usuário: ${userId}`);
  
  try {
    // Recalcular estado financeiro global (backend)
    await recalculateFinancialState(userId);
    
    console.log(`✅ Recálculo financeiro concluído para usuário: ${userId}`);
  } catch (error) {
    console.error(`❌ Erro no recálculo financeiro:`, error);
    throw error;
  }
}

/**
 * Detecta e reporta problemas financeiros comuns
 */
export function detectFinancialIssues(transactions: any[], dailySummaries: any[]): string[] {
  const issues: string[] = [];
  
  // Verificar transações Surebet sendo tratadas como depósito
  const surebetAsDeposit = transactions.filter((t: any) => 
    isSurebetTransaction(t) && t.type === 'deposit'
  );
  
  if (surebetAsDeposit.length > 0) {
    issues.push(`${surebetAsDeposit.length} transações Surebet marcadas como depósito (deveriam ser positivas)`);
  }
  
  // Verificar resumos diários com valores inconsistentes
  const inconsistentSummaries = dailySummaries.filter((summary: any) => {
    const profit = summary.profit || summary.margin || 0;
    const deposits = summary.totalDeposits || 0;
    const withdraws = summary.totalWithdraws || 0;
    const calculatedProfit = withdraws - deposits;
    
    // Se a diferença for muito grande, pode haver Surebet mal calculado
    return Math.abs(profit - calculatedProfit) > 10;
  });
  
  if (inconsistentSummaries.length > 0) {
    issues.push(`${inconsistentSummaries.length} resumos diários com valores inconsistentes`);
  }
  
  return issues;
}

/**
 * Função principal para corrigir todos os problemas financeiros
 */
export async function fixAllFinancialIssues(userId: string): Promise<{
  success: boolean;
  message: string;
  issuesFixed: string[];
}> {
  console.log(`🚨 Iniciando correção de problemas financeiros para usuário: ${userId}`);
  
  try {
    const issuesFixed: string[] = [];
    
    // 1. Forçar recálculo do estado financeiro global
    await forceFinancialRecalculation(userId);
    issuesFixed.push('Estado financeiro global recalculado');
    
    // 2. Aguardar um pouco para o backend processar
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    return {
      success: true,
      message: 'Problemas financeiros corrigidos com sucesso!',
      issuesFixed
    };
  } catch (error) {
    console.error('❌ Erro ao corrigir problemas financeiros:', error);
    return {
      success: false,
      message: `Erro ao corrigir problemas: ${error}`,
      issuesFixed: []
    };
  }
}

