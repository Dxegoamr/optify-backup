# Configuração do Firebase Secret Manager

## Visão Geral

Este projeto utiliza o Firebase Secret Manager para armazenar segredos sensíveis de forma segura. **Nunca** adicione secrets diretamente no código ou em variáveis de ambiente não criptografadas.

## Secrets Configurados

### 1. `MERCADO_PAGO_ACCESS_TOKEN`
- **Descrição**: Token de acesso à API do Mercado Pago
- **Usado em**: `functions/src/mercadopago.ts`, `functions/src/webhooks/mercado-pago.ts`
- **Formato**: `APP_USR-XXXXXXXXXXXXXXXX-XXXXXX-XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX-XXXXXXXXX`

### 2. `MERCADO_PAGO_WEBHOOK_SECRET`
- **Descrição**: Segredo para verificação HMAC de webhooks do Mercado Pago
- **Usado em**: `functions/src/webhooks/mercado-pago.ts`
- **Formato**: String alfanumérica

### 3. `BASE_URL_FRONTEND`
- **Descrição**: URL base do frontend para callbacks de pagamento
- **Usado em**: `functions/src/mercadopago.ts`
- **Formato**: `https://your-domain.com`

### 4. `SENTRY_DSN`
- **Descrição**: Data Source Name do Sentry para monitoramento de erros
- **Usado em**: `functions/src/observability/sentry.ts`
- **Formato**: `https://xxxxx@sentry.io/xxxxx`

## Como Configurar os Secrets

### Passo 1: Habilitar o Secret Manager no projeto

```bash
# Habilitar a API do Secret Manager
gcloud services enable secretmanager.googleapis.com --project=optify-definitivo

# Garantir que o Firebase Functions tem permissão
gcloud projects add-iam-policy-binding optify-definitivo \
  --member=serviceAccount:optify-definitivo@appspot.gserviceaccount.com \
  --role=roles/secretmanager.secretAccessor
```

### Passo 2: Criar os secrets

```bash
# Secret 1: Token do Mercado Pago
echo -n "APP_USR-YOUR_TOKEN_HERE" | \
  gcloud secrets create MERCADO_PAGO_ACCESS_TOKEN \
  --data-file=- \
  --project=optify-definitivo

# Secret 2: Webhook Secret do Mercado Pago
echo -n "your-webhook-secret-here" | \
  gcloud secrets create MERCADO_PAGO_WEBHOOK_SECRET \
  --data-file=- \
  --project=optify-definitivo

# Secret 3: URL base do frontend
echo -n "https://optify-definitivo.web.app" | \
  gcloud secrets create BASE_URL_FRONTEND \
  --data-file=- \
  --project=optify-definitivo

# Secret 4: Sentry DSN
echo -n "https://xxxxx@sentry.io/xxxxx" | \
  gcloud secrets create SENTRY_DSN \
  --data-file=- \
  --project=optify-definitivo
```

### Passo 3: Dar acesso às Functions

```bash
# Conceder acesso de leitura aos secrets
gcloud secrets add-iam-policy-binding MERCADO_PAGO_ACCESS_TOKEN \
  --member=serviceAccount:optify-definitivo@appspot.gserviceaccount.com \
  --role=roles/secretmanager.secretAccessor \
  --project=optify-definitivo

gcloud secrets add-iam-policy-binding MERCADO_PAGO_WEBHOOK_SECRET \
  --member=serviceAccount:optify-definitivo@appspot.gserviceaccount.com \
  --role=roles/secretmanager.secretAccessor \
  --project=optify-definitivo

gcloud secrets add-iam-policy-binding BASE_URL_FRONTEND \
  --member=serviceAccount:optify-definitivo@appspot.gserviceaccount.com \
  --role=roles/secretmanager.secretAccessor \
  --project=optify-definitivo

gcloud secrets add-iam-policy-binding SENTRY_DSN \
  --member=serviceAccount:optify-definitivo@appspot.gserviceaccount.com \
  --role=roles/secretmanager.secretAccessor \
  --project=optify-definitivo
```

### Passo 4: Configurar no firebase.json

O arquivo `firebase.json` já está configurado para usar secrets. Veja a seção `functions[0].predeploy`.

### Passo 5: Usar nos Cloud Functions

```typescript
// As variáveis de ambiente já estarão disponíveis automaticamente
const MP_ACCESS_TOKEN = process.env.MERCADO_PAGO_ACCESS_TOKEN;
const MP_WEBHOOK_SECRET = process.env.MERCADO_PAGO_WEBHOOK_SECRET;
const BASE_URL = process.env.BASE_URL_FRONTEND;
const SENTRY_DSN = process.env.SENTRY_DSN;
```

## Desenvolvimento Local

### Usando o Emulador

Para desenvolvimento local, crie um arquivo `.env` na pasta `functions/`:

```bash
# functions/.env
MERCADO_PAGO_ACCESS_TOKEN=APP_USR-test-token
MERCADO_PAGO_WEBHOOK_SECRET=test-webhook-secret
BASE_URL_FRONTEND=http://localhost:8080
SENTRY_DSN=https://test@sentry.io/test
```

**IMPORTANTE**: Este arquivo está no `.gitignore` e **NUNCA** deve ser commitado.

### Testando Localmente

```bash
# Iniciar emuladores com variáveis de ambiente
firebase emulators:start --import=./.emulator-data
```

## Rotação de Secrets

### Quando rotacionar:

1. **Imediatamente** se houver suspeita de vazamento
2. A cada 90 dias (boa prática)
3. Quando um desenvolvedor sair da equipe
4. Após mudanças críticas na infraestrutura

### Como rotacionar:

```bash
# 1. Criar nova versão do secret
echo -n "NEW_TOKEN_HERE" | \
  gcloud secrets versions add MERCADO_PAGO_ACCESS_TOKEN \
  --data-file=- \
  --project=optify-definitivo

# 2. Verificar versões
gcloud secrets versions list MERCADO_PAGO_ACCESS_TOKEN \
  --project=optify-definitivo

# 3. Fazer redeploy das functions
firebase deploy --only functions

# 4. Verificar logs para confirmar que está funcionando
firebase functions:log

# 5. Destruir versão antiga (após confirmação)
gcloud secrets versions destroy <VERSION_NUMBER> \
  --secret=MERCADO_PAGO_ACCESS_TOKEN \
  --project=optify-definitivo
```

## Monitoramento de Acesso

### Ver quem acessou os secrets:

```bash
# Logs de acesso ao secret
gcloud logging read "resource.type=secret_manager_secret AND resource.labels.secret_id=MERCADO_PAGO_ACCESS_TOKEN" \
  --limit=50 \
  --project=optify-definitivo \
  --format=json
```

### Alertas (recomendado):

Configure alertas no Cloud Monitoring para:
- Acesso negado a secrets
- Número anormal de acessos
- Tentativas de acesso de IPs desconhecidos

## Troubleshooting

### Erro: "Secret not found"

```bash
# Verificar se o secret existe
gcloud secrets list --project=optify-definitivo

# Se não existir, criar conforme Passo 2
```

### Erro: "Permission denied"

```bash
# Verificar permissões do service account
gcloud secrets get-iam-policy MERCADO_PAGO_ACCESS_TOKEN \
  --project=optify-definitivo

# Adicionar permissão se necessário (Passo 3)
```

### Erro: "Environment variable not set"

```bash
# Verificar deploy das functions
firebase deploy --only functions --debug

# Verificar logs
firebase functions:log --limit 50
```

## Custos

O Secret Manager tem custos mínimos:
- **Armazenamento**: $0.06 por secret/mês
- **Acessos**: $0.03 por 10.000 acessos
- **Rotações**: Sem custo adicional

Para este projeto (4 secrets, ~100k acessos/mês):
- **Custo estimado**: ~$0.50/mês

## Segurança

### ✅ O que FAZER:

- ✅ Usar Secret Manager para todos os segredos
- ✅ Rotacionar secrets regularmente
- ✅ Auditar acessos mensalmente
- ✅ Usar princípio do menor privilégio
- ✅ Documentar mudanças

### ❌ O que NÃO fazer:

- ❌ Commitar secrets no código
- ❌ Logar secrets em console
- ❌ Compartilhar secrets via Slack/email
- ❌ Usar secrets de produção em desenvolvimento
- ❌ Deixar secrets em arquivos de configuração

## Checklist de Deploy

Antes de fazer deploy em produção:

- [ ] Todos os secrets estão no Secret Manager
- [ ] Nenhum token hardcoded no código
- [ ] Service account tem permissões corretas
- [ ] Secrets testados no emulador
- [ ] Logs não exibem valores de secrets
- [ ] Alertas de segurança configurados
- [ ] Documentação atualizada
- [ ] Equipe treinada sobre rotação

## Referências

- [Firebase Secret Manager Documentation](https://firebase.google.com/docs/functions/config-env?hl=pt-br#secret-manager)
- [Google Secret Manager Best Practices](https://cloud.google.com/secret-manager/docs/best-practices)
- [Security Best Practices](https://cloud.google.com/security/best-practices)
