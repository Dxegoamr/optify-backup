# 🔐 Configuração da OpenAI API Key

## 📋 Opções de Configuração

### 1. Variável de Ambiente (Desenvolvimento Local)

Crie um arquivo `.env` na pasta `functions/`:

```env
OPENAI_API_KEY=sk-proj-sua-chave-aqui
```

**⚠️ IMPORTANTE:** O arquivo `.env` já está no `.gitignore` e NUNCA deve ser commitado!

### 2. Firebase Functions Config (Produção)

```bash
# Configurar a chave
firebase functions:config:set openai.key="sk-proj-sua-chave-aqui"

# Verificar configuração
firebase functions:config:get

# Aplicar ao emulador local
firebase functions:config:get > functions/.runtimeconfig.json
```

### 3. Secret Manager (Recomendado para Produção)

```bash
# Criar secret
echo "sk-proj-sua-chave-aqui" | gcloud secrets create openai-api-key --data-file=-

# Dar acesso à função
gcloud secrets add-iam-policy-binding openai-api-key \
  --member="serviceAccount:YOUR-PROJECT@appspot.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

## 🧪 Testando Localmente

### Com Arquivo .env:

1. Crie `functions/.env`:
   ```env
   OPENAI_API_KEY=sk-proj-sua-chave-aqui
   ```

2. Instale dotenv:
   ```bash
   cd functions
   npm install dotenv
   ```

3. Inicie o emulador:
   ```bash
   firebase emulators:start --only functions
   ```

### Com Firebase Config:

```bash
# Baixar config
firebase functions:config:get > functions/.runtimeconfig.json

# Iniciar emulador
firebase emulators:start --only functions
```

## 🚀 Deploy para Produção

```bash
# Configurar a chave (uma vez apenas)
firebase functions:config:set openai.key="sk-proj-sua-chave-aqui"

# Deploy
firebase deploy --only functions
```

## 📊 Verificar Uso

Acesse: https://platform.openai.com/usage

## 🔒 Segurança

✅ **O que fazer:**
- Usar variáveis de ambiente
- Usar Firebase Config ou Secret Manager
- Manter chave apenas no servidor

❌ **O que NÃO fazer:**
- Commitar chave no código
- Expor chave no frontend
- Compartilhar chave publicamente

## 🆘 Troubleshooting

### Erro: "Invalid API key"

**Solução:** Verifique se a chave está correta e tem créditos disponíveis.

### Erro: "API key not found"

**Solução:** Configure usando um dos métodos acima.

### Emulador não encontra a chave

**Solução:** Use arquivo `.runtimeconfig.json`:
```bash
firebase functions:config:get > functions/.runtimeconfig.json
```

