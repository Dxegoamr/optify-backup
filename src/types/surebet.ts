export interface SurebetCalculator {
  house1: {
    name: string;
    color: string;
    odd: number;
    stake: number;
    profit: number;
  };
  house2: {
    name: string;
    color: string;
    odd: number;
    stake: number;
    profit: number;
  };
  total: number;
  margin: number; // Em porcentagem
  isSurebet: boolean;
}

export interface SurebetRecord {
  id?: string;
  userId: string;
  operationId: string; // ID único para agrupar as duas linhas da mesma operação
  transactionId?: string; // ID da transação associada (apenas no primeiro registro da operação)
  createdAt: Date;
  updatedAt?: Date;
  
  // Dados automáticos da calculadora
  registrationDate: Date; // Data/Hora da Entrada
  house: string; // Casa de Aposta
  odd: number;
  stake: number;
  profit: number;
  evPercent: number; // Porcentagem (EV%)
  total: number;
  
  // Dados preenchidos pelo usuário
  sport?: string; // Esporte
  market?: string; // Mercado (AH, ML, etc.)
  event?: string; // Nome do Evento
  gameDate?: Date; // Data/Hora da Partida
  status?: 'green' | 'red'; // Status (Green/Red)
}


