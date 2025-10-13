/**
 * Definição de tools/functions que o GPT pode chamar
 */

export const AI_TOOLS = [
  {
    type: 'function' as const,
    function: {
      name: 'registrar_deposito',
      description: 'Registra um depósito/transação de receita no sistema. Use quando o usuário mencionar depósito, transferência, recebimento, pagamento recebido, entrada de dinheiro, etc.',
      parameters: {
        type: 'object',
        properties: {
          valor: {
            type: 'number',
            description: 'Valor do depósito em reais (apenas números, sem R$)'
          },
          funcionario_nome: {
            type: 'string',
            description: 'Nome do funcionário/colaborador que receberá o depósito (ex: diego, joão, maria)'
          },
          plataforma: {
            type: 'string',
            description: 'Plataforma onde foi feito o depósito (ex: betano, bet365, pixbet, nubank, itau, etc). Opcional.',
            enum: ['betano', 'bet365', 'pixbet', 'sportingbet', 'blaze', 'nubank', 'itau', 'bradesco', 'caixa', 'outro']
          },
          descricao: {
            type: 'string',
            description: 'Descrição adicional do depósito. Opcional.'
          }
        },
        required: ['valor', 'funcionario_nome']
      }
    }
  },
  {
    type: 'function' as const,
    function: {
      name: 'fechar_dia',
      description: 'Fecha o dia/período no sistema, calculando totais e gerando resumo. Use quando o usuário pedir para fechar o dia, encerrar o dia, finalizar o dia, fazer fechamento, etc.',
      parameters: {
        type: 'object',
        properties: {
          data: {
            type: 'string',
            description: 'Data para fechar no formato YYYY-MM-DD. Se não especificado, usa data atual.',
          },
          observacao: {
            type: 'string',
            description: 'Observação ou nota sobre o fechamento. Opcional.'
          }
        },
        required: []
      }
    }
  },
  {
    type: 'function' as const,
    function: {
      name: 'registrar_saque',
      description: 'Registra um saque/retirada da conta de um funcionário. Use quando o usuário mencionar saque, retirada, sacar dinheiro, tirei dinheiro, etc.',
      parameters: {
        type: 'object',
        properties: {
          valor: {
            type: 'number',
            description: 'Valor do saque em reais (apenas números, sem R$)'
          },
          funcionario_nome: {
            type: 'string',
            description: 'Nome do funcionário que está sacando'
          },
          descricao: {
            type: 'string',
            description: 'Descrição ou motivo do saque. Opcional.'
          }
        },
        required: ['valor', 'funcionario_nome']
      }
    }
  },
  {
    type: 'function' as const,
    function: {
      name: 'registrar_despesa',
      description: 'Registra uma despesa/gasto geral da empresa (não de funcionário específico). Use quando o usuário mencionar despesa da empresa, pagamento de conta, gasto operacional, etc.',
      parameters: {
        type: 'object',
        properties: {
          valor: {
            type: 'number',
            description: 'Valor da despesa em reais (apenas números, sem R$)'
          },
          descricao: {
            type: 'string',
            description: 'Descrição da despesa (ex: conta de luz, aluguel, material de escritório)'
          },
          categoria: {
            type: 'string',
            description: 'Categoria da despesa',
            enum: ['operacional', 'marketing', 'salario', 'impostos', 'aluguel', 'utilities', 'outro']
          }
        },
        required: ['valor', 'descricao']
      }
    }
  },
  {
    type: 'function' as const,
    function: {
      name: 'consultar_saldo',
      description: 'Consulta o saldo atual de um funcionário ou total. Use quando o usuário perguntar sobre saldo, quanto tem, valor disponível, etc.',
      parameters: {
        type: 'object',
        properties: {
          funcionario_nome: {
            type: 'string',
            description: 'Nome do funcionário para consultar saldo. Se não especificado, retorna saldo total.'
          },
          periodo: {
            type: 'string',
            description: 'Período para consulta (hoje, semana, mes, ano)',
            enum: ['hoje', 'semana', 'mes', 'ano']
          }
        },
        required: []
      }
    }
  },
  {
    type: 'function' as const,
    function: {
      name: 'listar_funcionarios',
      description: 'Lista todos os funcionários cadastrados no sistema. Use quando o usuário perguntar quais funcionários existem, quem são os colaboradores, etc.',
      parameters: {
        type: 'object',
        properties: {
          ativo: {
            type: 'boolean',
            description: 'Se true, lista apenas funcionários ativos. Se false, lista todos.'
          }
        },
        required: []
      }
    }
  }
];

/**
 * Tipos para as respostas das functions
 */
export interface DepositoResult {
  success: boolean;
  message: string;
  transacaoId?: string;
  valor?: number;
  funcionario?: string;
}

export interface FechamentoDiaResult {
  success: boolean;
  message: string;
  data?: string;
  totalReceitas?: number;
  totalDespesas?: number;
  saldo?: number;
  transacoes?: number;
}

export interface SaqueResult {
  success: boolean;
  message: string;
  transacaoId?: string;
  valor?: number;
  funcionario?: string;
  saldoRestante?: number;
}

export interface DespesaResult {
  success: boolean;
  message: string;
  transacaoId?: string;
  valor?: number;
}

export interface SaldoResult {
  success: boolean;
  message: string;
  saldo?: number;
  funcionario?: string;
  periodo?: string;
}

export interface FuncionariosResult {
  success: boolean;
  message: string;
  funcionarios?: Array<{
    id: string;
    nome: string;
    cargo: string;
    ativo: boolean;
  }>;
}

