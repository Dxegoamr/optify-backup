# Configuração de Variáveis de Ambiente

> **⚠️ IMPORTANTE**: Para produção, use o [Firebase Secret Manager](./SECRET_MANAGER_SETUP.md). 
> O arquivo `.env` é apenas para desenvolvimento local.

## Arquivo .env (Desenvolvimento Local)

Crie um arquivo `.env` na raiz do projeto com as seguintes variáveis:

```bash
# Firebase Configuration
VITE_FIREBASE_API_KEY=your_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id

# reCAPTCHA v3 for App Check
VITE_RECAPTCHA_SITE_KEY=your_recaptcha_site_key

# Mercado Pago Configuration (apenas para Functions)
MERCADO_PAGO_ACCESS_TOKEN=your_access_token
MERCADO_PAGO_WEBHOOK_SECRET=your_webhook_secret

# Base URL for frontend
BASE_URL_FRONTEND=https://your-domain.com

# Sentry Configuration (opcional)
VITE_SENTRY_DSN=your_sentry_dsn
```

## Configuração do App Check

### 1. Configurar reCAPTCHA v3

1. Acesse o [Google reCAPTCHA Admin Console](https://www.google.com/recaptcha/admin)
2. Crie um novo site com reCAPTCHA v3
3. Adicione seu domínio (ex: `optify-definitivo.web.app`)
4. Copie a chave do site para `VITE_RECAPTCHA_SITE_KEY`

### 2. Configurar no Firebase Console

1. Acesse o Firebase Console → App Check
2. Registre seu app web
3. Configure o provider como "reCAPTCHA v3"
4. Adicione a chave do reCAPTCHA

### 3. Configurar em Produção

```bash
# Definir variáveis de ambiente no Firebase Functions
firebase functions:config:set recaptcha.site_key="your_recaptcha_site_key"
firebase functions:config:set mercadopago.access_token="your_access_token"
firebase functions:config:set mercadopago.webhook_secret="your_webhook_secret"

# Fazer deploy das configurações
firebase deploy --only functions
```

## Desenvolvimento Local

Para desenvolvimento local, o App Check funcionará em modo debug automaticamente. 
Não é necessário configurar reCAPTCHA para desenvolvimento.

## Segurança

- **NUNCA** commite o arquivo `.env` no Git
- **SEMPRE** use o [Firebase Secret Manager](./SECRET_MANAGER_SETUP.md) para produção
- Mantenha as chaves do reCAPTCHA e Mercado Pago seguras
- Rotacione secrets a cada 90 dias
- Audite acessos aos secrets mensalmente

## Produção

Para deploy em produção, consulte:
- [SECRET_MANAGER_SETUP.md](./SECRET_MANAGER_SETUP.md) - Configuração de secrets
- [README_OPERACIONAL.md](./README_OPERACIONAL.md) - Processo de deploy (será criado)
