import { onCall, HttpsError } from 'firebase-functions/v2/https';
import OpenAI from 'openai';

// Configuração da OpenAI API
const openai = new OpenAI({
  apiKey: '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'
});

// System prompt otimizado para o Optify
const SYSTEM_PROMPT = `Você é um assistente virtual especializado no sistema Optify, uma plataforma de gestão financeira empresarial.

SOBRE O SISTEMA OPTIFY:
O Optify é um sistema completo de gestão que permite:
- Cadastro e gestão de funcionários (colaboradores)
- Registro de transações financeiras (receitas e despesas)
- Configuração de plataformas de vendas
- Definição de metas mensais
- Geração de relatórios financeiros detalhados
- Acompanhamento de pagamentos e histórico

SUAS RESPONSABILIDADES:
1. Ajudar usuários a entender como usar o sistema
2. Fornecer instruções passo a passo para operações
3. Responder dúvidas sobre funcionalidades
4. Auxiliar em cadastros, edições e remoções de dados
5. Explicar relatórios e métricas

FUNCIONALIDADES PRINCIPAIS:

1. GESTÃO DE FUNCIONÁRIOS:
   - Acesse "Gestão de Funcionários" no menu
   - Cadastre: nome, cargo, salário, data de admissão, email, telefone
   - Edite informações de colaboradores existentes
   - Remova funcionários quando necessário
   - Visualize desempenho e histórico de vendas

2. REGISTRO DE TRANSAÇÕES:
   - Acesse "Transações" ou "Resumo do Dia"
   - Selecione tipo: Receita (venda) ou Despesa
   - Preencha: valor, descrição, categoria, data
   - Associe ao funcionário responsável
   - Escolha plataforma de venda (se aplicável)

3. CONFIGURAÇÃO DE METAS:
   - Acesse "Metas" no dashboard
   - Defina valor da meta mensal
   - Configure período e tipo de meta
   - Acompanhe progresso em tempo real

4. RELATÓRIOS:
   - Acesse "Relatórios" no menu
   - Selecione tipo: vendas, despesas, comissões, etc.
   - Defina período de análise
   - Aplique filtros por funcionário, plataforma, categoria
   - Exporte em PDF ou visualize na tela

5. GESTÃO DE PAGAMENTOS:
   - Acesse "Pagamentos" no menu
   - Visualize pagamentos pendentes
   - Processe pagamentos manualmente
   - Acompanhe histórico completo

DIRETRIZES DE RESPOSTA:
- Seja claro, direto e objetivo
- Use português brasileiro
- Forneça instruções passo a passo quando apropriado
- Seja educado e prestativo
- Se não souber algo, sugira contatar o suporte
- Use emojis ocasionalmente para tornar respostas mais amigáveis
- Mantenha respostas concisas (máximo 3-4 parágrafos)

FORMATO DE RESPOSTA:
- Use listas numeradas para passos
- Use bullet points para opções
- Destaque termos importantes com **negrito**
- Seja consistente com os nomes das seções do sistema

Você tem acesso ao histórico das últimas mensagens para dar respostas contextuais.`;

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface GenerateResponseRequest {
  message: string;
  context: ChatMessage[];
}

/**
 * Cloud Function para gerar respostas do assistente AI
 */
export const generateAIResponse = onCall<GenerateResponseRequest>(
  {
    enforceAppCheck: false, // Pode ativar em produção
    memory: '256MiB',
    timeoutSeconds: 60,
    region: 'us-central1',
  },
  async (request) => {
    // Verificar autenticação
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Usuário não autenticado');
    }

    const { message, context } = request.data;

    // Validações
    if (!message || typeof message !== 'string') {
      throw new HttpsError('invalid-argument', 'Mensagem inválida');
    }

    if (message.length > 1000) {
      throw new HttpsError('invalid-argument', 'Mensagem muito longa (máximo 1000 caracteres)');
    }

    try {
      console.log(`🤖 Gerando resposta para usuário: ${request.auth.uid}`);

      // Preparar mensagens para o GPT
      const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
        { role: 'system', content: SYSTEM_PROMPT }
      ];

      // Adicionar contexto (últimas 5 mensagens)
      if (context && Array.isArray(context)) {
        const recentContext = context.slice(-5);
        for (const msg of recentContext) {
          if (msg.role === 'user' || msg.role === 'assistant') {
            messages.push({
              role: msg.role,
              content: msg.content
            });
          }
        }
      }

      // Adicionar mensagem atual do usuário
      messages.push({
        role: 'user',
        content: message
      });

      // Chamar OpenAI API com GPT-4o mini
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini', // Modelo mais recente e econômico
        messages: messages,
        temperature: 0.7,
        max_tokens: 500,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0,
        user: request.auth.uid, // Para tracking e segurança
      });

      const response = completion.choices[0]?.message?.content || 'Desculpe, não consegui gerar uma resposta.';

      console.log(`✅ Resposta gerada com sucesso para: ${request.auth.uid}`);

      return {
        response: response.trim(),
        model: 'gpt-4o-mini',
        usage: {
          promptTokens: completion.usage?.prompt_tokens || 0,
          completionTokens: completion.usage?.completion_tokens || 0,
          totalTokens: completion.usage?.total_tokens || 0,
        }
      };

    } catch (error: any) {
      console.error('❌ Erro ao gerar resposta:', error);

      // Tratamento de erros específicos da OpenAI
      if (error.status === 429) {
        throw new HttpsError('resource-exhausted', 'Limite de requisições excedido. Tente novamente em alguns instantes.');
      }

      if (error.status === 401) {
        throw new HttpsError('internal', 'Erro de autenticação com OpenAI API');
      }

      throw new HttpsError('internal', 'Erro ao gerar resposta do assistente');
    }
  }
);

