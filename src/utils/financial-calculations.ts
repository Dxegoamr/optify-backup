/**
 * Utilitários para cálculos financeiros consistentes em todo o sistema
 */

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
 * Calcula depósitos totais (excluindo FreeBet e Surebet)
 */
export function calculateTotalDeposits(transactions: Transaction[]): number {
  const otherDeposits = transactions.filter((t) =>
    t.type === 'deposit' &&
    (!t.description || (!t.description.startsWith('Surebet') && !t.description.startsWith('FreeBet')))
  );
  
  return otherDeposits.reduce((sum, t) => sum + Number(t.amount || 0), 0);
}

/**
 * Calcula saques totais
 */
export function calculateTotalWithdraws(transactions: Transaction[]): number {
  const withdraws = transactions.filter((t) => t.type === 'withdraw');
  return withdraws.reduce((sum, t) => sum + Number(t.amount || 0), 0);
}

/**
 * Verifica se duas datas são iguais (formato YYYY-MM-DD)
 * Usa comparação de strings normalizada para evitar problemas de timezone
 */
export function isSameDate(date1: string, date2: string): boolean {
  if (!date1 || !date2) return false;
  
  // Normalizar strings removendo espaços e convertendo para formato esperado
  const normalized1 = date1.trim();
  const normalized2 = date2.trim();
  
  return normalized1 === normalized2;
}

/**
 * Verifica se uma transação é FreeBet
 */
export function isFreeBet(transaction: Transaction): boolean {
  return !!(transaction.description && transaction.description.startsWith('FreeBet'));
}

/**
 * Verifica se uma transação é Surebet
 */
export function isSurebet(transaction: Transaction): boolean {
  return !!(transaction.description && transaction.description.startsWith('Surebet'));
}

/**
 * Verifica se uma transação é depósito normal (não FreeBet nem Surebet)
 */
export function isNormalDeposit(transaction: Transaction): boolean {
  return transaction.type === 'deposit' && !isFreeBet(transaction) && !isSurebet(transaction);
}

/**
 * Determina se uma transação deve ser exibida como POSITIVA visualmente
 * FreeBet e Surebet sempre positivos, mesmo sendo tipo 'deposit'
 * Withdraw sempre positivo
 * Deposit normal sempre negativo
 */
export function shouldDisplayAsPositive(transaction: Transaction): boolean {
  // FreeBet sempre positivo
  if (isFreeBet(transaction)) {
    return true;
  }
  
  // Surebet sempre positivo
  if (isSurebet(transaction)) {
    return true;
  }
  
  // Withdraw sempre positivo
  if (transaction.type === 'withdraw') {
    return true;
  }
  
  // Deposit normal sempre negativo
  return false;
}

