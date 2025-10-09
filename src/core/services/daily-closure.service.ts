import { UserDailySummaryService, UserTransactionService } from './user-specific.service';
import { toast } from 'sonner';

export interface DailySummary {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD
  totalDeposits: number;
  totalWithdraws: number;
  totalProfit: number;
  transactionCount: number;
  employeeSummaries: EmployeeDailySummary[];
  createdAt: Date;
  updatedAt: Date;
}

export interface EmployeeDailySummary {
  employeeId: string;
  employeeName: string;
  deposits: number;
  withdraws: number;
  profit: number;
  transactionCount: number;
}

export class DailyClosureService {
  private static closureInterval: NodeJS.Timeout | null = null;
  private static isProcessing = false;

  /**
   * Inicia o serviço de fechamento diário automático
   */
  static startDailyClosureService(userId: string): void {
    // Parar serviço anterior se existir
    this.stopDailyClosureService();

    // Calcular próximo 00:00 em São Paulo
    const nextMidnight = this.getNextMidnightInSaoPaulo();
    const timeUntilMidnight = nextMidnight.getTime() - new Date().getTime();

    console.log('🕛 Serviço de fechamento diário iniciado');
    console.log(`📅 Próximo fechamento em: ${nextMidnight.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`);

    // Configurar timeout para próximo 00:00
    this.closureInterval = setTimeout(() => {
      this.processDailyClosure(userId);
      
      // Configurar interval para executar a cada 24 horas
      this.closureInterval = setInterval(() => {
        this.processDailyClosure(userId);
      }, 24 * 60 * 60 * 1000); // 24 horas
    }, timeUntilMidnight);
  }

  /**
   * Para o serviço de fechamento diário
   */
  static stopDailyClosureService(): void {
    if (this.closureInterval) {
      clearTimeout(this.closureInterval);
      clearInterval(this.closureInterval);
      this.closureInterval = null;
      console.log('🛑 Serviço de fechamento diário parado');
    }
  }

  /**
   * Processa o fechamento diário manualmente
   */
  static async processManualClosure(userId: string, date?: string): Promise<void> {
    const targetDate = date || this.getCurrentDateInSaoPaulo();
    await this.processDailyClosure(userId, targetDate);
  }

  /**
   * Processa o fechamento diário
   */
  private static async processDailyClosure(userId: string, date?: string): Promise<void> {
    if (this.isProcessing) {
      console.log('⚠️ Fechamento diário já está sendo processado');
      return;
    }

    this.isProcessing = true;
    const targetDate = date || this.getCurrentDateInSaoPaulo();
    
    try {
      console.log(`🔄 Iniciando fechamento diário para ${targetDate}`);

      // Buscar transações do dia
      const transactions = await UserTransactionService.getTransactionsByDateRange(
        userId, 
        targetDate, 
        targetDate
      );

      if (transactions.length === 0) {
        console.log('📝 Nenhuma transação encontrada para o dia');
        this.isProcessing = false;
        return;
      }

      // Calcular resumo diário
      const dailySummary = await this.calculateDailySummary(userId, targetDate, transactions);

      // Verificar se já existe um resumo para este dia
      const existingSummary = await this.getExistingSummary(userId, targetDate);
      
      if (existingSummary) {
        console.log('📝 Atualizando resumo existente');
        await UserDailySummaryService.updateDailySummary(userId, existingSummary.id, dailySummary);
      } else {
        console.log('📝 Criando novo resumo diário');
        await UserDailySummaryService.createDailySummary(userId, dailySummary);
      }

      console.log(`✅ Fechamento diário concluído para ${targetDate}`);
      console.log(`📊 Resumo: ${dailySummary.totalDeposits} depósitos, ${dailySummary.totalWithdraws} saques, ${dailySummary.totalProfit} lucro`);

    } catch (error) {
      console.error('❌ Erro no fechamento diário:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Calcula o resumo diário
   */
  private static async calculateDailySummary(
    userId: string, 
    date: string, 
    transactions: any[]
  ): Promise<Omit<DailySummary, 'id' | 'userId' | 'createdAt' | 'updatedAt'>> {
    
    // Calcular totais gerais
    const totalDeposits = transactions
      .filter(t => t.type === 'deposit')
      .reduce((sum, t) => sum + (t.amount || 0), 0);

    const totalWithdraws = transactions
      .filter(t => t.type === 'withdraw')
      .reduce((sum, t) => sum + (t.amount || 0), 0);

    const totalProfit = totalWithdraws - totalDeposits;

    // Agrupar por funcionário
    const employeeGroups = transactions.reduce((groups, transaction) => {
      const employeeId = transaction.employeeId;
      if (!groups[employeeId]) {
        groups[employeeId] = {
          employeeId,
          employeeName: 'Funcionário não encontrado', // Será preenchido depois
          deposits: 0,
          withdraws: 0,
          profit: 0,
          transactionCount: 0
        };
      }

      if (transaction.type === 'deposit') {
        groups[employeeId].deposits += transaction.amount || 0;
      } else {
        groups[employeeId].withdraws += transaction.amount || 0;
      }

      groups[employeeId].transactionCount++;
      return groups;
    }, {} as Record<string, EmployeeDailySummary>);

    // Calcular lucro por funcionário
    Object.values(employeeGroups).forEach(emp => {
      emp.profit = emp.withdraws - emp.deposits;
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

  /**
   * Verifica se já existe um resumo para o dia
   */
  private static async getExistingSummary(userId: string, date: string): Promise<any | null> {
    try {
      const summaries = await UserDailySummaryService.getDailySummaries(userId);
      return summaries.find(s => s.date === date) || null;
    } catch (error) {
      console.error('Erro ao buscar resumo existente:', error);
      return null;
    }
  }

  /**
   * Obtém o próximo 00:00 em São Paulo
   */
  private static getNextMidnightInSaoPaulo(): Date {
    const now = new Date();
    const saoPauloNow = new Date(now.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
    
    const tomorrow = new Date(saoPauloNow);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    // Converter de volta para UTC
    const utcTomorrow = new Date(tomorrow.toLocaleString('en-US', { timeZone: 'UTC' }));
    return utcTomorrow;
  }

  /**
   * Obtém a data atual em São Paulo como string YYYY-MM-DD
   */
  private static getCurrentDateInSaoPaulo(): string {
    const now = new Date();
    return now.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
  }

  /**
   * Verifica se o serviço está ativo
   */
  static isServiceActive(): boolean {
    return this.closureInterval !== null;
  }

  /**
   * Obtém informações do próximo fechamento
   */
  static getNextClosureInfo(): { nextClosure: Date; isActive: boolean } {
    return {
      nextClosure: this.getNextMidnightInSaoPaulo(),
      isActive: this.isServiceActive()
    };
  }
}
