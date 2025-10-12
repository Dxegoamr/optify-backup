# Política de Segurança - Optify

## Cabeçalhos de Segurança Implementados

### 1. Strict Transport Security (HSTS)
```
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
```
- Força HTTPS em todas as conexões
- Duração: 1 ano
- Inclui subdomínios
- Pré-carregado nos navegadores

### 2. Content Security Policy (CSP)
```
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://sdk.mercadopago.com https://www.google.com https://www.gstatic.com https://www.googletagmanager.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https: blob:; connect-src 'self' https://api.mercadopago.com https://*.googleapis.com https://*.firebaseapp.com https://*.google.com https://www.google-analytics.com https://analytics.google.com https://www.googletagmanager.com; frame-src 'self' https://sdk.mercadopago.com https://www.google.com; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none';
```

**Permissões:**
- `default-src 'self'`: Apenas recursos do próprio domínio
- `script-src`: Scripts do próprio domínio + Mercado Pago + Google
- `style-src`: Estilos inline + Google Fonts
- `font-src`: Fontes do próprio domínio + Google Fonts
- `img-src`: Imagens do próprio domínio + data URLs + HTTPS
- `connect-src`: Conexões para APIs do Mercado Pago, Firebase e Google
- `frame-src`: Frames apenas do próprio domínio + Mercado Pago + Google
- `object-src 'none'`: Bloqueia plugins (Flash, Java, etc.)
- `base-uri 'self'`: Base URI apenas do próprio domínio
- `form-action 'self'`: Formulários apenas para o próprio domínio
- `frame-ancestors 'none'`: Não permite ser incorporado em frames

### 3. X-Frame-Options
```
X-Frame-Options: DENY
```
- Impede que o site seja incorporado em frames/iframes
- Proteção contra clickjacking

### 4. X-Content-Type-Options
```
X-Content-Type-Options: nosniff
```
- Impede que navegadores "adivinhem" o tipo de conteúdo
- Força o uso do Content-Type correto

### 5. Referrer Policy
```
Referrer-Policy: strict-origin-when-cross-origin
```
- Controla informações de referrer enviadas
- Máxima privacidade mantendo funcionalidade

### 6. Permissions Policy
```
Permissions-Policy: camera=(), microphone=(), geolocation=(), interest-cohort=()
```
- Bloqueia acesso a câmera, microfone e geolocalização
- Bloqueia FLoC (Federated Learning of Cohorts) do Google

## Segurança no Backend

### 1. Firebase App Check
- Verificação de integridade da aplicação
- reCAPTCHA v3 em produção
- Debug token em desenvolvimento

### 2. Custom Claims
- Controle de acesso baseado em claims
- Verificação server-side de permissões
- Revalidação automática

### 3. Firestore Security Rules
- Validação de dados no servidor
- Controle de acesso granular
- Verificação de App Check obrigatória

### 4. Webhook Security
- Verificação HMAC do Mercado Pago
- Controle de idempotência
- Logs de auditoria

## Segurança no Frontend

### 1. Route Guards
- Verificação de autenticação
- Controle de acesso baseado em roles
- Redirecionamento seguro

### 2. Input Validation
- Sanitização de dados
- Validação client-side
- Prevenção de XSS

### 3. Secure Storage
- Tokens em memória
- Limpeza automática de sessão
- Não armazenamento de dados sensíveis

## Monitoramento de Segurança

### 1. Logs de Auditoria
- Todas as ações críticas logadas
- Rastreamento de mudanças
- Alertas de segurança

### 2. Error Tracking
- Sentry para monitoramento de erros
- Alertas automáticos
- Análise de padrões

### 3. Performance Monitoring
- Firebase Performance
- Métricas de Core Web Vitals
- Alertas de degradação

## Checklist de Segurança

### ✅ Implementado
- [x] HSTS habilitado
- [x] CSP configurado
- [x] X-Frame-Options
- [x] X-Content-Type-Options
- [x] Referrer Policy
- [x] Permissions Policy
- [x] App Check obrigatório
- [x] Custom Claims
- [x] Firestore Rules robustas
- [x] Webhook HMAC
- [x] Route Guards
- [x] Logs de auditoria

### 🔄 Em Desenvolvimento
- [ ] Rate limiting
- [ ] DDoS protection
- [ ] WAF (Web Application Firewall)
- [ ] Security headers middleware

### 📋 Próximos Passos
- [ ] Penetration testing
- [ ] Security audit
- [ ] Bug bounty program
- [ ] Security training para equipe

## Contato de Segurança

Para reportar vulnerabilidades de segurança:
- Email: security@optify.com.br
- Resposta em até 24h
- Programa de recompensas disponível

## Atualizações

Este documento é atualizado regularmente. Última atualização: Dezembro 2024
