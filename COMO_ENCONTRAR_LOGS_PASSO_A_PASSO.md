# 🔍 Como Encontrar os Logs - Passo a Passo Detalhado

## 📍 **MÉTODO 1: Firebase Console - Tela de Logs**

### Passo 1: Acesse a página de Logs
1. Abra: https://console.firebase.google.com/project/optify-definitivo/logs
2. **OU** vá em: Firebase Console → Logs (menu lateral esquerdo)

### Passo 2: Configure o Filtro
1. No campo **"Buscar por texto ou expressão"**, digite:
   ```
   createPaymentPreference
   ```

2. **OU** use filtros avançados:
   - Clique em "Add filter"
   - Selecione: **Function name** → `createPaymentPreference`

### Passo 3: Ajuste o Período
- Clique no seletor de tempo (canto superior direito)
- Selecione: **"Últimas 24 horas"** ou **"Últimas 7 dias"**

### Passo 4: Procure pelas Mensagens
Procure por linhas que contenham:
- `Debug - Configuração`
- `Debug - Payload completo para MP`
- `Debug - Resposta completa do MP`
- `Erro`

---

## 📍 **MÉTODO 2: Diretamente da Função**

### Passo 1: Na tela que você está agora
1. Na lista de funções, clique em **`createPaymentPreference`** (linha com 11 solicitações)
2. Isso vai abrir os detalhes da função

### Passo 2: Vá para a aba "Logs"
1. No topo da página de detalhes, procure por uma aba chamada **"Logs"** ou **"Execution logs"**
2. Clique nela

### Passo 3: Veja as Execuções
1. Você verá uma lista de execuções recentes
2. Clique em uma execução para ver os logs completos
3. Procure pelas mensagens de debug

---

## 📍 **MÉTODO 3: Google Cloud Logs Explorer**

### Passo 1: Acesse o Logs Explorer
URL direta: https://console.cloud.google.com/logs/query?project=optify-definitivo

### Passo 2: Cole esta Query
Cole no campo de busca:
```
resource.type="cloud_function"
resource.labels.function_name="createPaymentPreference"
severity>=INFO
```

### Passo 3: Ajuste o Período
- Clique no calendário (canto superior direito)
- Selecione: **Last 7 days**

### Passo 4: Veja os Resultados
- Os logs aparecerão listados abaixo
- Clique em cada log para expandir e ver detalhes completos

---

## 📍 **MÉTODO 4: Via Navegador (Network Tab)**

Se os logs não aparecerem, podemos pegar direto do navegador:

### Passo 1: Abra o DevTools
1. Na página de Planos, pressione **F12**
2. Vá para a aba **Network** (Rede)

### Passo 2: Tente Criar uma Preferência
1. Tente clicar no botão "Assinar" de um plano
2. Observe as requisições que aparecem na aba Network

### Passo 3: Encontre a Requisição
1. Procure por uma requisição chamada: `createPaymentPreference`
2. Clique nela
3. Vá para a aba **"Response"** ou **"Preview"**
4. Copie todo o conteúdo JSON

### Passo 4: Veja o Console
1. Vá para a aba **Console** no DevTools
2. Procure por mensagens que começam com `🔍` ou `❌`
3. Copie essas mensagens

---

## 🚨 **SE AINDA NÃO ENCONTRAR OS LOGS**

### Verifique se a Função foi Executada Recentemente
1. Na tela de Functions, veja se `createPaymentPreference` tem execuções recentes
2. Você mencionou **11 solicitações nas últimas 24 horas** - isso é bom!
3. Isso significa que a função está sendo chamada

### Force uma Nova Execução
1. Vá para a página de Planos
2. Abra o DevTools (F12) → aba **Console**
3. Tente clicar no botão "Assinar"
4. Observe o que aparece no Console
5. Copie qualquer erro ou mensagem que aparecer

---

## 💡 **O QUE FAZER AGORA**

**Opção A (Mais Fácil):**
1. Tente criar uma preferência agora mesmo
2. Abra o DevTools (F12) → aba **Console**
3. Copie **TODAS** as mensagens que aparecerem (especialmente as que começam com `🔍` ou `❌`)

**Opção B:**
1. Acesse: https://console.cloud.google.com/logs/query?project=optify-definitivo
2. Cole a query do Método 3 acima
3. Copie os logs que aparecerem

**Opção C:**
1. Na página de Functions, clique na função `createPaymentPreference`
2. Veja se há uma seção de "Últimas execuções" ou "Execution history"
3. Clique em uma execução para ver os logs

---

## ✅ **O QUE PRECISAMOS VER**

Com base no que você já viu (11 solicitações), vamos tentar capturar:

1. **Console do navegador** ao tentar criar preferência
2. **Resposta da API** na aba Network do DevTools
3. **Logs da função** se conseguir acessar via Google Cloud

Qualquer uma dessas informações já vai ajudar muito!





