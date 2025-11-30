# Cloud Run HTTP Server

## 📝 Problema Resolvido

O Cloud Run exige que a aplicação escute na porta definida pela variável de ambiente `PORT` (padrão 8080) e no host `0.0.0.0`. O comando `vite preview` não respeita essa convenção.

## ✅ Solução

Criado servidor HTTP simples (`server.js`) usando Express que:

1. **Lê `process.env.PORT`** → garante compatibilidade com Cloud Run
2. **Escuta em `0.0.0.0`** → aceita conexões externas
3. **Serve arquivos estáticos** de `dist/` → build do Vite
4. **Endpoint `/healthz`** → retorna 200 OK para health checks
5. **SPA fallback** → serve `index.html` para todas as rotas (React Router)

## 🔧 Mudanças Aplicadas

### 1. Novo arquivo: `server.js`
- Servidor Express minimalista
- Lê `PORT` do ambiente (padrão 8080)
- Logs úteis na inicialização
- Endpoint `/healthz` para readiness probes

### 2. `package.json`
- ✅ Adicionado `express` nas dependencies
- ✅ Adicionado script `"start": "node server.js"`

### 3. `Dockerfile`
- ✅ Instala todas as deps para build (`npm ci`)
- ✅ Executa `npm run build`
- ✅ Remove dev deps após build (`npm prune --production`)
- ✅ CMD alterado para `npm run start` (em vez de `preview`)

## 🧪 Testes Locais

### 1. Build da aplicação:
```bash
npm run build
```

### 2. Testar servidor local:
```bash
PORT=8080 npm run start
```

### 3. Testar health check:
```bash
curl http://localhost:8080/healthz
# Esperado: "ok" com status 200
```

### 4. Testar aplicação:
```bash
# Abrir no navegador:
http://localhost:8080
```

### 5. Testar com Docker (simula Cloud Run):
```bash
# Build da imagem
docker build -t optify-test .

# Rodar container com PORT customizado
docker run -p 8080:8080 -e PORT=8080 optify-test

# Testar health check
curl http://localhost:8080/healthz
```

## 📊 Critérios de Aceitação

- ✅ Servidor inicia e imprime "Server listening on port X"
- ✅ `GET /healthz` retorna 200 OK com corpo "ok"
- ✅ Aplicação funciona normalmente no navegador
- ✅ Cloud Run aceita o container sem timeout
- ✅ Nenhuma rota/feature de negócio alterada

## 🚫 O Que NÃO Foi Alterado

- ❌ Rotas da aplicação React
- ❌ Autenticação / Firebase
- ❌ Lógica de negócio
- ❌ Cloud Functions
- ❌ Infraestrutura GCP (Terraform, etc.)
- ❌ Timeouts do Cloud Run

## 📦 Dependências Adicionadas

- `express@^4.21.2` → servidor HTTP para produção (leve, ~500KB)

## 🔍 Logs Esperados

Quando o container iniciar no Cloud Run, você verá:

```
✅ Server listening on port 8080
🌐 Health check: http://0.0.0.0:8080/healthz
```

## 🎯 Commit Sugerido

```bash
git add server.js package.json Dockerfile CLOUD_RUN_SERVER.md
git commit -m "fix(run): ensure app listens on \$PORT and add /healthz for Cloud Run readiness"
```

---

**Autor**: Cursor AI Assistant  
**Data**: 2025-10-22  
**Contexto**: Fix para "failed to start and listen on PORT" no Cloud Run






















