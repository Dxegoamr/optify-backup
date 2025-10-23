# README Operacional - Optify Core Engine

> 🚀 Guia completo para setup, desenvolvimento, deploy e troubleshooting do projeto Optify

## 📋 Índice

1. [Setup Local](#setup-local)
2. [Scripts Disponíveis](#scripts-disponíveis)
3. [Arquitetura](#arquitetura)
4. [Fluxo de Deploy](#fluxo-de-deploy)
5. [Troubleshooting](#troubleshooting)
6. [Monitoramento](#monitoramento)
7. [Segurança](#segurança)

---

## 🛠️ Setup Local

### Pré-requisitos

- Node.js 20+ 
- npm 10+
- Firebase CLI (`npm install -g firebase-tools`)
- Git

### Passo a Passo

```bash
# 1. Clonar repositório
git clone https://github.com/Dxegoamr/optify-core-engine.git
cd optify-core-engine

# 2. Instalar dependências do frontend
npm install

# 3. Instalar dependências das Functions
cd functions
npm install
cd ..

# 4. Configurar variáveis de ambiente
cp .env.example .env
# Editar .env com suas credenciais (ver ENV_SETUP.md)

# 5. Fazer login no Firebase
firebase login

# 6. Selecionar projeto
firebase use optify-definitivo

# 7. Iniciar emuladores (desenvolvimento local)
npm run emulate
# OU
firebase emulators:start --import=./.emulator-data --export-on-exit

# 8. Em outro terminal, iniciar dev server
npm run dev
```

### Acesso Local

- **Frontend**: http://localhost:8080
- **Emulator UI**: http://localhost:4000
- **Functions**: http://localhost:5001
- **Firestore**: http://localhost:8080

---

## 📜 Scripts Disponíveis

### Frontend

```bash
# Desenvolvimento
npm run dev                    # Inicia servidor de desenvolvimento (porta 8080)
npm run preview                # Preview do build de produção

# Build
npm run build                  # Build para produção
npm run build:dev              # Build em modo desenvolvimento

# Qualidade de Código
npm run lint                   # Rodar ESLint
npm run typecheck              # Verificar tipos TypeScript

# Testes
npm run test                   # Rodar testes unitários
npm run test:ui                # Interface visual dos testes
npm run test:coverage          # Testes com coverage
npm run test:watch             # Modo watch
npm run test:e2e               # Testes end-to-end
npm run test:e2e:ui            # E2E com interface
npm run test:a11y              # Testes de acessibilidade
npm run lighthouse             # Análise de performance e a11y

# Deploy
npm run deploy                 # Deploy completo
npm run deploy:staging         # Deploy para staging
npm run deploy:production      # Deploy para produção
```

### Functions

```bash
cd functions

# Desenvolvimento
npm run serve                  # Serve functions localmente
npm run shell                  # Shell interativo
npm run build                  # Compilar TypeScript
npm run build:watch            # Compilar em modo watch

# Qualidade
npm run lint                   # ESLint

# Deploy
npm run deploy                 # Deploy apenas functions
firebase deploy --only functions
```

---

## 🏗️ Arquitetura

### Estrutura de Diretórios

```
optify-core-engine/
├── src/                          # Frontend React + TypeScript
│   ├── components/               # Componentes React
│   │   ├── ui/                   # shadcn/ui components
│   │   ├── admin/                # Componentes admin
│   │   ├── dashboard/            # Componentes dashboard
│   │   ├── layout/               # Layouts (DashboardLayout, etc)
│   │   └── settings/             # Componentes de configurações
│   ├── core/
│   │   ├── services/             # Serviços de negócio
│   │   └── bootstrap/            # Inicialização
│   ├── hooks/                    # Custom hooks
│   ├── contexts/                 # React contexts
│   ├── integrations/             # Integrações (Firebase, etc)
│   ├── observability/            # Sentry, monitoring
│   ├── routes/                   # Route guards
│   ├── pages/                    # Páginas da aplicação
│   ├── test/                     # Utilitários de teste
│   └── types/                    # TypeScript types
│
├── functions/                    # Cloud Functions
│   ├── src/
│   │   ├── security/             # Custom claims, auth
│   │   ├── webhooks/             # Webhook handlers
│   │   ├── stats/                # Agregações de métricas
│   │   ├── auth/                 # Funções de autenticação
│   │   ├── lgpd/                 # Exportação/exclusão de dados
│   │   ├── middleware/           # Rate limiter, request-id
│   │   ├── validation/           # Schemas Zod
│   │   ├── observability/        # Sentry backend
│   │   └── scheduled/            # Scheduled functions
│   └── package.json
│
├── e2e/                          # Testes end-to-end (Playwright)
├── public/                       # Assets estáticos
├── .github/workflows/            # CI/CD
├── firestore.rules               # Regras de segurança
├── firestore.indexes.json        # Índices do Firestore
├── firebase.json                 # Configuração do Firebase
├── vite.config.ts                # Configuração do Vite
├── vitest.config.ts              # Configuração de testes
├── playwright.config.ts          # Configuração E2E
└── .lighthouserc.json            # Configuração Lighthouse CI
```

### Stack Tecnológico

**Frontend:**
- React 18 + TypeScript
- Vite (build tool)
- Tailwind CSS + shadcn/ui
- React Query
- React Router v6
- Lucide React (ícones)

**Backend:**
- Firebase Authentication
- Firebase Firestore
- Firebase Cloud Functions
- Firebase Hosting
- Firebase Storage

**Integrações:**
- Mercado Pago (pagamentos)
- Sentry (monitoramento)
- reCAPTCHA v3 (App Check)

**DevOps:**
- GitHub Actions (CI/CD)
- Vitest (testes unitários)
- Playwright (testes E2E)
- Lighthouse CI (performance/a11y)

---

## 🚀 Fluxo de Deploy

### Deploy para Staging

```bash
# 1. Criar branch de feature
git checkout -b feature/nova-funcionalidade

# 2. Fazer alterações e commitar
git add .
git commit -m "feat: adicionar nova funcionalidade"

# 3. Push para repositório
git push origin feature/nova-funcionalidade

# 4. Abrir Pull Request no GitHub
# O CI vai executar automaticamente:
# - Lint + Typecheck
# - Testes unitários + E2E
# - Build
# - Lighthouse CI
# - Deploy preview (se configurado)

# 5. Após aprovação, merge para develop
# Deploy automático para staging via GitHub Actions
```

### Deploy para Produção

```bash
# 1. Merge develop -> main
git checkout main
git merge develop
git push origin main

# 2. CI/CD vai:
# - Executar todos os checks
# - Build de produção
# - Deploy para Firebase Hosting + Functions
# - Criar release tag
# - Notificar equipe (se configurado)

# 3. Verificar deploy
firebase hosting:channel:list
firebase functions:log --limit 50

# 4. Monitorar Sentry
# Acessar https://sentry.io/projects/optify
```

### Deploy Manual (emergência)

```bash
# Build
npm run build

# Deploy completo
firebase deploy

# Deploy específico
firebase deploy --only hosting          # Apenas frontend
firebase deploy --only functions        # Apenas functions
firebase deploy --only firestore:rules  # Apenas regras
```

---

## 🔧 Troubleshooting

### Problema: Erros de autenticação

**Sintomas**: Usuário não consegue fazer login

**Verificações**:
1. Verificar se Firebase Auth está configurado
2. Verificar se usuário existe no console do Firebase
3. Verificar logs de erro no console do navegador
4. Verificar Custom Claims do usuário

```bash
# Ver logs do Auth
firebase auth:users:list

# Ver detalhes de usuário específico
firebase auth:users:get user@example.com
```

**Solução**:
- Verificar se email/senha estão corretos
- Resetar senha se necessário
- Verificar se conta não está desabilitada

### Problema: Pagamento não está sendo processado

**Sintomas**: Webhook não atualiza plano do usuário

**Verificações**:
1. Verificar logs do webhook
2. Verificar se HMAC está correto
3. Verificar se transação foi criada
4. Verificar rate limiting

```bash
# Ver logs de functions
firebase functions:log --only mercadoPagoWebhook --limit 100

# Ver transações pendentes
# (via Firestore console ou admin panel)
```

**Solução**:
- Verificar se webhook_secret está correto
- Reenviar webhook manualmente via Mercado Pago
- Executar reconciliador manualmente
- Verificar se IP não está na blacklist

### Problema: Firestore Rules bloqueando operação

**Sintomas**: Erro "permission-denied" no console

**Verificações**:
1. Verificar regras no firestore.rules
2. Verificar Custom Claims do usuário
3. Verificar App Check
4. Verificar estrutura do documento

```bash
# Testar regras localmente
firebase emulators:start --only firestore
# Usar Rules Playground no Emulator UI (localhost:4000)
```

**Solução**:
- Atualizar Custom Claims se necessário
- Verificar estrutura de dados (ownerId, etc)
- Garantir que App Check está funcionando
- Verificar se regras de desenvolvimento foram removidas

### Problema: Build falhando

**Sintomas**: `npm run build` retorna erro

**Verificações**:
1. Verificar erros de TypeScript
2. Verificar imports quebrados
3. Verificar dependências

```bash
# Limpar node_modules e reinstalar
rm -rf node_modules package-lock.json
npm install

# Verificar tipos
npm run typecheck

# Ver erros detalhados
npm run build -- --debug
```

**Solução**:
- Corrigir erros de tipo
- Atualizar dependências quebradas
- Limpar cache do Vite: `rm -rf .vite`

### Problema: Service Worker causando problemas

**Sintomas**: Versão antiga do app sendo servida

**Solução**:

```javascript
// No console do navegador:
navigator.serviceWorker.getRegistrations().then(registrations => {
  registrations.forEach(reg => reg.unregister());
});

// Ou limpar cache via Settings → Privacy
```

---

## 📊 Monitoramento

### Sentry

**Acessar**: https://sentry.io/organizations/optify/projects/

**O que monitorar**:
- Taxa de erros (< 0.5%)
- Tempo de resposta das Functions
- Erros de autenticação
- Falhas de pagamento

**Alertas configurados**:
- Spike de erros (> 10 em 5min)
- Function timeout
- Erro crítico em pagamento

### Firebase Console

**Acessar**: https://console.firebase.google.com/project/optify-definitivo

**O que monitorar**:
- Uso de Firestore (reads/writes)
- Execuções de Functions
- Custos (billing)
- Quotas

### Logs

```bash
# Ver logs em tempo real
firebase functions:log

# Ver logs específicos de uma function
firebase functions:log --only mercadoPagoWebhook

# Ver logs de erro
firebase functions:log --only errors

# Filtrar por período
firebase functions:log --since 2h
```

---

## 🔒 Segurança

### Checklist Pré-Deploy

- [ ] Nenhum secret hardcoded
- [ ] Firestore Rules atualizadas
- [ ] App Check configurado
- [ ] Rate limiting ativo
- [ ] Sentry configurado
- [ ] Headers de segurança configurados
- [ ] Testes passando
- [ ] Coverage > 80%

### Rotação de Secrets

**Frequência**: A cada 90 dias ou imediatamente se houver suspeita de vazamento

**Processo**:
1. Gerar novo secret no Mercado Pago
2. Atualizar no Secret Manager: `gcloud secrets versions add ...`
3. Redesploy das Functions: `firebase deploy --only functions`
4. Verificar logs para confirmar funcionamento
5. Destruir versão antiga após 7 dias

Ver [SECRET_MANAGER_SETUP.md](./SECRET_MANAGER_SETUP.md) para detalhes.

### Auditoria de Segurança

**Mensal**:
- [ ] Revisar logs de auditoria
- [ ] Verificar acessos suspeitos
- [ ] Atualizar dependências
- [ ] Verificar alertas do Sentry

**Trimestral**:
- [ ] Revisar Firestore Rules
- [ ] Revisar Custom Claims
- [ ] Atualizar documentação de segurança
- [ ] Penetration testing básico

---

## 🐛 Debugging

### Local

```bash
# Debugar Functions localmente
cd functions
npm run serve

# Usar Functions Shell
npm run shell
> mercadoPagoWebhook({data: {...}})
```

### Produção

```bash
# Ver chamadas recentes de uma function
firebase functions:log --only functionName --limit 100

# Ver erros
firebase functions:log --only errors --since 24h

# Ver métricas
firebase functions:metrics functionName
```

### Firestore

```bash
# Exportar dados para backup
firebase firestore:export gs://optify-definitivo.appspot.com/backups/$(date +%Y%m%d)

# Importar dados
firebase firestore:import gs://optify-definitivo.appspot.com/backups/20241231
```

---

## 📞 Suporte

### Equipe

- **Tech Lead**: Diego Kamor (diegkamor@gmail.com)
- **Sentry**: https://sentry.io/organizations/optify
- **Firebase**: Console do Firebase

### Documentação Adicional

- [ENV_SETUP.md](./ENV_SETUP.md) - Configuração de variáveis
- [SECRET_MANAGER_SETUP.md](./SECRET_MANAGER_SETUP.md) - Secrets
- [SECURITY.md](./SECURITY.md) - Política de segurança
- [RUNBOOKS.md](./RUNBOOKS.md) - Procedimentos de incidentes
- [ADRs/](./docs/adrs/) - Architecture Decision Records

---

## 🎯 Próximos Passos após Setup

1. ✅ Verificar que `npm run dev` funciona
2. ✅ Verificar que emuladores iniciam sem erro
3. ✅ Fazer login no sistema localmente
4. ✅ Rodar testes: `npm run test`
5. ✅ Criar uma feature branch e fazer PR de teste

**Tempo estimado de onboarding**: < 1 hora

---

## 📝 Notas Importantes

- **NUNCA** commite secrets no código
- **SEMPRE** use Secret Manager para produção
- **SEMPRE** abra PR para changes (não push direto em main)
- **SEMPRE** espere CI passar antes de merge
- **SEMPRE** teste localmente antes de fazer push

---

**Última atualização**: Dezembro 2024  
**Versão**: 2.0.0  
**Maturidade**: 10.0/10 🎉
