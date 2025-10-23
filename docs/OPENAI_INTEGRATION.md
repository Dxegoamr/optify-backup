# 🤖 Integração com OpenAI (GPT-4o Mini)

## 📝 Visão Geral

O Assistente AI do Optify agora utiliza o **GPT-4o Mini** da OpenAI para gerar respostas inteligentes e contextuais. O sistema possui fallback automático para respostas locais caso a API não esteja configurada ou disponível.

## 🔑 Configuração da API Key

### 1. Obter API Key da OpenAI

1. Acesse [platform.openai.com](https://platform.openai.com)
2. Faça login ou crie uma conta
3. Navegue até **API Keys**
4. Clique em **Create new secret key**
5. Copie a chave gerada (começa com `sk-`)

### 2. Configurar no Projeto

Crie um arquivo `.env` na raiz do projeto (se não existir) e adicione:

```env
VITE_OPENAI_API_KEY=sk-sua-chave-aqui
```

**⚠️ IMPORTANTE:** 
- Nunca commite o arquivo `.env` no Git
- O arquivo `.env` já está no `.gitignore`
- Use `.env.local` para desenvolvimento local

### 3. Variáveis de Ambiente no Firebase Hosting

Para produção, configure a variável de ambiente no Firebase:

```bash
firebase functions:config:set openai.api_key="sk-sua-chave-aqui"
```

## 🎯 Modelo Utilizado

- **Modelo:** `gpt-4o-mini`
- **Temperatura:** 0.7 (equilíbrio entre criatividade e precisão)
- **Max Tokens:** 500 (respostas concisas)
- **Contexto:** Últimas 5 mensagens + System Prompt

### Por que GPT-4o Mini?

- ✅ **Mais rápido** que GPT-4
- ✅ **Mais econômico** (até 60% mais barato)
- ✅ **Excelente qualidade** para assistentes
- ✅ **Baixa latência** (< 1 segundo)

## 💰 Custos Estimados

### GPT-4o Mini Pricing (2024)
- **Input:** $0.150 por 1M tokens
- **Output:** $0.600 por 1M tokens

### Estimativa de Uso
Considerando uma mensagem típica:
- System Prompt: ~800 tokens
- Contexto (5 mensagens): ~500 tokens
- Pergunta do usuário: ~50 tokens
- Resposta do assistente: ~200 tokens

**Custo por conversa:** ~$0.0009 (menos de 1 centavo)

**Exemplo:** 1000 conversas/mês = ~$0.90/mês

## 🔄 Sistema de Fallback

O assistente possui 3 camadas de resposta:

### 1. **GPT-4o Mini (Primário)**
- Respostas contextuais e inteligentes
- Compreende intenção do usuário
- Adapta-se ao contexto da conversa

### 2. **Respostas Locais (Fallback)**
- Base de conhecimento pré-programada
- 5 operações principais
- 4 tipos de entidades
- 5 perguntas comuns

### 3. **Mensagem Genérica (Último Recurso)**
- Lista de funcionalidades disponíveis
- Convite para fazer perguntas

## 📊 Monitoramento

### Logs do Console

```typescript
// API configurada
console.log('🤖 OpenAI API configurada - Usando GPT-4o Mini');

// Fallback ativado
console.warn('⚠️ VITE_OPENAI_API_KEY não configurada. Usando respostas locais.');

// Erro na API
console.error('Erro ao chamar OpenAI API:', error);
```

### Verificar Status

Você pode verificar se a API está configurada através do código:

```typescript
import { isOpenAIConfigured } from '@/integrations/openai/config';

if (isOpenAIConfigured) {
  console.log('API OpenAI está configurada');
} else {
  console.log('Usando respostas locais');
}
```

## 🛡️ Segurança

### Best Practices Implementadas

1. **API Key no Backend (Recomendado):**
   - Para produção, mova a chamada da API para Firebase Functions
   - Use Cloud Functions para proteger a API key
   - Evite expor a chave no frontend

2. **Rate Limiting:**
   - Implemente rate limiting por usuário
   - Use cache para respostas comuns
   - Configure limites no Firebase Functions

3. **Validação de Input:**
   - Sanitize user input antes de enviar para a API
   - Limite de caracteres por mensagem
   - Filtro de conteúdo inapropriado

### Migração para Backend (Futuro)

```typescript
// Firebase Function
export const chatWithAssistant = onCall(async (request) => {
  const { userId, message } = request.data;
  
  // Validar usuário autenticado
  if (!request.auth) {
    throw new Error('Não autenticado');
  }
  
  // Chamar OpenAI API do backend
  const response = await openai.chat.completions.create({
    // ... configuração
  });
  
  return { response: response.choices[0].message.content };
});
```

## 🧪 Testes

### Testar Localmente (sem API Key)

```bash
# Não configure VITE_OPENAI_API_KEY
npm run dev
```

O assistente usará respostas locais automaticamente.

### Testar com GPT-4o Mini

```bash
# Configure a API Key no .env
echo "VITE_OPENAI_API_KEY=sk-sua-chave" > .env

# Reinicie o servidor
npm run dev
```

### Exemplos de Perguntas

1. **Pergunta Simples:**
   - "Como adicionar um funcionário?"
   - Deve retornar passos detalhados

2. **Pergunta Contextual:**
   - "E como edito ele depois?"
   - Deve entender o contexto da conversa anterior

3. **Pergunta Complexa:**
   - "Qual a diferença entre receita e despesa e como registro cada uma?"
   - Deve explicar conceitos e processos

## 📈 Melhorias Futuras

### 1. **Funções Especializadas**
- Integrar ferramentas do OpenAI (Function Calling)
- Permitir que o GPT execute ações no sistema
- Exemplo: "Cadastre um funcionário chamado João"

### 2. **Embedding e Busca Semântica**
- Usar OpenAI Embeddings para documentação
- Busca inteligente em documentos e tutoriais
- Base de conhecimento vetorizada

### 3. **Streaming de Respostas**
- Implementar streaming para respostas em tempo real
- Melhor UX com respostas progressivas
- Redução da latência percebida

### 4. **Fine-tuning**
- Treinar modelo específico para Optify
- Melhor compreensão de termos específicos
- Respostas mais precisas

## 🔗 Recursos Adicionais

- [OpenAI API Documentation](https://platform.openai.com/docs)
- [GPT-4o Mini Announcement](https://openai.com/index/gpt-4o-mini-advancing-cost-efficient-intelligence/)
- [Best Practices for Production](https://platform.openai.com/docs/guides/production-best-practices)

## 🆘 Troubleshooting

### Erro: "API key not found"
```bash
# Verifique se a variável está definida
echo $VITE_OPENAI_API_KEY

# Reinicie o servidor após adicionar
npm run dev
```

### Erro: "Rate limit exceeded"
```bash
# Aguarde alguns minutos e tente novamente
# Ou aumente o limite no dashboard da OpenAI
```

### Respostas muito lentas
```bash
# Reduza max_tokens para respostas mais rápidas
# Ou use menos contexto (últimas 3 mensagens ao invés de 5)
```

## 📞 Suporte

Para dúvidas sobre a integração:
- Abra uma issue no GitHub
- Contate o time de desenvolvimento
- Consulte a documentação oficial da OpenAI

