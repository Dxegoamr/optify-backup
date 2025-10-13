# 🧪 Testando o Assistente AI Localmente

Este guia mostra como testar o assistente AI com GPT-4o Mini rodando localmente usando o Firebase Emulator.

## 📋 Pré-requisitos

- Node.js instalado
- Firebase CLI instalado (`npm install -g firebase-tools`)
- Firebase Functions Emulator configurado
- Projeto compilado

## 🚀 Passos para Testar

### 1. Instalar Dependências

```bash
# Instalar dependências do frontend
npm install

# Instalar dependências das functions
cd functions
npm install
cd ..
```

### 2. Iniciar o Emulador do Firebase

```bash
# Iniciar APENAS o emulador de Functions
firebase emulators:start --only functions

# OU iniciar todos os emuladores
firebase emulators:start
```

O emulador irá iniciar na porta **5001** por padrão.

Você verá uma saída como:
```
✔  functions: Emulator started at http://localhost:5001
```

### 3. Configurar o Frontend para Usar o Emulador

O código já está configurado para usar o emulador em desenvolvimento. Verifique em `src/integrations/firebase/config.ts`:

```typescript
if (import.meta.env.DEV) {
  connectFunctionsEmulator(functions, 'localhost', 5001);
}
```

### 4. Iniciar o Servidor de Desenvolvimento

Em um **novo terminal**, inicie o frontend:

```bash
npm run dev
```

O servidor iniciará em `http://localhost:8080`

### 5. Testar o Assistente

1. Acesse `http://localhost:8080`
2. Faça login no sistema
3. Clique no ícone 💬 no canto inferior direito
4. Digite uma pergunta, por exemplo:
   - "Como adicionar um funcionário?"
   - "Como funciona o sistema Optify?"
   - "Como registrar uma venda?"

### 6. Verificar Logs

**No terminal do emulador**, você verá os logs da function:

```
🤖 Gerando resposta para usuário: [uid]
✅ Resposta gerada com sucesso para: [uid]
```

**No terminal do frontend**, você verá:

```
✅ Resposta gerada com gpt-4o-mini - Tokens: [número]
```

## 🔍 Verificando o Funcionamento

### Logs Esperados no Emulador

```
i  functions: Beginning execution of "generateAIResponse"
>  🤖 Gerando resposta para usuário: aJtXIIkFyJWPyD9z5jr3aLO27uq2
>  ✅ Resposta gerada com sucesso para: aJtXIIkFyJWPyD9z5jr3aLO27uq2
i  functions: Finished "generateAIResponse" in ~2s
```

### Resposta no Frontend

Você deve ver uma resposta inteligente e contextual do GPT-4o Mini no chat.

## ⚠️ Troubleshooting

### Erro: "Usuário não autenticado"

**Problema:** Você não está logado no sistema.

**Solução:** Faça login antes de usar o assistente.

### Erro: "Error: connect ECONNREFUSED ::1:5001"

**Problema:** O emulador não está rodando.

**Solução:**
```bash
firebase emulators:start --only functions
```

### Erro: "OpenAI API Error"

**Problema:** A API key pode estar incorreta ou sem créditos.

**Solução:** 
- Verifique a chave em `functions/src/ai/assistant.ts`
- Verifique créditos na conta OpenAI: https://platform.openai.com/usage

### Fallback para Respostas Locais

Se houver erro na OpenAI API, o sistema automaticamente usará respostas locais pré-programadas:

```
📝 Usando resposta local como fallback
```

## 📊 Monitoramento

### Ver Uso de Tokens

O uso de tokens é logado no console:

```javascript
console.log(`✅ Resposta gerada com ${model} - Tokens: ${totalTokens}`);
```

### Custos por Requisição

Com GPT-4o mini:
- Input: $0.150 por 1M tokens
- Output: $0.600 por 1M tokens
- Média: ~800 tokens por conversa
- **Custo por conversa: ~$0.0009**

## 🧪 Testes Sugeridos

### 1. Teste Básico
```
Pergunta: "Como funciona o sistema?"
Esperado: Resposta sobre funcionalidades do Optify
```

### 2. Teste Contextual
```
Pergunta 1: "Como adicionar um funcionário?"
Pergunta 2: "E como edito depois?"
Esperado: Segunda resposta entende contexto da primeira
```

### 3. Teste de Operação Específica
```
Pergunta: "Como registrar uma venda?"
Esperado: Passos detalhados para registro de transação
```

### 4. Teste de Erro (Rate Limit)
```
Faça múltiplas requisições rápidas
Esperado: Mensagem de rate limit após limite excedido
```

### 5. Teste de Fallback
```
Desative o emulador
Faça uma pergunta
Esperado: Resposta local (pré-programada)
```

## 📝 Comandos Úteis

```bash
# Ver logs do emulador em tempo real
firebase emulators:start --only functions --inspect-functions

# Limpar cache do emulador
firebase emulators:start --only functions --import=./emulator-data --export-on-exit

# Parar o emulador
Ctrl + C no terminal do emulador
```

## 🔐 Segurança em Testes

### Dados Sensíveis

- ✅ API key NÃO está exposta no frontend
- ✅ API key está apenas em `functions/src/ai/assistant.ts`
- ✅ Todas as requisições requerem autenticação
- ✅ User ID é enviado junto com cada requisição

### Autenticação

O sistema verifica:
```typescript
if (!request.auth) {
  throw new HttpsError('unauthenticated', 'Usuário não autenticado');
}
```

## 🚀 Próximos Passos

Depois de testar localmente e confirmar que tudo funciona:

```bash
# Deploy apenas da função do AI
firebase deploy --only functions:generateAIResponse

# OU deploy completo das functions
firebase deploy --only functions
```

## 📞 Suporte

Se encontrar problemas:

1. Verifique os logs do emulador
2. Verifique o console do navegador (F12)
3. Consulte a documentação: `docs/OPENAI_INTEGRATION.md`
4. Verifique status da OpenAI: https://status.openai.com/

---

**Bons testes! 🎉**

