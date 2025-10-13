# 🤖 AI Function Calling - Guia Completo

## 📖 O Que É?

O assistente AI agora pode **executar ações reais** no sistema através de linguagem natural! Não é mais apenas um chatbot de ajuda - ele pode registrar transações, fechar o dia, consultar saldos e muito mais.

## ✨ Funcionalidades Disponíveis

### 1. 💰 Registrar Depósitos

**Exemplos de comandos:**
```
"depositei 300 na conta do diego"
"fiz um deposito na betano do joão de 500"
"recebi 1000 reais do diego"
"transferi 250 para o João na bet365"
```

**O que acontece:**
- ✅ Registra transação de receita no Firestore
- ✅ Atualiza saldo do funcionário
- ✅ Associa à plataforma (se mencionada)
- ✅ Retorna confirmação com ID da transação

### 2. 📊 Fechar o Dia

**Exemplos de comandos:**
```
"feche o dia"
"fechar o dia atual"
"fazer fechamento do dia"
"encerrar o dia de hoje"
"fechar dia de ontem"
```

**O que acontece:**
- ✅ Calcula total de receitas do dia
- ✅ Calcula total de despesas do dia
- ✅ Calcula saldo final
- ✅ Salva fechamento no Firestore
- ✅ Retorna resumo completo

### 3. 💸 Registrar Despesas

**Exemplos de comandos:**
```
"registrar despesa de 100 em aluguel"
"paguei 500 de conta de luz"
"despesa de 250 reais em marketing"
```

**O que acontece:**
- ✅ Registra transação de despesa
- ✅ Categoriza automaticamente
- ✅ Retorna confirmação

### 4. 💰 Consultar Saldos

**Exemplos de comandos:**
```
"qual o saldo do diego?"
"quanto tem o joão?"
"qual o saldo total?"
"saldo de hoje"
"saldo da semana"
```

**O que acontece:**
- ✅ Consulta saldo do funcionário ou total
- ✅ Filtra por período (hoje, semana, mês, ano)
- ✅ Retorna valores formatados

### 5. 👥 Listar Funcionários

**Exemplos de comandos:**
```
"listar funcionários"
"quem são os colaboradores?"
"mostrar funcionários ativos"
```

**O que acontece:**
- ✅ Lista todos os funcionários cadastrados
- ✅ Mostra nome, cargo e status
- ✅ Pode filtrar apenas ativos

## 🔄 Como Funciona

### Fluxo de Execução

```
1. Usuário envia mensagem
   ↓
2. GPT-4o mini analisa a intenção
   ↓
3. GPT decide se precisa executar ação
   ↓
4. Se SIM: chama function apropriada
   ↓
5. Backend executa ação no Firestore
   ↓
6. Resultado volta para o GPT
   ↓
7. GPT gera resposta amigável
   ↓
8. Usuário recebe confirmação
```

### Exemplo Prático

**Entrada do usuário:**
```
"depositei 300 na conta do diego na betano"
```

**Processo interno:**
```typescript
// 1. GPT detecta intenção
Função: registrar_deposito
Parâmetros: {
  valor: 300,
  funcionario_nome: "diego",
  plataforma: "betano"
}

// 2. Backend executa
- Busca funcionário "diego"
- Cria transação no Firestore
- Atualiza saldo do Diego
- Retorna sucesso

// 3. GPT formata resposta
"✅ Depósito registrado com sucesso!
💰 Valor: R$ 300,00
👤 Funcionário: Diego
🏦 Plataforma: betano
📝 ID da transação: abc123"
```

## 💡 Dicas de Uso

### Seja Natural

❌ **Não precisa:**
```
"executar função registrar_deposito com valor 300"
```

✅ **Pode ser simples:**
```
"depositei 300 pro diego"
```

### Variações Aceitas

O GPT entende diversas formas de expressar a mesma coisa:

**Para depósitos:**
- "depositei", "fiz deposito", "transferi", "recebi", "entrada de"

**Para fechar dia:**
- "feche o dia", "encerrar dia", "fazer fechamento", "finalizar dia"

**Para consultar saldo:**
- "qual o saldo", "quanto tem", "valor disponível", "quanto está"

### Contexto Conversacional

O GPT lembra das mensagens anteriores:

```
Você: "qual o saldo do diego?"
AI: "O saldo do Diego é R$ 1.500,00"

Você: "e do joão?"
AI: [entende que você quer saldo do joão]
```

## 🎯 Exemplos Completos

### Registro de Depósito Completo

```
👤 Usuário: "depositei 500 reais na bet365 do joão"

🤖 GPT internamente:
   - Detecta: registrar_deposito
   - Extrai: valor=500, funcionario="joão", plataforma="bet365"
   - Executa no Firestore
   
🤖 AI responde:
   "✅ Depósito registrado com sucesso!
    
    💰 Valor: R$ 500,00
    👤 Funcionário: João Silva
    🏦 Plataforma: bet365
    📝 ID da transação: tx_abc123xyz
    
    O saldo atual do João foi atualizado!"
```

### Fechamento de Dia

```
👤 Usuário: "feche o dia de hoje"

🤖 GPT internamente:
   - Detecta: fechar_dia
   - Extrai: data=hoje
   - Busca transações do dia
   - Calcula totais
   - Salva fechamento
   
🤖 AI responde:
   "✅ Dia fechado com sucesso!
    
    📅 Data: 13/10/2025
    💰 Receitas: R$ 5.300,00
    💸 Despesas: R$ 1.200,00
    📊 Saldo: R$ 4.100,00
    📝 Transações: 23
    
    Fechamento salvo no sistema!"
```

## 🔍 Solução de Problemas

### "Funcionário não encontrado"

**Problema:** Nome do funcionário não está cadastrado ou foi digitado errado.

**Solução:**
1. Verifique o nome: "listar funcionários"
2. Cadastre o funcionário se necessário
3. Use o nome exato como aparece no sistema

### "Erro ao executar ação"

**Problema:** Erro de permissão ou conexão com o banco.

**Solução:**
1. Verifique se está autenticado
2. Verifique conexão com internet
3. Tente novamente em alguns segundos

### GPT não executou a ação

**Problema:** Comando muito vago ou mal formulado.

**Solução:**
Seja mais específico:
- ❌ "fazer algo com diego"
- ✅ "consultar saldo do diego"

## 📊 Limites e Considerações

### Rate Limiting

- Limite de requisições por minuto (configurável)
- Timeout de 60 segundos por requisição
- Fallback automático em caso de erro

### Custos

**Por ação executada:**
- ~1000-1500 tokens (depósito simples)
- Custo: ~$0.0015 por ação
- 1000 ações/mês = ~$1.50

### Segurança

- ✅ Autenticação obrigatória
- ✅ Validação de input
- ✅ User tracking
- ✅ Audit logs automáticos

## 🚀 Melhorias Futuras

### Em Desenvolvimento

1. **Cadastrar Funcionário** via AI
2. **Editar Transação** existente
3. **Gerar Relatórios** customizados
4. **Configurar Metas** via chat
5. **Análise Inteligente** de dados

### Sugestões de Uso

```
"cadastre um funcionário chamado Pedro no cargo de vendedor"
"edite a transação tx_123 mudando o valor para 400"
"gere um relatório de vendas do último mês"
"defina uma meta de 10000 reais para este mês"
"como estão as vendas comparadas ao mês passado?"
```

## 📞 Suporte

Para dúvidas ou problemas:
- 📧 Email: suporte@optify.com
- 💬 Chat: Pergunte ao próprio assistente AI!
- 📖 Docs: `/docs`

---

**Desenvolvido com ❤️ e GPT-4o mini pela equipe Optify**

