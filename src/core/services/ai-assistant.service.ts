import { db, functions } from '@/integrations/firebase/config';
import { collection, addDoc, getDocs, query, orderBy, limit, where, deleteDoc, doc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';

export interface ChatMessage {
  id?: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  userId: string;
  metadata?: {
    operation?: string;
    entityType?: string;
    entityId?: string;
    success?: boolean;
  };
}

export interface SystemKnowledge {
  operations: {
    name: string;
    description: string;
    steps: string[];
    examples: string[];
  }[];
  entities: {
    type: string;
    description: string;
    fields: string[];
    operations: string[];
  }[];
  commonQuestions: {
    question: string;
    answer: string;
    keywords: string[];
  }[];
}

class AIAssistantService {
  private readonly systemKnowledge: SystemKnowledge = {
    operations: [
      {
        name: 'Cadastrar Funcionário',
        description: 'Adicionar um novo funcionário ao sistema',
        steps: [
          'Acesse a seção "Gestão de Funcionários"',
          'Clique em "Adicionar Funcionário"',
          'Preencha os dados: nome, cargo, salário, data de admissão',
          'Salve as informações'
        ],
        examples: [
          'Como adicionar um funcionário?',
          'Quero cadastrar um novo colaborador',
          'Adicionar funcionário no sistema'
        ]
      },
      {
        name: 'Registrar Transação',
        description: 'Registrar uma nova transação financeira',
        steps: [
          'Vá para a seção "Transações"',
          'Clique em "Nova Transação"',
          'Selecione o tipo: receita ou despesa',
          'Preencha valor, descrição, categoria',
          'Salve a transação'
        ],
        examples: [
          'Como registrar uma venda?',
          'Quero adicionar uma despesa',
          'Registrar transação de receita'
        ]
      },
      {
        name: 'Gerenciar Pagamentos',
        description: 'Visualizar e processar pagamentos',
        steps: [
          'Acesse "Pagamentos" no menu',
          'Visualize pagamentos pendentes',
          'Processe pagamentos quando necessário',
          'Acompanhe histórico de pagamentos'
        ],
        examples: [
          'Como ver meus pagamentos?',
          'Processar pagamento pendente',
          'Histórico de pagamentos'
        ]
      },
      {
        name: 'Configurar Metas',
        description: 'Definir metas financeiras mensais',
        steps: [
          'Vá para "Metas" no dashboard',
          'Defina valor da meta mensal',
          'Configure período da meta',
          'Salve a configuração'
        ],
        examples: [
          'Como definir uma meta mensal?',
          'Configurar objetivo financeiro',
          'Definir meta de vendas'
        ]
      }
    ],
    entities: [
      {
        type: 'funcionario',
        description: 'Colaboradores da empresa',
        fields: ['nome', 'cargo', 'salario', 'dataAdmissao', 'email', 'telefone'],
        operations: ['cadastrar', 'editar', 'remover', 'visualizar']
      },
      {
        type: 'transacao',
        description: 'Movimentações financeiras',
        fields: ['valor', 'tipo', 'descricao', 'categoria', 'data', 'funcionario'],
        operations: ['registrar', 'editar', 'excluir', 'filtrar']
      },
      {
        type: 'plataforma',
        description: 'Plataformas de vendas',
        fields: ['nome', 'comissao', 'ativo', 'descricao'],
        operations: ['adicionar', 'configurar', 'ativar', 'desativar']
      },
      {
        type: 'meta',
        description: 'Objetivos financeiros',
        fields: ['valor', 'periodo', 'tipo', 'status'],
        operations: ['definir', 'atualizar', 'acompanhar']
      }
    ],
    commonQuestions: [
      {
        question: 'Como funciona o sistema Optify?',
        answer: 'O Optify é um sistema de gestão financeira empresarial que permite controlar funcionários, transações, pagamentos, metas e gerar relatórios detalhados. Você pode cadastrar colaboradores, registrar vendas e despesas, acompanhar metas mensais e visualizar relatórios em tempo real.',
        keywords: ['sistema', 'optify', 'funcionamento', 'como usar']
      },
      {
        question: 'Como adicionar um funcionário?',
        answer: 'Para adicionar um funcionário: 1) Acesse "Gestão de Funcionários" no menu, 2) Clique em "Adicionar Funcionário", 3) Preencha nome, cargo, salário e data de admissão, 4) Salve as informações. O funcionário será adicionado ao sistema e poderá ser usado em transações.',
        keywords: ['funcionario', 'adicionar', 'cadastrar', 'colaborador']
      },
      {
        question: 'Como registrar uma venda?',
        answer: 'Para registrar uma venda: 1) Vá para "Transações" no menu, 2) Clique em "Nova Transação", 3) Selecione "Receita" como tipo, 4) Preencha valor, descrição e categoria, 5) Associe ao funcionário responsável, 6) Salve a transação. Ela aparecerá no resumo diário e relatórios.',
        keywords: ['venda', 'receita', 'transacao', 'registrar']
      },
      {
        question: 'Como definir metas mensais?',
        answer: 'Para definir metas: 1) Acesse "Metas" no dashboard, 2) Clique em "Nova Meta", 3) Defina o valor desejado, 4) Selecione o período (mensal), 5) Escolha o tipo de meta, 6) Salve. Você poderá acompanhar o progresso em tempo real no dashboard.',
        keywords: ['meta', 'objetivo', 'mensal', 'definir']
      },
      {
        question: 'Como gerar relatórios?',
        answer: 'Para gerar relatórios: 1) Acesse "Relatórios" no menu, 2) Selecione o tipo de relatório desejado, 3) Defina o período, 4) Escolha filtros se necessário, 5) Clique em "Gerar". Os relatórios podem ser exportados em PDF ou visualizados na tela.',
        keywords: ['relatorio', 'gerar', 'exportar', 'pdf']
      }
    ]
  };

  /**
   * Salva uma mensagem da conversa no Firestore
   */
  async saveMessage(userId: string, message: Omit<ChatMessage, 'id' | 'timestamp' | 'userId'>): Promise<string> {
    try {
      const messageData: Omit<ChatMessage, 'id'> = {
        ...message,
        userId,
        timestamp: new Date()
      };

      const docRef = await addDoc(collection(db, `users/${userId}/conversations`), messageData);
      await this.cleanupOldMessages(userId);
      return docRef.id;
    } catch (error) {
      console.error('Erro ao salvar mensagem:', error);
      throw error;
    }
  }

  /**
   * Recupera as últimas 10 mensagens do usuário
   */
  async getRecentMessages(userId: string, limitCount: number = 10): Promise<ChatMessage[]> {
    try {
      const q = query(
        collection(db, `users/${userId}/conversations`),
        orderBy('timestamp', 'desc'),
        limit(limitCount)
      );

      const querySnapshot = await getDocs(q);
      const messages = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp.toDate()
      })) as ChatMessage[];

      return messages.reverse(); // Ordenar cronologicamente
    } catch (error) {
      console.error('Erro ao buscar mensagens:', error);
      return [];
    }
  }

  /**
   * Remove mensagens antigas, mantendo apenas as últimas 10
   */
  private async cleanupOldMessages(userId: string): Promise<void> {
    try {
      const q = query(
        collection(db, `users/${userId}/conversations`),
        orderBy('timestamp', 'desc')
      );

      const querySnapshot = await getDocs(q);
      const messages = querySnapshot.docs;

      if (messages.length > 10) {
        const messagesToDelete = messages.slice(10);
        
        for (const messageDoc of messagesToDelete) {
          await deleteDoc(doc(db, `users/${userId}/conversations`, messageDoc.id));
        }
      }
    } catch (error) {
      console.error('Erro ao limpar mensagens antigas:', error);
    }
  }

  /**
   * Processa a mensagem do usuário e gera resposta do assistente
   */
  async processUserMessage(userId: string, userMessage: string): Promise<string> {
    try {
      // Buscar contexto das mensagens anteriores
      const recentMessages = await this.getRecentMessages(userId, 10);
      
      // Salvar mensagem do usuário
      await this.saveMessage(userId, {
        role: 'user',
        content: userMessage
      });

      // Gerar resposta do assistente usando GPT-4o Mini
      const assistantResponse = await this.generateResponseWithGPT(userMessage, recentMessages);
      
      // Salvar resposta do assistente
      await this.saveMessage(userId, {
        role: 'assistant',
        content: assistantResponse,
        metadata: {
          operation: this.extractOperation(userMessage),
          success: true
        }
      });

      return assistantResponse;
    } catch (error) {
      console.error('Erro ao processar mensagem:', error);
      return 'Desculpe, ocorreu um erro ao processar sua mensagem. Tente novamente.';
    }
  }

  /**
   * Gera resposta usando GPT-4o Mini via Cloud Function HTTP ou fallback local
   */
  private async generateResponseWithGPT(userMessage: string, context: ChatMessage[]): Promise<string> {
    try {
      // Tentar usar a função HTTP primeiro (com CORS configurado)
      const response = await fetch('https://us-central1-optify-definitivo.cloudfunctions.net/generateAIResponseHTTP', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await this.getAuthToken()}`
        },
        body: JSON.stringify({
          message: userMessage,
          context: context.slice(-5).map(msg => ({
            role: msg.role,
            content: msg.content
          }))
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      console.log(`✅ Resposta gerada com ${data.model} - Tokens: ${data.usage?.totalTokens || 0}`);
      
      return data.response;

    } catch (error: any) {
      console.error('Erro ao chamar Cloud Function HTTP:', error);
      
      // Fallback para resposta local em caso de erro
      console.log('📝 Usando resposta local como fallback');
      return this.generateLocalResponse(userMessage, context);
    }
  }

  /**
   * Obtém token de autenticação do Firebase
   */
  private async getAuthToken(): Promise<string> {
    const { auth } = await import('@/integrations/firebase/config');
    const user = auth.currentUser;
    if (!user) {
      throw new Error('Usuário não autenticado');
    }
    return await user.getIdToken();
  }

  /**
   * Gera resposta local (fallback quando GPT não está disponível)
   */
  private generateLocalResponse(userMessage: string, context: ChatMessage[]): string {
    const message = userMessage.toLowerCase();
    
    // Buscar pergunta comum
    const commonQuestion = this.systemKnowledge.commonQuestions.find(q =>
      q.keywords.some(keyword => message.includes(keyword))
    );

    if (commonQuestion) {
      return commonQuestion.answer;
    }

    // Buscar operação específica
    const operation = this.systemKnowledge.operations.find(op =>
      op.examples.some(example => message.includes(example.toLowerCase()))
    );

    if (operation) {
      return `Para ${operation.description.toLowerCase()}:${operation.steps.map((step, index) => `\n${index + 1}. ${step}`).join('')}`;
    }

    // Buscar por entidade
    const entity = this.systemKnowledge.entities.find(ent =>
      message.includes(ent.type.toLowerCase())
    );

    if (entity) {
      return `Para trabalhar com ${entity.description}: você pode ${entity.operations.join(', ')}. Os campos disponíveis são: ${entity.fields.join(', ')}.`;
    }

    // Resposta genérica inteligente
    if (message.includes('oi') || message.includes('olá') || message.includes('bom dia') || message.includes('boa tarde') || message.includes('boa noite')) {
      return 'Olá! 👋 Sou seu assistente do Optify. Posso ajudá-lo com:\n\n• Cadastro e gestão de funcionários\n• Registro de transações (vendas e despesas)\n• Configuração de metas mensais\n• Geração de relatórios\n• Dúvidas sobre o sistema\n\nE também posso conversar sobre qualquer assunto! 😊\n\nComo posso ajudá-lo hoje?';
    }

    // Se não encontrou nada específico, ser mais útil
    return `Entendi sua mensagem: "${userMessage}"\n\nPosso ajudá-lo com:\n• Operações do sistema Optify (depósitos, saques, fechamento de dia)\n• Perguntas gerais (história, ciência, matemática, etc.)\n• Conversas casuais\n\nTente perguntar algo específico! 🤔`;
  }

  /**
   * Extrai operação mencionada na mensagem
   */
  private extractOperation(message: string): string {
    const messageLower = message.toLowerCase();
    
    if (messageLower.includes('adicionar') || messageLower.includes('cadastrar')) return 'create';
    if (messageLower.includes('editar') || messageLower.includes('alterar')) return 'update';
    if (messageLower.includes('remover') || messageLower.includes('excluir')) return 'delete';
    if (messageLower.includes('visualizar') || messageLower.includes('ver')) return 'view';
    
    return 'general';
  }

  /**
   * Limpa todo o histórico de conversas do usuário
   */
  async clearConversationHistory(userId: string): Promise<void> {
    try {
      const messages = await this.getRecentMessages(userId, 100);
      
      for (const message of messages) {
        if (message.id) {
          await deleteDoc(doc(db, `users/${userId}/conversations`, message.id));
        }
      }
    } catch (error) {
      console.error('Erro ao limpar histórico:', error);
      throw error;
    }
  }
}

export const aiAssistantService = new AIAssistantService();
