# 🚀 Quick Start - Testar IA Localmente

## ⚡ Setup Rápido (5 minutos)

### 1. Configure a API Key da OpenAI

Crie o arquivo `functions/.env`:

```bash
echo OPENAI_API_KEY=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 > functions/.env
```

### 2. Inicie os Emuladores

**Terminal 1:**
```bash
firebase emulators:start --only functions
```

Aguarde ver:
```
✔  functions: Emulator started at http://localhost:5001
```

### 3. Inicie o Frontend

**Terminal 2:**
```bash
npm run dev
```

### 4. Teste!

1. Acesse `http://localhost:8080`
2. Faça login
3. Clique no ícone 💬 no canto inferior direito
4. Teste os comandos abaixo

## 🧪 Comandos para Testar

### ✅ Testes de Ações no Sistema

```
"depositei 300 na conta do diego"
"fiz deposito de 500 na betano do joão"
"saquei 200 do diego"
"tirei 100 da conta do joão"
"feche o dia"
"fechar o dia de hoje"
"qual o saldo do diego?"
"paguei 500 de aluguel"
"listar funcionários"
```

### ✅ Testes de IA Geral

```
"o que é inteligência artificial?"
"qual a capital da França?"
"me explica blockchain"
"conte uma piada"
"quanto é 25 x 47?"
"me ajuda com matemática"
"o que você pode fazer?"
```

### ✅ Testes Contextuais

```
Você: "qual o saldo do diego?"
AI: "Saldo: R$ 1.500,00"
Você: "e do joão?"
AI: [entende contexto e consulta saldo do joão]
```

## 🔍 Verificar se Funcionou

### No Terminal do Emulador:

```
🤖 Gerando resposta para usuário: [uid]
🔧 GPT decidiu chamar 1 function(s)
⚙️ Executando: registrar_deposito { valor: 300, funcionario_nome: 'diego' }
🔍 Buscando funcionário: diego
✅ Funcionário encontrado: Diego
✅ Function registrar_deposito executada: true
✅ Resposta gerada com sucesso
```

### No Console do Navegador (F12):

```
✅ Resposta gerada com gpt-4o-mini - Tokens: 234
```

### No Chat:

```
✅ Depósito registrado com sucesso!

💰 Valor: R$ 300,00
👤 Funcionário: Diego
🏦 Plataforma: betano
📝 ID da transação: tx_abc123

O saldo do Diego foi atualizado!
```

## 🎯 O Que Testar

### 1. Depósitos
- [ ] Depósito simples
- [ ] Depósito com plataforma
- [ ] Depósito com nome parcial
- [ ] Funcionário não encontrado

### 2. Saques
- [ ] Saque com saldo suficiente
- [ ] Saque com saldo insuficiente
- [ ] Saque de funcionário específico

### 3. Fechamento
- [ ] Fechar dia atual
- [ ] Ver totais calculados

### 4. Consultas
- [ ] Saldo de funcionário
- [ ] Saldo total
- [ ] Listar funcionários

### 5. IA Geral
- [ ] Pergunta sobre tecnologia
- [ ] Pergunta sobre ciência
- [ ] Piada ou conversa casual

## ⚠️ Troubleshooting

### "Funcionário não encontrado"

**Problema:** Funcionário não cadastrado.

**Solução:**
1. Digite: "listar funcionários"
2. Use um nome da lista
3. Ou cadastre o funcionário primeiro

### Emulador não conecta

**Problema:** Emulador não está rodando.

**Solução:**
```bash
firebase emulators:start --only functions
```

### "API key not found"

**Problema:** Arquivo `.env` não criado.

**Solução:**
```bash
echo OPENAI_API_KEY=sua-chave > functions/.env
```

## 📊 Logs Úteis

### Ver todos os logs:
```bash
firebase emulators:start --only functions --inspect-functions
```

### Ver logs específicos:
No console do navegador (F12) → Console

## 🎉 Próximo Passo

Se tudo funcionar localmente:
```bash
firebase deploy --only functions
```

---

**Documentação completa:** `docs/AI_FUNCTION_CALLING.md`

**Bons testes! 🚀**

