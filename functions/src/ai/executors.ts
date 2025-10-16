import { db } from '../config/firebase';
import { 
  DepositoResult, 
  FechamentoDiaResult, 
  SaqueResult,
  DespesaResult, 
  SaldoResult,
  FuncionariosResult 
} from './tools';

/**
 * Registra um depósito/transação de receita
 */
export async function executarRegistroDeposito(
  params: any,
  userId: string
): Promise<DepositoResult> {
  try {
    const { valor, funcionario_nome, plataforma, descricao } = params;

    console.log('🔍 Buscando funcionário:', funcionario_nome);

    // Buscar funcionário pelo nome (busca case-insensitive e parcial)
    const funcionariosRef = db.collection('users').doc(userId).collection('employees');
    const allFuncionariosSnapshot = await funcionariosRef.get();
    
    const nomeBusca = funcionario_nome.toLowerCase().trim();
    let funcionarioDoc = null;
    
    // Buscar por correspondência parcial ou exata
    for (const doc of allFuncionariosSnapshot.docs) {
      const funcionarioNome = (doc.data().nome || '').toLowerCase();
      if (funcionarioNome.includes(nomeBusca) || nomeBusca.includes(funcionarioNome)) {
        funcionarioDoc = doc;
        break;
      }
    }

    if (!funcionarioDoc) {
      // Listar funcionários disponíveis
      const funcionariosDisponiveis = allFuncionariosSnapshot.docs
        .map(d => d.data().nome)
        .join(', ');
      
      return {
        success: false,
        message: `❌ Funcionário "${funcionario_nome}" não encontrado.\n\n📋 Funcionários disponíveis: ${funcionariosDisponiveis || 'Nenhum cadastrado'}\n\n💡 Dica: Cadastre o funcionário primeiro ou use um nome da lista.`
      };
    }

    const funcionarioData = funcionarioDoc.data();
    const funcionarioId = funcionarioDoc.id;
    
    console.log('✅ Funcionário encontrado:', funcionarioData.nome);

    // Criar transação
    const transacaoData = {
      tipo: 'receita',
      valor: Number(valor),
      funcionarioId: funcionarioId,
      funcionarioNome: funcionarioData.nome,
      plataforma: plataforma || 'outro',
      descricao: descricao || `Depósito de R$ ${valor} - ${funcionarioData.nome}`,
      categoria: 'deposito',
      data: new Date(),
      createdAt: new Date(),
      userId: userId,
      status: 'concluida'
    };

    const transacaoRef = await db
      .collection('users')
      .doc(userId)
      .collection('transactions')
      .add(transacaoData);

    // Atualizar saldo do funcionário
    await funcionariosRef.doc(funcionarioId).update({
      saldoAtual: (funcionarioData.saldoAtual || 0) + Number(valor),
      ultimaTransacao: new Date()
    });

    return {
      success: true,
      message: `✅ Depósito registrado com sucesso!\n\n💰 Valor: R$ ${valor.toFixed(2)}\n👤 Funcionário: ${funcionarioData.nome}\n${plataforma ? `🏦 Plataforma: ${plataforma}\n` : ''}📝 ID da transação: ${transacaoRef.id}`,
      transacaoId: transacaoRef.id,
      valor: Number(valor),
      funcionario: funcionarioData.nome
    };

  } catch (error: any) {
    console.error('Erro ao registrar depósito:', error);
    return {
      success: false,
      message: `❌ Erro ao registrar depósito: ${error.message}`
    };
  }
}

/**
 * Registra um saque da conta de um funcionário
 */
export async function executarRegistroSaque(
  params: any,
  userId: string
): Promise<SaqueResult> {
  try {
    const { valor, funcionario_nome, descricao } = params;

    console.log('🔍 Buscando funcionário para saque:', funcionario_nome);

    // Buscar funcionário pelo nome
    const funcionariosRef = db.collection('users').doc(userId).collection('employees');
    const allFuncionariosSnapshot = await funcionariosRef.get();
    
    const nomeBusca = funcionario_nome.toLowerCase().trim();
    let funcionarioDoc = null;
    
    for (const doc of allFuncionariosSnapshot.docs) {
      const funcionarioNome = (doc.data().nome || '').toLowerCase();
      if (funcionarioNome.includes(nomeBusca) || nomeBusca.includes(funcionarioNome)) {
        funcionarioDoc = doc;
        break;
      }
    }

    if (!funcionarioDoc) {
      const funcionariosDisponiveis = allFuncionariosSnapshot.docs
        .map(d => d.data().nome)
        .join(', ');
      
      return {
        success: false,
        message: `❌ Funcionário "${funcionario_nome}" não encontrado.\n\n📋 Funcionários disponíveis: ${funcionariosDisponiveis || 'Nenhum cadastrado'}`
      };
    }

    const funcionarioData = funcionarioDoc.data();
    const funcionarioId = funcionarioDoc.id;
    const saldoAtual = funcionarioData.saldoAtual || 0;

    // Verificar se tem saldo suficiente
    if (saldoAtual < Number(valor)) {
      return {
        success: false,
        message: `❌ Saldo insuficiente!\n\n👤 Funcionário: ${funcionarioData.nome}\n💰 Saldo atual: R$ ${saldoAtual.toFixed(2)}\n💸 Valor do saque: R$ ${Number(valor).toFixed(2)}\n📊 Faltam: R$ ${(Number(valor) - saldoAtual).toFixed(2)}`
      };
    }

    // Criar transação de saque (despesa do funcionário)
    const transacaoData = {
      tipo: 'despesa',
      valor: Number(valor),
      funcionarioId: funcionarioId,
      funcionarioNome: funcionarioData.nome,
      descricao: descricao || `Saque de R$ ${valor} - ${funcionarioData.nome}`,
      categoria: 'saque',
      data: new Date(),
      createdAt: new Date(),
      userId: userId,
      status: 'concluida'
    };

    const transacaoRef = await db
      .collection('users')
      .doc(userId)
      .collection('transactions')
      .add(transacaoData);

    // Atualizar saldo do funcionário (diminuir)
    const novoSaldo = saldoAtual - Number(valor);
    await funcionariosRef.doc(funcionarioId).update({
      saldoAtual: novoSaldo,
      ultimaTransacao: new Date()
    });

    return {
      success: true,
      message: `✅ Saque registrado com sucesso!\n\n💸 Valor: R$ ${Number(valor).toFixed(2)}\n👤 Funcionário: ${funcionarioData.nome}\n💰 Saldo anterior: R$ ${saldoAtual.toFixed(2)}\n📊 Saldo atual: R$ ${novoSaldo.toFixed(2)}\n📝 ID da transação: ${transacaoRef.id}`,
      transacaoId: transacaoRef.id,
      valor: Number(valor),
      funcionario: funcionarioData.nome,
      saldoRestante: novoSaldo
    };

  } catch (error: any) {
    console.error('Erro ao registrar saque:', error);
    return {
      success: false,
      message: `❌ Erro ao registrar saque: ${error.message}`
    };
  }
}

/**
 * Fecha o dia calculando totais
 */
export async function executarFechamentoDia(
  params: any,
  userId: string
): Promise<FechamentoDiaResult> {
  try {
    const { data, observacao } = params;
    
    // Data para fechamento (hoje se não especificado)
    const dataFechamento = data ? new Date(data) : new Date();
    const inicioDia = new Date(dataFechamento);
    inicioDia.setHours(0, 0, 0, 0);
    const fimDia = new Date(dataFechamento);
    fimDia.setHours(23, 59, 59, 999);

    // Buscar transações do dia
    const transacoesSnapshot = await db
      .collection('users')
      .doc(userId)
      .collection('transactions')
      .where('data', '>=', inicioDia)
      .where('data', '<=', fimDia)
      .get();

    let totalReceitas = 0;
    let totalDespesas = 0;
    const transacoes = transacoesSnapshot.docs;

    transacoes.forEach(doc => {
      const t = doc.data();
      if (t.tipo === 'receita') {
        totalReceitas += Number(t.valor || 0);
      } else if (t.tipo === 'despesa') {
        totalDespesas += Number(t.valor || 0);
      }
    });

    const saldo = totalReceitas - totalDespesas;

    // Salvar fechamento
    const fechamentoData = {
      data: dataFechamento,
      totalReceitas,
      totalDespesas,
      saldo,
      quantidadeTransacoes: transacoes.length,
      observacao: observacao || '',
      createdAt: new Date(),
      userId: userId,
      tipo: 'fechamento_diario'
    };

    await db
      .collection('users')
      .doc(userId)
      .collection('fechamentos')
      .add(fechamentoData);

    const dataFormatada = dataFechamento.toLocaleDateString('pt-BR');

    return {
      success: true,
      message: `✅ Dia fechado com sucesso!\n\n📅 Data: ${dataFormatada}\n💰 Receitas: R$ ${totalReceitas.toFixed(2)}\n💸 Despesas: R$ ${totalDespesas.toFixed(2)}\n📊 Saldo: R$ ${saldo.toFixed(2)}\n📝 Transações: ${transacoes.length}\n${observacao ? `\n💬 Obs: ${observacao}` : ''}`,
      data: dataFormatada,
      totalReceitas,
      totalDespesas,
      saldo,
      transacoes: transacoes.length
    };

  } catch (error: any) {
    console.error('Erro ao fechar dia:', error);
    return {
      success: false,
      message: `❌ Erro ao fechar o dia: ${error.message}`
    };
  }
}

/**
 * Registra uma despesa
 */
export async function executarRegistroDespesa(
  params: any,
  userId: string
): Promise<DespesaResult> {
  try {
    const { valor, descricao, categoria } = params;

    const despesaData = {
      tipo: 'despesa',
      valor: Number(valor),
      descricao: descricao,
      categoria: categoria || 'outro',
      data: new Date(),
      createdAt: new Date(),
      userId: userId,
      status: 'concluida'
    };

    const despesaRef = await db
      .collection('users')
      .doc(userId)
      .collection('transactions')
      .add(despesaData);

    return {
      success: true,
      message: `✅ Despesa registrada com sucesso!\n\n💸 Valor: R$ ${valor.toFixed(2)}\n📝 Descrição: ${descricao}\n🏷️ Categoria: ${categoria || 'outro'}\n📝 ID: ${despesaRef.id}`,
      transacaoId: despesaRef.id,
      valor: Number(valor)
    };

  } catch (error: any) {
    console.error('Erro ao registrar despesa:', error);
    return {
      success: false,
      message: `❌ Erro ao registrar despesa: ${error.message}`
    };
  }
}

/**
 * Consulta saldo
 */
export async function executarConsultaSaldo(
  params: any,
  userId: string
): Promise<SaldoResult> {
  try {
    const { funcionario_nome, periodo } = params;

    // Definir range de data baseado no período
    let dataInicio = new Date();
    if (periodo === 'hoje') {
      dataInicio.setHours(0, 0, 0, 0);
    } else if (periodo === 'semana') {
      dataInicio.setDate(dataInicio.getDate() - 7);
    } else if (periodo === 'mes') {
      dataInicio.setMonth(dataInicio.getMonth() - 1);
    } else if (periodo === 'ano') {
      dataInicio.setFullYear(dataInicio.getFullYear() - 1);
    }

    let query = db
      .collection('users')
      .doc(userId)
      .collection('transactions')
      .where('data', '>=', dataInicio);

    // Se especificou funcionário, filtrar
    if (funcionario_nome) {
      const funcionariosRef = db.collection('users').doc(userId).collection('employees');
      const funcionariosSnapshot = await funcionariosRef
        .where('nome', '>=', funcionario_nome.toLowerCase())
        .where('nome', '<=', funcionario_nome.toLowerCase() + '\uf8ff')
        .limit(1)
        .get();

      if (funcionariosSnapshot.empty) {
        return {
          success: false,
          message: `Funcionário "${funcionario_nome}" não encontrado.`
        };
      }

      const funcionarioData = funcionariosSnapshot.docs[0].data();
      
      return {
        success: true,
        message: `💰 Saldo de ${funcionarioData.nome}: R$ ${(funcionarioData.saldoAtual || 0).toFixed(2)}`,
        saldo: funcionarioData.saldoAtual || 0,
        funcionario: funcionarioData.nome,
        periodo: periodo || 'total'
      };
    }

    // Calcular saldo total
    const transacoesSnapshot = await query.get();
    let receitas = 0;
    let despesas = 0;

    transacoesSnapshot.forEach(doc => {
      const t = doc.data();
      if (t.tipo === 'receita') {
        receitas += Number(t.valor || 0);
      } else if (t.tipo === 'despesa') {
        despesas += Number(t.valor || 0);
      }
    });

    const saldo = receitas - despesas;
    const periodoTexto = periodo || 'total';

    return {
      success: true,
      message: `📊 Saldo ${periodoTexto}:\n\n💰 Receitas: R$ ${receitas.toFixed(2)}\n💸 Despesas: R$ ${despesas.toFixed(2)}\n📊 Saldo: R$ ${saldo.toFixed(2)}`,
      saldo: saldo,
      periodo: periodoTexto
    };

  } catch (error: any) {
    console.error('Erro ao consultar saldo:', error);
    return {
      success: false,
      message: `❌ Erro ao consultar saldo: ${error.message}`
    };
  }
}

/**
 * Lista funcionários
 */
export async function executarListaFuncionarios(
  params: any,
  userId: string
): Promise<FuncionariosResult> {
  try {
    const { ativo } = params;

    let query = db.collection('users').doc(userId).collection('employees');

    if (ativo !== undefined) {
      query = query.where('ativo', '==', ativo) as any;
    }

    const snapshot = await query.get();

    if (snapshot.empty) {
      return {
        success: true,
        message: '📋 Nenhum funcionário encontrado.',
        funcionarios: []
      };
    }

    const funcionarios = snapshot.docs.map(doc => ({
      id: doc.id,
      nome: doc.data().nome,
      cargo: doc.data().cargo,
      ativo: doc.data().ativo !== false
    }));

    const lista = funcionarios
      .map((f, i) => `${i + 1}. ${f.nome} - ${f.cargo}${f.ativo ? '' : ' (Inativo)'}`)
      .join('\n');

    return {
      success: true,
      message: `📋 Funcionários cadastrados (${funcionarios.length}):\n\n${lista}`,
      funcionarios: funcionarios
    };

  } catch (error: any) {
    console.error('Erro ao listar funcionários:', error);
    return {
      success: false,
      message: `❌ Erro ao listar funcionários: ${error.message}`
    };
  }
}

