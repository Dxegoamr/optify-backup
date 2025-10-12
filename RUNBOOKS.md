# Runbooks - Optify Core Engine

> 📖 Procedimentos operacionais para resolver incidentes comuns

## 📋 Índice

1. [Incidente de Pagamento](#incidente-de-pagamento)
2. [Queda de Quota Firebase](#queda-de-quota-firebase)
3. [Rollback de Deploy](#rollback-de-deploy)
4. [Usuário Bloqueado](#usuário-bloqueado)
5. [Webhook com Falha](#webhook-com-falha)
6. [Erro de Autenticação em Massa](#erro-de-autenticação-em-massa)

---

## 💳 Incidente de Pagamento

### Sintomas
- Usuário pagou mas plano não foi atualizado
- Transação aparece como "pending" após 24h
- Webhook não foi recebido

### Procedimento

#### Passo 1: Verificar Logs
```bash
# Ver logs do webhook
firebase functions:log --only mercadoPagoWebhook --limit 100

# Procurar por payment_id específico
firebase functions:log --only mercadoPagoWebhook --limit 500 | grep "PAYMENT_ID"
```

#### Passo 2: Verificar no Mercado Pago
1. Acessar [Mercado Pago Admin](https://www.mercadopago.com.br/activities)
2. Buscar pelo payment_id
3. Verificar status real do pagamento

#### Passo 3: Verificar no Firestore
```bash
# Via console ou código
```
1. Ir para Firestore Console
2. Navegar até `transactions_plans`
3. Buscar pela `externalReference`
4. Verificar status da transação

#### Passo 4: Reconciliação Manual

Se o pagamento foi aprovado mas não processado:

```typescript
// Executar via Functions Shell
firebase functions:shell

> const admin = require('firebase-admin');
> const db = admin.firestore();
> 
> // Atualizar transação
> await db.collection('transactions_plans')
>   .doc('TRANSACTION_ID')
>   .update({ status: 'completed' });
> 
> // Atualizar plano do usuário
> const email = 'user@example.com';
> const users = await db.collection('users')
>   .where('email', '==', email)
>   .get();
> 
> users.forEach(doc => {
>   doc.ref.update({
>     plano: 'ultimate',
>     subscriptionEndDate: new Date('2025-12-31'),
>     isActive: true,
>   });
> });
```

#### Passo 5: Executar Reconciliador

```bash
# Forçar execução do reconciliador
gcloud functions call reconcilePayments \
  --region=us-central1 \
  --project=optify-definitivo
```

#### Passo 6: Notificar Usuário

Enviar email manual explicando a situação e confirmando ativação do plano.

### Prevenção

- ✅ Webhook com HMAC ativo
- ✅ Idempotência implementada
- ✅ Reconciliador diário ativo
- ✅ Logs estruturados
- ✅ Alertas configurados

---

## 📊 Queda de Quota Firebase

### Sintomas
- Erros "quota exceeded" nos logs
- Lentidão generalizada
- Usuários não conseguem acessar dados

### Procedimento

#### Passo 1: Identificar Quota Excedida
```bash
# Ver métricas no console
firebase console

# Navegar: Project → Usage → Firestore
# Verificar:
# - Reads/day
# - Writes/day
# - Deletes/day
# - Storage
```

#### Passo 2: Ações Imediatas

**Se quota de leitura:**
```bash
# Desabilitar features não-críticas temporariamente
# - Dashboard de admin (leituras massivas)
# - Relatórios em tempo real
# - Auto-refresh

# Via Firebase Console:
# Functions → Desabilitar funções de agregação temporariamente
```

**Se quota de escrita:**
```bash
# Pausar:
# - Webhooks de teste
# - Logs excessivos
# - Agregações automáticas
```

#### Passo 3: Upgrade de Quota (Se Necessário)

```bash
# Via Firebase Console:
# 1. Ir para Billing
# 2. Upgrade para Blaze plan (se estiver em Spark)
# 3. Ajustar limites de spending
```

#### Passo 4: Otimizar Consultas

**Identificar queries caras**:
```bash
# Ver logs de leitura
firebase functions:log --only errors | grep "quota"

# Analisar patterns de leitura
# - Queries sem índice
# - Subcoleções grandes sem paginação
# - Leituras em loop
```

**Otimizações**:
```typescript
// Usar cache no frontend
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutos
      cacheTime: 10 * 60 * 1000, // 10 minutos
    },
  },
});

// Limitar leituras
.limit(50)  // Ao invés de ler tudo

// Usar agregações do servidor
const stats = await getDoc(doc(db, 'admin_stats', 'global'));
```

#### Passo 5: Prevenir Recorrência

- ✅ Implementar paginação em todas as listagens
- ✅ Usar agregações server-side
- ✅ Cache agressivo no frontend
- ✅ Alertas de quota configurados

### Prevenção

```bash
# Configurar alertas no Google Cloud Monitoring
# 1. Criar alerta para uso > 80% da quota
# 2. Notificar via email/Slack
# 3. Executar limpeza automática se > 90%
```

---

## 🔄 Rollback de Deploy

### Quando Fazer Rollback

- ❌ Erros críticos em produção
- ❌ Taxa de erro > 5%
- ❌ Funcionalidade crítica quebrada
- ❌ Vazamento de dados detectado

### Procedimento

#### Rollback do Hosting

```bash
# Ver versões deployadas
firebase hosting:channel:list

# Rollback para versão anterior
firebase hosting:rollback
# OU especificar versão
firebase hosting:rollback --version VERSION_ID
```

#### Rollback de Functions

```bash
# Ver versões de functions
gcloud functions list --project=optify-definitivo

# Rollback de uma function específica
gcloud functions deploy mercadoPagoWebhook \
  --source=gs://optify-definitivo.cloudfunctions/PREVIOUS_VERSION \
  --runtime=nodejs20 \
  --trigger-http \
  --project=optify-definitivo

# Ou fazer redeploy do commit anterior
git checkout PREVIOUS_COMMIT
firebase deploy --only functions
git checkout main
```

#### Rollback de Firestore Rules

```bash
# Ver histórico de rules
firebase firestore:rules:list

# Fazer rollback
firebase firestore:rules:rollback RULESET_ID
```

#### Rollback Completo via Git

```bash
# 1. Identificar commit bom
git log --oneline

# 2. Criar branch de hotfix
git checkout -b hotfix/rollback-to-version

# 3. Reverter para commit anterior
git revert COMMIT_SHA

# 4. Push e deploy
git push origin hotfix/rollback-to-version
firebase deploy

# 5. Criar PR para main
```

### Pós-Rollback

1. ✅ Verificar que sistema está funcionando
2. ✅ Notificar equipe
3. ✅ Identificar causa raiz
4. ✅ Criar issue/ticket
5. ✅ Planejar correção
6. ✅ Documentar lição aprendida

---

## 🚫 Usuário Bloqueado

### Sintomas
- IP na blacklist
- Rate limit excedido
- Conta desabilitada

### Procedimento

#### Verificar Blacklist

```typescript
// Via Functions Shell
firebase functions:shell

> const admin = require('firebase-admin');
> const db = admin.firestore();
> 
> // Ver IPs na blacklist
> const blacklist = await db.collection('ip_blacklist').get();
> blacklist.docs.forEach(doc => {
>   console.log(doc.id, doc.data());
> });
```

#### Remover da Blacklist

```typescript
// Via Functions Shell
> await db.collection('ip_blacklist').doc('IP_ADDRESS').delete();
> console.log('IP removido da blacklist');
```

#### Limpar Rate Limit

```typescript
// Via Functions Shell
> await db.collection('rate_limits').doc('ratelimit:IP_ADDRESS').delete();
> console.log('Rate limit resetado');
```

#### Habilitar Conta de Usuário

```bash
# Via Firebase CLI
firebase auth:users:enable user@example.com

# Via Functions Shell
> await admin.auth().updateUser('USER_UID', { disabled: false });
```

---

## 🔗 Webhook com Falha

### Sintomas
- Mercado Pago retornando erro
- Webhook não sendo recebido
- Assinatura HMAC inválida

### Procedimento

#### Passo 1: Verificar URL do Webhook

```bash
# Ver configuração no Mercado Pago
# https://www.mercadopago.com.br/developers/panel/webhooks

# URL deve ser:
# https://us-central1-optify-definitivo.cloudfunctions.net/mercadoPagoWebhook
```

#### Passo 2: Testar Webhook Manualmente

```bash
# Usar curl para simular webhook
curl -X POST \
  https://us-central1-optify-definitivo.cloudfunctions.net/mercadoPagoWebhook \
  -H "Content-Type: application/json" \
  -H "x-signature: ts=...,v1=..." \
  -d '{
    "id": "12345678",
    "type": "payment",
    "action": "payment.created"
  }'
```

#### Passo 3: Verificar Secret

```bash
# Ver secret atual
gcloud secrets versions access latest \
  --secret=MERCADO_PAGO_WEBHOOK_SECRET \
  --project=optify-definitivo

# Comparar com o configurado no Mercado Pago
```

#### Passo 4: Reenviar Webhook

1. Acessar Mercado Pago Developers
2. Navegar até Activities → Webhooks
3. Buscar payment_id
4. Clicar em "Reenviar notificação"

#### Passo 5: Forçar Processamento

```typescript
// Via Functions Shell
> const paymentId = '12345678';
> const payment = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
>   headers: { 'Authorization': 'Bearer ACCESS_TOKEN' }
> });
> const data = await payment.json();
> 
> // Processar manualmente
> await applyBusinessEffects(data);
```

---

## 🔐 Erro de Autenticação em Massa

### Sintomas
- Múltiplos usuários não conseguem fazer login
- Erro "auth/configuration-not-found"
- Tokens inválidos

### Procedimento

#### Passo 1: Verificar Status do Firebase

```bash
# Ver status do Firebase
# https://status.firebase.google.com/
```

#### Passo 2: Verificar Configuração

```typescript
// Verificar firebaseConfig no código
// src/integrations/firebase/config.ts

// Verificar que todas as env vars estão corretas
console.log(import.meta.env.VITE_FIREBASE_API_KEY);
```

#### Passo 3: Limpar Tokens

```bash
# Instruir usuários a:
# 1. Fazer logout
# 2. Limpar cache do navegador
# 3. Fazer login novamente
```

#### Passo 4: Revalidar Custom Claims

```bash
# Via Functions Shell
firebase functions:shell

> const admin = require('firebase-admin');
> const auth = admin.auth();
> 
> // Buscar usuário
> const user = await auth.getUserByEmail('user@example.com');
> console.log('Custom claims:', user.customClaims);
> 
> // Renovar token forçando refresh
> // (usuário precisa fazer logout/login)
```

---

## 🔥 Incidente Crítico - Procedimento Geral

### Severidade 1 (Crítico - Sistema Totalmente Fora)

**Ações Imediatas (0-15 min)**:
1. ✅ Confirmar incidente
2. ✅ Notificar equipe via Slack/WhatsApp
3. ✅ Criar war room (call)
4. ✅ Iniciar rollback se for deploy recente

**Investigação (15-60 min)**:
1. ✅ Ver logs do Sentry
2. ✅ Ver logs do Firebase
3. ✅ Verificar status de serviços externos
4. ✅ Identificar causa raiz

**Resolução (60 min+)**:
1. ✅ Aplicar correção ou rollback
2. ✅ Testar em staging
3. ✅ Deploy de correção
4. ✅ Monitorar por 2h

**Pós-Incidente**:
1. ✅ Documentar RCA (Root Cause Analysis)
2. ✅ Criar itens de ação para prevenir
3. ✅ Atualizar runbooks
4. ✅ Comunicar usuários afetados

### Severidade 2 (Alto - Funcionalidade Crítica Fora)

**Ações (0-30 min)**:
1. ✅ Confirmar impacto
2. ✅ Notificar equipe
3. ✅ Avaliar workaround

**Resolução (30 min - 4h)**:
1. ✅ Implementar correção
2. ✅ Testar
3. ✅ Deploy via PR urgente

### Severidade 3 (Médio - Degradação de Performance)

**Ações (0-2h)**:
1. ✅ Criar ticket
2. ✅ Investigar causa
3. ✅ Planejar correção

**Resolução (2h - 24h)**:
1. ✅ Implementar via PR normal
2. ✅ Deploy em janela apropriada

---

## 📞 Escalação

### Nível 1: Suporte
- Problemas de usuário individual
- Dúvidas de funcionalidade
- Tempo de resposta: 4h úteis

### Nível 2: Engenharia
- Bugs confirmados
- Problemas de múltiplos usuários
- Tempo de resposta: 2h úteis

### Nível 3: Tech Lead
- Incidentes críticos
- Decisões de arquitetura
- Tempo de resposta: imediato

### Escalação Externa
- Firebase Support: Para problemas de infraestrutura
- Mercado Pago: Para problemas de pagamento
- Sentry: Para problemas de monitoring

---

## 🛠️ Ferramentas de Diagnóstico

### Health Check

```bash
# Verificar saúde do sistema
curl https://optify-definitivo.web.app/
curl https://us-central1-optify-definitivo.cloudfunctions.net/healthCheck
```

### Logs Centralizados

```bash
# Ver todos os logs (últimas 2h)
gcloud logging read "resource.type=cloud_function" \
  --limit=500 \
  --format=json \
  --project=optify-definitivo \
  --since=2h

# Filtrar por erro
gcloud logging read "resource.type=cloud_function AND severity=ERROR" \
  --limit=100 \
  --project=optify-definitivo
```

### Métricas

```bash
# Ver métricas de uma function
gcloud functions describe mercadoPagoWebhook \
  --region=us-central1 \
  --project=optify-definitivo

# Ver execuções e erros
firebase functions:metrics mercadoPagoWebhook
```

---

## 📝 Checklist Pós-Incidente

- [ ] RCA (Root Cause Analysis) documentado
- [ ] Timeline do incidente registrado
- [ ] Ações preventivas identificadas
- [ ] Runbook atualizado (se necessário)
- [ ] Equipe comunicada
- [ ] Usuários notificados (se aplicável)
- [ ] Melhorias de monitoramento implementadas
- [ ] Post-mortem agendado (incidentes Sev 1-2)

---

## 🆘 Contatos de Emergência

**Tech Lead**: Diego Kamor
- Email: diegkamor@gmail.com
- Celular: [Adicionar]

**Suporte Firebase**:
- Email: firebase-support@google.com
- Portal: https://firebase.google.com/support

**Suporte Mercado Pago**:
- Email: developers@mercadopago.com
- Portal: https://www.mercadopago.com.br/developers/panel/support

---

**Última atualização**: Dezembro 2024  
**Revisão**: A cada trimestre ou após incidente Sev 1-2
