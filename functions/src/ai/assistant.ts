import { onCall, HttpsError, onRequest } from 'firebase-functions/v2/https';
import * as functions from 'firebase-functions';
import OpenAI from 'openai';
import { AI_TOOLS } from './tools';
import {
  executarRegistroDeposito,
  executarRegistroSaque,
  executarFechamentoDia,
  executarRegistroDespesa,
  executarConsultaSaldo,
  executarListaFuncionarios
} from './executors';

// System prompt otimizado - IA Geral + Especialista Optify
const SYSTEM_PROMPT = `Você é um assistente virtual inteligente e versátil. Você pode:

1️⃣ **RESPONDER QUALQUER PERGUNTA**: Sobre qualquer assunto (tecnologia, história, ciência, cultura, etc.)
2️⃣ **EXECUTAR AÇÕES NO SISTEMA OPTIFY**: Registrar transações, fechar dia, consultar saldos, etc.

🎯 FUNÇÕES DISPONÍVEIS NO SISTEMA:
Quando o usuário pedir para FAZER algo no sistema, use as functions:

• **registrar_deposito** - Registrar depósitos/receitas/entradas de dinheiro
  Variações: "depositei", "recebi", "transferi", "fiz deposito", "entrada de", "crédito de"
  Exemplos: "depositei 300 na conta do diego", "fiz deposito de 500 na betano do joão"
  
• **registrar_saque** - Registrar saques/retiradas da conta de funcionários
  Variações: "saquei", "retirei", "tirei dinheiro", "saque de", "retirada de"
  Exemplos: "saquei 200 do diego", "tirei 100 da conta do joão", "saque de 50"
  
• **fechar_dia** - Fechar/encerrar o dia e calcular totais
  Variações: "feche o dia", "fechar dia", "encerrar dia", "fazer fechamento", "finalizar dia"
  Exemplos: "feche o dia", "fechar dia de hoje", "fazer fechamento"
  
• **registrar_despesa** - Registrar despesas gerais da empresa
  Variações: "paguei", "gastei", "despesa de", "saída de", "conta de"
  Exemplos: "paguei 500 de aluguel", "despesa de 200 em marketing"
  
• **consultar_saldo** - Consultar saldos
  Variações: "qual o saldo", "quanto tem", "saldo de", "quanto está", "valor disponível"
  Exemplos: "qual o saldo do diego?", "quanto tem o joão?", "saldo total"
  
• **listar_funcionarios** - Listar funcionários/colaboradores
  Variações: "listar funcionários", "quem são", "mostrar colaboradores", "funcionários cadastrados"
  Exemplos: "listar funcionários", "quem são os colaboradores?"

🔍 QUANDO USAR AS FUNCTIONS:
- Se o usuário PEDIR para fazer algo → USE a function
- Se o usuário apenas PERGUNTAR → Responda normalmente SEM usar function
- Se o usuário conversar sobre outro assunto → Responda como assistente geral

📝 EXEMPLOS DE QUANDO USAR FUNCTIONS:
✅ "depositei 300 na conta do diego" → USAR registrar_deposito
✅ "saquei 200 do joão" → USAR registrar_saque
✅ "feche o dia" → USAR fechar_dia
✅ "qual o saldo do diego?" → USAR consultar_saldo
✅ "paguei 500 de aluguel" → USAR registrar_despesa

📝 EXEMPLOS DE RESPOSTAS NORMAIS (SEM USAR FUNCTIONS):
✅ "como faço para depositar?" → EXPLICAR o processo
✅ "o que é inteligência artificial?" → Explicar IA
✅ "qual a capital da França?" → Paris
✅ "conte uma piada" → Contar piada
✅ "me ajuda com matemática" → Ajudar
✅ "o que você pode fazer?" → Explicar suas capacidades
✅ "qual a diferença entre depósito e saque?" → Explicar conceitos

🎯 SEJA NATURAL E CONVERSACIONAL:
- Responda de forma amigável e clara
- Use emojis quando apropriado
- Seja prestativo e educado
- Se não souber algo específico do sistema, diga isso
- Para tópicos gerais, use todo seu conhecimento

💡 SOBRE O CONTEXTO:
Você está integrado ao sistema Optify (gestão financeira empresarial), mas pode conversar sobre QUALQUER assunto.

📚 CONHECIMENTO GERAL:
- Responda perguntas sobre história, ciência, tecnologia, cultura, matemática, etc.
- Ajude com dúvidas gerais, curiosidades, explicações
- Seja conversacional e amigável
- Use todo seu conhecimento do GPT-4o mini

🏢 QUANDO O ASSUNTO FOR OPTIFY:
O Optify permite:
- Gestão de funcionários e suas contas
- Registro de depósitos (entradas) e saques (saídas) por funcionário
- Registro de despesas gerais da empresa
- Fechamento diário com cálculo de totais
- Consulta de saldos e relatórios
- Plataformas: Betano, Bet365, Pixbet, Sportingbet, Blaze, etc.

💬 ESTILO DE CONVERSA:
- Seja natural, amigável e prestativo
- Use emojis quando apropriado
- Mantenha respostas concisas mas completas
- Se não souber algo específico do sistema, seja honesto
- Para tópicos gerais, use todo seu conhecimento
- Lembre-se do contexto da conversa anterior

🎭 PERSONALIDADE:
- Profissional mas descontraído
- Paciente e didático
- Proativo em ajudar
- Positivo e motivador

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

      // Inicializar OpenAI com a chave do config
      const openaiApiKey = functions.config().openai?.key || process.env.OPENAI_API_KEY;
      
      if (!openaiApiKey) {
        throw new HttpsError('internal', 'OpenAI API key não configurada');
      }

      const openai = new OpenAI({
        apiKey: openaiApiKey
      });

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

      // Chamar OpenAI API com GPT-4o mini e tools
      let completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: messages,
        tools: AI_TOOLS as any,
        tool_choice: 'auto', // Deixar o modelo decidir quando usar tools
        temperature: 0.7,
        max_tokens: 500,
        user: request.auth.uid,
      });

      let responseMessage = completion.choices[0]?.message;
      
      // Se o modelo decidiu chamar uma function
      if (responseMessage?.tool_calls && responseMessage.tool_calls.length > 0) {
        console.log(`🔧 GPT decidiu chamar ${responseMessage.tool_calls.length} function(s)`);
        
        // Adicionar a resposta do assistente às mensagens
        messages.push(responseMessage as any);

        // Executar cada function call
        for (const toolCall of responseMessage.tool_calls) {
          if (toolCall.type === 'function') {
            const functionName = toolCall.function.name;
            const functionArgs = JSON.parse(toolCall.function.arguments);

            console.log(`⚙️ Executando: ${functionName}`, functionArgs);

            let functionResult: any;

            // Executar a function apropriada
            switch (functionName) {
              case 'registrar_deposito':
                functionResult = await executarRegistroDeposito(functionArgs, request.auth.uid);
                break;
              case 'registrar_saque':
                functionResult = await executarRegistroSaque(functionArgs, request.auth.uid);
                break;
              case 'fechar_dia':
                functionResult = await executarFechamentoDia(functionArgs, request.auth.uid);
                break;
              case 'registrar_despesa':
                functionResult = await executarRegistroDespesa(functionArgs, request.auth.uid);
                break;
              case 'consultar_saldo':
                functionResult = await executarConsultaSaldo(functionArgs, request.auth.uid);
                break;
              case 'listar_funcionarios':
                functionResult = await executarListaFuncionarios(functionArgs, request.auth.uid);
                break;
              default:
                functionResult = {
                  success: false,
                  message: `Function ${functionName} não implementada`
                };
            }

            console.log(`✅ Function ${functionName} executada:`, functionResult.success);

            // Adicionar resultado da function às mensagens
            messages.push({
              role: 'tool',
              tool_call_id: toolCall.id,
              content: JSON.stringify(functionResult)
            } as any);
          }
        }

        // Fazer uma segunda chamada ao GPT para gerar resposta final
        completion = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: messages,
          temperature: 0.7,
          max_tokens: 500,
          user: request.auth.uid,
        });

        responseMessage = completion.choices[0]?.message;
      }

      const response = responseMessage?.content || 'Desculpe, não consegui gerar uma resposta.';

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

      // Erro genérico
      throw new HttpsError('internal', 'Erro interno do servidor');
    }
  }
);

/**
 * Cloud Function HTTP para gerar respostas do assistente AI (com CORS)
 */
export const generateAIResponseHTTP = onRequest(
  {
    memory: '256MiB',
    timeoutSeconds: 60,
    region: 'us-central1',
  },
  async (request, response) => {
    // Verificar método
    if (request.method === 'OPTIONS') {
      response.status(200).send('');
      return;
    }

    if (request.method !== 'POST') {
      response.status(405).send('Method not allowed');
      return;
    }

    // Verificar autenticação via header
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      response.status(401).json({ error: 'Usuário não autenticado' });
      return;
    }

    try {
      const { message, context } = request.body;

      // Validações
      if (!message || typeof message !== 'string') {
        response.status(400).json({ error: 'Mensagem inválida' });
        return;
      }

      if (message.length > 1000) {
        response.status(400).json({ error: 'Mensagem muito longa (máximo 1000 caracteres)' });
        return;
      }

      console.log(`🤖 Gerando resposta HTTP para usuário autenticado`);

      // Inicializar OpenAI com a chave do config
      const openaiApiKey = functions.config().openai?.key || process.env.OPENAI_API_KEY;
      
      if (!openaiApiKey) {
        response.status(500).json({ error: 'OpenAI API key não configurada' });
        return;
      }

      const openai = new OpenAI({
        apiKey: openaiApiKey
      });

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

      // Chamar OpenAI API com GPT-4o mini e tools
      let completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: messages,
        tools: AI_TOOLS as any,
        tool_choice: 'auto', // Deixar o modelo decidir quando usar tools
        temperature: 0.7,
        max_tokens: 500,
      });

      let responseMessage = completion.choices[0]?.message;
      
      // Se o modelo decidiu chamar uma function
      if (responseMessage?.tool_calls && responseMessage.tool_calls.length > 0) {
        console.log(`🔧 GPT decidiu chamar ${responseMessage.tool_calls.length} function(s)`);
        
        // Adicionar a resposta do assistente às mensagens
        messages.push(responseMessage as any);

        // Executar cada function call
        for (const toolCall of responseMessage.tool_calls) {
          if (toolCall.type === 'function') {
            const functionName = toolCall.function.name;
            const functionArgs = JSON.parse(toolCall.function.arguments);

            console.log(`⚙️ Executando: ${functionName}`, functionArgs);

            let functionResult: any;

            // Executar a function apropriada
            switch (functionName) {
              case 'registrar_deposito':
                functionResult = await executarRegistroDeposito(functionArgs, 'http-user');
                break;
              case 'registrar_saque':
                functionResult = await executarRegistroSaque(functionArgs, 'http-user');
                break;
              case 'fechar_dia':
                functionResult = await executarFechamentoDia(functionArgs, 'http-user');
                break;
              case 'registrar_despesa':
                functionResult = await executarRegistroDespesa(functionArgs, 'http-user');
                break;
              case 'consultar_saldo':
                functionResult = await executarConsultaSaldo(functionArgs, 'http-user');
                break;
              case 'listar_funcionarios':
                functionResult = await executarListaFuncionarios(functionArgs, 'http-user');
                break;
              default:
                functionResult = {
                  success: false,
                  message: `Function ${functionName} não implementada`
                };
            }

            console.log(`✅ Function ${functionName} executada:`, functionResult.success);

            // Adicionar resultado da function às mensagens
            messages.push({
              role: 'tool',
              tool_call_id: toolCall.id,
              content: JSON.stringify(functionResult)
            } as any);
          }
        }

        // Fazer uma segunda chamada ao GPT para gerar resposta final
        completion = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: messages,
          temperature: 0.7,
          max_tokens: 500,
        });

        responseMessage = completion.choices[0]?.message;
      }

      const responseText = responseMessage?.content || 'Desculpe, não consegui gerar uma resposta.';

      console.log(`✅ Resposta HTTP gerada com sucesso`);

      response.status(200).json({
        response: responseText.trim(),
        model: 'gpt-4o-mini',
        usage: {
          promptTokens: completion.usage?.prompt_tokens || 0,
          completionTokens: completion.usage?.completion_tokens || 0,
          totalTokens: completion.usage?.total_tokens || 0,
        }
      });

    } catch (error: any) {
      console.error('❌ Erro ao gerar resposta HTTP:', error);

      // Tratamento de erros específicos da OpenAI
      if (error.status === 429) {
        response.status(429).json({ error: 'Limite de requisições excedido. Tente novamente em alguns instantes.' });
        return;
      }

      if (error.status === 401) {
        response.status(500).json({ error: 'Erro de autenticação com OpenAI API' });
        return;
      }

      response.status(500).json({ error: 'Erro ao gerar resposta do assistente' });
    }
  }
);

