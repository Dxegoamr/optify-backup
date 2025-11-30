export interface GestorCategoria {
  id: string;
  usuarioId: string;
  nome: string;
  tipo: 'gasto' | 'investimento' | 'aporte' | 'reserva' | 'personalizado';
  percentual: number;
  criadoEm: string;
}

export interface GestorTransacaoPessoal {
  id: string;
  usuarioId: string;
  categoriaId: string | null;
  descricao: string;
  tipo: 'despesa' | 'receita';
  valor: number;
  data: string;
}

export interface GestorDistribuicaoItem {
  categoria: string;
  valor: number;
  percentual?: number;
}

export interface GestorMeta {
  id: string;
  titulo: string;
  descricao?: string;
  progresso: number;
  objetivo: number;
  prazo?: string;
  status: 'em_andamento' | 'atingida' | 'atrasada';
}

export interface GestorAlerta {
  id: string;
  mensagem: string;
  tipo: 'info' | 'warning' | 'danger' | 'success';
  criadoEm: string;
}

export interface GestorConfiguracoes {
  id: string;
  usuarioId: string;
  layout: Record<string, unknown>;
  metas: Record<string, unknown>;
  alertas: Record<string, unknown>;
}

export interface GestorResumoFinanceiro {
  caixaAtual: number;
  lucroDiario: number;
  lucroMensal: number;
  totalGastosPessoais: number;
  saldoPessoal: number;
  distribuicao: GestorDistribuicaoItem[];
  metas: GestorMeta[];
  alertas: GestorAlerta[];
}












