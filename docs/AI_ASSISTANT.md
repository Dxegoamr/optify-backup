# 🤖 Assistente AI do Optify

## 📖 Visão Geral

O Assistente AI é um chatbot inteligente integrado ao sistema Optify que ajuda usuários a realizar operações e tirar dúvidas sobre a plataforma. Utiliza GPT-4o Mini da OpenAI para gerar respostas contextuais e inteligentes, com fallback automático para respostas locais.

## ✨ Funcionalidades

### 🎯 Principais Recursos

1. **Chat em Tempo Real**
   - Respostas instantâneas
   - Interface flutuante acessível de qualquer página
   - Página dedicada com funcionalidades avançadas

2. **Memória Inteligente**
   - Armazena últimas 10 mensagens no Firestore
   - Contexto conversacional para respostas mais precisas
   - Limpeza automática de mensagens antigas

3. **Base de Conhecimento**
   - 5 operações principais do sistema
   - 4 tipos de entidades gerenciáveis
   - 5 perguntas comuns pré-respondidas
   - Integração com GPT-4o Mini para perguntas avançadas

4. **Ações Rápidas**
   - Botões para operações comuns
   - Acesso rápido a tutoriais
   - Atalhos para funcionalidades principais

## 🚀 Como Usar

### Acesso via Botão Flutuante

1. **Abrir Chat:**
   - Clique no ícone 💬 no canto inferior direito
   - Disponível em todas as páginas do sistema

2. **Fazer Perguntas:**
   - Digite sua pergunta em português
   - Pressione Enter ou clique em "Enviar"
   - Aguarde a resposta do assistente

3. **Ações Disponíveis:**
   - **Limpar Histórico:** Remove todas as mensagens
   - **Fechar Chat:** Minimiza o chat

### Acesso via Página Dedicada

1. **Navegue até:** Menu lateral → **Assistente AI**
2. **Três abas disponíveis:**
   - **Ações Rápidas:** Botões para operações comuns
   - **Chat Completo:** Interface de conversação expandida
   - **Ajuda:** Documentação e exemplos

## 💬 Exemplos de Perguntas

### Sobre Funcionários
```
"Como adicionar um funcionário?"
"Como editar dados de um colaborador?"
"Como remover um funcionário do sistema?"
"Quais informações preciso para cadastrar?"
```

### Sobre Transações
```
"Como registrar uma venda?"
"Como adicionar uma despesa?"
"Como filtrar transações por período?"
"Qual a diferença entre receita e despesa?"
```

### Sobre Metas
```
"Como definir uma meta mensal?"
"Como acompanhar o progresso da meta?"
"Posso ter várias metas ao mesmo tempo?"
```

### Sobre Relatórios
```
"Como gerar um relatório de vendas?"
"Como exportar relatórios em PDF?"
"Quais tipos de relatórios estão disponíveis?"
```

### Sobre Sistema
```
"Como funciona o sistema Optify?"
"Quais funcionalidades estão disponíveis?"
"Como navegar pelo dashboard?"
```

## 🔧 Configuração

### Modo Local (Padrão)

Por padrão, o assistente funciona com respostas locais:
- ✅ Sem necessidade de configuração
- ✅ Sem custos
- ⚠️ Respostas limitadas à base de conhecimento pré-programada

### Modo GPT-4o Mini (Recomendado)

Para respostas mais inteligentes e contextuais:

1. **Obter API Key:**
   - Acesse [platform.openai.com](https://platform.openai.com)
   - Crie uma API key

2. **Configurar no Projeto:**
   ```bash
   # Criar arquivo .env
   echo "VITE_OPENAI_API_KEY=sk-sua-chave-aqui" > .env
   
   # Reiniciar servidor
   npm run dev
   ```

3. **Verificar Status:**
   - Badge "GPT-4o Mini" aparecerá no chat quando configurado
   - Sem badge = modo local ativo

## 🎨 Interface

### Componentes

1. **`AIAssistant.tsx`** - Chat flutuante
   - Botão circular no canto inferior direito
   - Card flutuante com histórico de mensagens
   - Input para envio de mensagens

2. **`AIAssistantPage.tsx`** - Página dedicada
   - Interface expandida com tabs
   - Ações rápidas organizadas por categoria
   - Documentação integrada

3. **`QuickActions.tsx`** - Botões de atalho
   - 6 ações principais pré-configuradas
   - Organizadas por categoria
   - Um clique para enviar pergunta

### Customização

Você pode customizar:
- Cores e estilos (via Tailwind CSS)
- Ações rápidas disponíveis
- Base de conhecimento local
- System prompt do GPT

## 📊 Base de Conhecimento Local

### Operações Suportadas

1. **Cadastrar Funcionário**
   - Passos detalhados
   - Campos necessários
   - Exemplos de uso

2. **Registrar Transação**
   - Tipos de transação
   - Processo completo
   - Associação com funcionários

3. **Gerenciar Pagamentos**
   - Visualização de pendentes
   - Processamento manual
   - Histórico

4. **Configurar Metas**
   - Definição de valores
   - Tipos de meta
   - Acompanhamento

### Entidades Gerenciáveis

1. **Funcionários**
   - Campos: nome, cargo, salário, data de admissão
   - Operações: CRUD completo

2. **Transações**
   - Campos: valor, tipo, descrição, categoria
   - Operações: registrar, editar, excluir

3. **Plataformas**
   - Campos: nome, comissão, status
   - Operações: configurar, ativar/desativar

4. **Metas**
   - Campos: valor, período, tipo
   - Operações: definir, atualizar, acompanhar

## 🧠 Como Funciona

### Fluxo de Processamento

```
1. Usuário digita mensagem
   ↓
2. Mensagem salva no Firestore
   ↓
3. Sistema busca contexto (últimas 10 mensagens)
   ↓
4. Decisão: GPT-4o Mini ou Local?
   ↓
5. Gera resposta contextual
   ↓
6. Salva resposta no Firestore
   ↓
7. Exibe para o usuário
   ↓
8. Limpa mensagens antigas (mantém apenas 10)
```

### Sistema de Fallback

```
Tentativa 1: GPT-4o Mini
  ↓ (falha ou não configurado)
Tentativa 2: Base de Conhecimento Local
  ↓ (não encontrou resposta)
Tentativa 3: Mensagem Genérica
```

## 📁 Estrutura de Arquivos

```
src/
├── core/services/
│   └── ai-assistant.service.ts      # Lógica principal
├── components/ai-assistant/
│   ├── AIAssistant.tsx              # Chat flutuante
│   └── QuickActions.tsx             # Botões de ação rápida
├── hooks/
│   └── useAIAssistant.ts            # Hook personalizado
├── integrations/openai/
│   └── config.ts                    # Configuração OpenAI
└── pages/
    └── AIAssistantPage.tsx          # Página dedicada
```

## 🔐 Segurança

### Dados do Usuário

- ✅ Mensagens armazenadas por usuário no Firestore
- ✅ Isolamento de dados entre usuários
- ✅ Limpeza automática de histórico
- ⚠️ Não armazena dados sensíveis (senhas, tokens)

### API Key

- ⚠️ Atualmente exposta no frontend (apenas para desenvolvimento)
- 🔒 **Produção:** Mover para Firebase Functions
- 🔒 Usar rate limiting por usuário
- 🔒 Implementar caching de respostas

### Recomendações

1. **Não compartilhe API Key**
2. **Configure rate limits no OpenAI**
3. **Use variáveis de ambiente**
4. **Implemente autenticação adequada**

## 📈 Métricas e Monitoramento

### Métricas Disponíveis

- Número de conversas por usuário
- Taxa de uso (local vs GPT)
- Tempo médio de resposta
- Tópicos mais pesquisados

### Logs do Console

```typescript
// Configuração detectada
console.log('🤖 OpenAI API configurada');

// Fallback ativado
console.warn('⚠️ Usando respostas locais');

// Erro na API
console.error('Erro ao chamar OpenAI API:', error);
```

## 🔄 Atualizações Futuras

### Planejado

1. **Function Calling**
   - Permitir que GPT execute ações no sistema
   - Exemplo: "Cadastre um funcionário chamado João"

2. **Embeddings**
   - Busca semântica em documentação
   - Base de conhecimento vetorizada

3. **Streaming**
   - Respostas em tempo real (palavra por palavra)
   - Melhor experiência do usuário

4. **Multi-idioma**
   - Suporte para inglês, espanhol
   - Detecção automática de idioma

5. **Análise de Sentimento**
   - Detectar frustração do usuário
   - Escalar para suporte humano

## 🐛 Troubleshooting

### Chat não abre
- Verifique se está autenticado
- Limpe cache do navegador
- Verifique console para erros

### Respostas muito lentas
- Verifique conexão com internet
- Teste status da OpenAI API
- Use modo local como alternativa

### Respostas incorretas
- Atualize base de conhecimento local
- Melhore system prompt do GPT
- Reporte feedback para melhorias

## 🤝 Contribuindo

Para adicionar novas funcionalidades ao assistente:

1. **Nova Operação:**
   - Edite `systemKnowledge.operations` em `ai-assistant.service.ts`
   - Adicione passos e exemplos

2. **Nova Entidade:**
   - Edite `systemKnowledge.entities`
   - Defina campos e operações

3. **Nova Pergunta Comum:**
   - Edite `systemKnowledge.commonQuestions`
   - Adicione resposta e keywords

4. **Nova Ação Rápida:**
   - Edite `QuickActions.tsx`
   - Adicione botão com título, descrição e ação

## 📞 Suporte

Para dúvidas ou problemas:
- 📧 Email: suporte@optify.com
- 💬 Chat interno: Acesse "Suporte" no menu
- 📖 Documentação: `/docs`

---

**Desenvolvido com ❤️ pela equipe Optify**

