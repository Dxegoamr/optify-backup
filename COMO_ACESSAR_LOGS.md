# 📋 Como Acessar os Logs do Firebase Functions

## 🎯 Objetivo
Obter os logs da função `createPaymentPreference` para diagnosticar o problema do botão desabilitado.

---

## 🌐 **MÉTODO 1: Firebase Console (Mais Fácil)**

### Passo a passo:

1. **Acesse o Firebase Console**
   - URL: https://console.firebase.google.com/project/optify-definitivo/functions/logs

2. **Filtre os logs**
   - No campo de busca, digite: `createPaymentPreference`
   - Ou selecione a função no menu dropdown

3. **Ajuste o período**
   - Clique em "Time range"
   - Selecione "Last 7 days" ou "Last hour"

4. **Procure pelos logs específicos**
   - Procure por mensagens que contenham:
     - `🔍 Debug - Configuração`
     - `🔍 Debug - Payload completo para MP`
     - `🔍 Debug - Resposta completa do MP`
     - `❌ Erro`

5. **Copie os logs**
   - Selecione as linhas relevantes
   - Copie e cole aqui

---

## 💻 **MÉTODO 2: Google Cloud Console**

### Passo a passo:

1. **Acesse o Google Cloud Console**
   - URL: https://console.cloud.google.com/logs/query?project=optify-definitivo

2. **Crie uma query**
   - No campo de busca, cole:
   ```
   resource.type="cloud_function"
   resource.labels.function_name="createPaymentPreference"
   ```

3. **Filtre por mensagens de debug**
   - Adicione ao filtro:
   ```
   textPayload=~"🔍 Debug" OR textPayload=~"❌ Erro"
   ```

4. **Ajuste o período**
   - Selecione "Last 7 days" no seletor de tempo

5. **Exporte os logs**
   - Clique em "Download" ou copie manualmente

---

## 🖥️ **MÉTODO 3: Google Cloud CLI (gcloud) - Script Automático**

### Pré-requisitos:
- Google Cloud SDK instalado
- Autenticado no gcloud (`gcloud auth login`)

### Opção A: Script PowerShell (Windows)
```powershell
# Execute o script que criei
.\get-logs.ps1
```

### Opção B: Script Bash (Linux/Mac/Git Bash)
```bash
# Execute o script que criei
bash get-logs.sh
```

### Opção C: Comando Manual
```bash
# Buscar logs gerais
gcloud logging read \
  "resource.type=cloud_function AND resource.labels.function_name=createPaymentPreference" \
  --project=optify-definitivo \
  --limit=50 \
  --format="value(timestamp,textPayload,jsonPayload.message)" \
  --freshness=7d

# Buscar apenas logs de debug
gcloud logging read \
  "resource.type=cloud_function AND resource.labels.function_name=createPaymentPreference AND (textPayload=~'🔍 Debug' OR textPayload=~'❌ Erro')" \
  --project=optify-definitivo \
  --limit=20 \
  --format="value(timestamp,textPayload,jsonPayload.message)" \
  --freshness=7d
```

---

## 🔍 **O QUE PROCURAR NOS LOGS**

### 1. Token de Acesso
Procure por:
```
🔍 Debug - Configuração
```
**Verificar**:
- `hasToken: true` ou `false`
- `tokenLength: X` (deve ser > 0)
- `tokenStartsWith: "APP_USR-"` ou `"TEST-"`

### 2. Payload Enviado
Procure por:
```
🔍 Debug - Payload completo para MP
```
**Verificar**:
- `items[0].unit_price` tem valor correto?
- `payer.email` está presente?
- Todos os campos obrigatórios estão preenchidos?

### 3. Resposta do Mercado Pago
Procure por:
```
🔍 Debug - Resposta completa do MP
```
**Verificar**:
- Existe campo `errors`? (não deve existir)
- Existe `init_point` ou `sandbox_init_point`?
- Campo `status` qual valor?
- Campo `id` existe?

### 4. Erros Específicos
Procure por:
```
❌ Erro
```
**Verificar**:
- Mensagem de erro específica
- Status HTTP (401, 403, 500, etc.)

---

## 📊 **EXEMPLO DE LOGS ESPERADOS**

### ✅ Log Normal (Sucesso):
```
🔍 Debug - Configuração: {
  hasToken: true,
  tokenLength: 200,
  tokenStartsWith: "APP_USR-",
  hasBaseUrl: true,
  baseUrl: "https://optify.host"
}

🔍 Debug - Payload completo para MP: {
  items: [{
    title: "Optify - Plano Standard (Mensal)",
    quantity: 1,
    currency_id: "BRL",
    unit_price: 1
  }],
  payer: {
    email: "usuario@exemplo.com"
  }
}

🔍 Debug - Resposta completa do MP: {
  id: "1234567890",
  init_point: "https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=...",
  status: "active"
}

✅ Preferência criada com sucesso
```

### ❌ Log com Erro (Token):
```
🔍 Debug - Configuração: {
  hasToken: false,
  tokenLength: 0,
  ...
}

❌ Token do Mercado Pago não configurado
```

### ❌ Log com Erro (API):
```
🔍 Debug - Resposta completa do MP: {
  errors: [
    {
      message: "Invalid access token",
      error: "unauthorized",
      status: 401
    }
  ]
}

❌ Erros na resposta do Mercado Pago
```

---

## 🚨 **SE NÃO ENCONTRAR LOGS**

1. **Verifique se a função foi executada**
   - Tente criar uma preferência novamente
   - Aguarde alguns segundos
   - Busque os logs novamente

2. **Verifique o nome da função**
   - No Firebase Console, veja o nome exato
   - Pode ser `createPaymentPreference` ou `createpaymentpreference`

3. **Verifique o período**
   - Aumente o período de busca
   - Tente "Last 30 days"

4. **Verifique permissões**
   - Você tem acesso ao projeto?
   - Sua conta tem permissão para ver logs?

---

## 📝 **PRÓXIMO PASSO**

Após obter os logs, envie:
1. **Todos os logs que começam com `🔍 Debug`**
2. **Todos os logs que começam com `❌ Erro`**
3. **A resposta completa do Mercado Pago** (se aparecer)

Com essas informações, posso identificar a causa exata do problema!

---

**Dica**: Use o **Método 1 (Firebase Console)** se você tem acesso ao navegador. É o mais visual e fácil de usar.





