export interface FreeBetEmployee {
  id: string;
  nome: string;
  valorApostado: number;
  vencedor: boolean;
  retorno?: number;
  vencedorRecebeFreebet?: boolean; // Se a conta vencedora também recebe freebet
  freebetUsada?: boolean;
  conversaoSaldo?: number; // Valor que retornou de saldo da conversão da freebet
}

export interface FreeBetOperation {
  id: string;
  platformName: string;
  platformColor: string;
  funcionarios: FreeBetEmployee[];
  valorFreeBet: number;
  createdAt: Date | string | { toDate: () => Date };
  updatedAt: Date | string | { toDate: () => Date };
}

export interface FreeBetPlatform {
  id: string;
  name: string;
  color: string;
  employeeCount: number;
  totalApostado: number;
  lucroPrejuizo: number;
  operationId?: string;
}

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

