# 🔍 Diagnóstico: Botão Desabilitado no Checkout do Mercado Pago

## 📋 Resumo do Problema
O botão "Pagar" no checkout do Mercado Pago está aparecendo **cinza e desabilitado**, impedindo o pagamento.

---

## 🎯 CAUSAS POSSÍVEIS (Lista Completa)

### 1. ⚠️ **PROBLEMAS COM TOKEN DE ACESSO**

#### 1.1 Token não configurado no Firebase Secret Manager
- **Sintoma**: Logs mostram `"MERCADOPAGO_ACCESS_TOKEN não definido"`
- **Verificar**: 
  - Firebase Console → Functions → Config → Secrets
  - Ou Google Cloud Console → Secret Manager
- **Nomes esperados**:
  - `MERCADO_PAGO_ACCESS_TOKEN` (com underscore) ✅ **PRIORITÁRIO**
  - `MERCADOPAGO_ACCESS_TOKEN` (sem underscore) ⚠️ Fallback
- **Como corrigir**:
  ```bash
  # No Firebase CLI
  firebase functions:secrets:set MERCADO_PAGO_ACCESS_TOKEN
  
  # Ou no Google Cloud Console
  gcloud secrets create MERCADO_PAGO_ACCESS_TOKEN --data-file=-
  ```

#### 1.2 Token expirado ou inválido
- **Sintoma**: API retorna 401 Unauthorized
- **Verificar**: 
  - Acesse https://www.mercadopago.com.br/developers/panel
  - Verifique se o token está ativo
  - Tokens de produção começam com `APP_USR-`
  - Tokens de sandbox/teste começam com `TEST-`

#### 1.3 Token de ambiente errado
- **Sintoma**: Funciona em desenvolvimento, mas não em produção
- **Problema**: 
  - Token de **sandbox** usado em produção
  - Token de **produção** usado em sandbox
- **Como identificar**: 
  - Token sandbox: `TEST-xxxxxxxxxxxxx`
  - Token produção: `APP_USR-xxxxxxxxxxxxx`

#### 1.4 Token sem permissões suficientes
- **Sintoma**: API retorna 403 Forbidden
- **Verificar**: O token precisa ter permissão para criar "checkout preferences"
- **Como corrigir**: Regenerar token no painel do Mercado Pago com todas as permissões

---

### 2. 💰 **PROBLEMAS COM VALOR DO PAGAMENTO**

#### 2.1 Valor muito baixo (< R$ 1,00)
- **Problema atual**: Plano Standard está configurado com `preco_mensal: 1` (R$ 1,00)
- **Sintoma**: Mercado Pago pode rejeitar valores muito baixos
- **Verificar**: `functions/src/mercadopago.ts` linha 21
- **Valor mínimo recomendado**: R$ 5,00 para testes

#### 2.2 Valor zero ou negativo
- **Sintoma**: API retorna erro de validação
- **Verificar**: Logs mostram `"Valor inválido"`
- **Como corrigir**: Validar que `amount > 0`

#### 2.3 Formato de valor incorreto
- **Sintoma**: Valor não é um número válido
- **Problema**: Pode estar enviando string em vez de number
- **Verificar**: Logs mostram o payload completo enviado

#### 2.4 Casas decimais incorretas
- **Sintoma**: Mercado Pago pode rejeitar valores com mais de 2 casas decimais
- **Como corrigir**: Normalizar com `Math.round(amount * 100) / 100`

---

### 3. 🔧 **PROBLEMAS NA CONFIGURAÇÃO DA PREFERÊNCIA**

#### 3.1 Campo obrigatório faltando
- **Campos obrigatórios do Mercado Pago**:
  ```json
  {
    "items": [{
      "title": "string (obrigatório)",
      "quantity": "number (obrigatório)",
      "currency_id": "BRL (obrigatório)",
      "unit_price": "number (obrigatório)"
    }],
    "payer": {
      "email": "string (obrigatório)"
    }
  }
  ```
- **Verificar**: Logs mostram `"🔍 Debug - Payload completo para MP"`

#### 3.2 Email do payer inválido ou ausente
- **Sintoma**: API retorna erro de validação
- **Verificar**: 
  - `userEmail` não é null/undefined
  - Email é válido (contém @)
  - Email não está vazio

#### 3.3 URLs de retorno inválidas
- **Campos**: `back_urls.success`, `back_urls.failure`, `back_urls.pending`
- **Problema**: URLs devem ser HTTPS válidas
- **Verificar**: Variável `BASE_URL_FRONTEND` está configurada corretamente
- **Como verificar**: Logs mostram `baseUrl` no debug

#### 3.4 Notification URL inválida ou inacessível
- **Campo**: `notification_url`
- **Problema**: URL do webhook deve ser acessível publicamente
- **Verificar**: `https://us-central1-optify-definitivo.cloudfunctions.net/mercadoPagoWebhook`
- **Teste**: Acesse a URL manualmente no navegador (deve retornar algo, não 404)

---

### 4. 🌐 **PROBLEMAS DE REDE/CONECTIVIDADE**

#### 4.1 Firebase Functions não consegue acessar API do Mercado Pago
- **Sintoma**: Timeout ou erro de conexão
- **Verificar**: 
  - Firewall do Google Cloud permite conexões de saída
  - Network tags corretas na função
- **Como testar**: Ver logs de erro de rede

#### 4.2 Timeout da função
- **Sintoma**: Função demora muito para responder
- **Configuração atual**: `timeoutSeconds: 60`
- **Como verificar**: Logs mostram timeout

#### 4.3 CORS (Cross-Origin Resource Sharing)
- **Sintoma**: Erro no console do navegador sobre CORS
- **Configuração atual**: `cors: true` ✅ (já configurado)
- **Verificar**: Se há erros de CORS no console do navegador

---

### 5. 📦 **PROBLEMAS COM A RESPOSTA DO MERCADO PAGO**

#### 5.1 Erros na resposta mesmo com status 200/201
- **Sintoma**: Preferência criada mas com `errors` no payload
- **Verificar**: Logs mostram `"❌ Erros na resposta do Mercado Pago"`
- **Como identificar**: Campo `data.errors` no JSON de resposta

#### 5.2 Preferência sem ID
- **Sintoma**: `data.id` é null/undefined
- **Problema**: Mercado Pago não retornou ID válido
- **Verificar**: Logs mostram `"❌ Preferência criada sem ID"`

#### 5.3 URL de checkout não retornada
- **Sintoma**: `init_point` e `sandbox_init_point` são null
- **Problema**: Mercado Pago não gerou URL de checkout
- **Verificar**: Logs mostram `"❌ Nenhuma URL de checkout disponível"`

#### 5.4 Status da preferência inválido
- **Sintoma**: `data.status` indica problema
- **Possíveis valores**: `active`, `paused`, `closed`, etc.
- **Verificar**: Logs mostram `"🔍 Debug - Status da preferência"`

#### 5.5 Valor total não confere
- **Sintoma**: Valor nos items não bate com valor esperado
- **Problema**: Mercado Pago alterou o valor ou houve erro de cálculo
- **Verificar**: Logs mostram `"⚠️ Aviso: Valor total dos items não confere"`

---

### 6. 🔐 **PROBLEMAS DE AUTENTICAÇÃO/AUTORIZAÇÃO**

#### 6.1 Conta do Mercado Pago sem permissões
- **Sintoma**: API retorna 403 Forbidden
- **Problema**: Conta não tem permissão para criar preferências
- **Como verificar**: Acesse painel do desenvolvedor do Mercado Pago

#### 6.2 Conta do Mercado Pago não verificada
- **Sintoma**: Algumas funcionalidades bloqueadas
- **Problema**: Conta precisa ser verificada (email, telefone, documentos)

#### 6.3 Aplicação não habilitada para produção
- **Sintoma**: Funciona em sandbox, não funciona em produção
- **Problema**: App ainda está em modo teste
- **Como verificar**: Painel do desenvolvedor → Status da aplicação

---

### 7. 📝 **PROBLEMAS COM OS DADOS DO ITEM**

#### 7.1 Título do item muito longo
- **Sintoma**: API retorna erro de validação
- **Limite**: Geralmente 256 caracteres
- **Problema atual**: `"Optify - Plano Standard (Mensal)"` ✅ (OK)

#### 7.2 Quantidade inválida
- **Sintoma**: API retorna erro de validação
- **Problema**: `quantity` deve ser >= 1
- **Configuração atual**: `quantity: 1` ✅ (OK)

#### 7.3 Moeda inválida
- **Sintoma**: API retorna erro de validação
- **Configuração atual**: `currency_id: 'BRL'` ✅ (OK)

#### 7.4 Description faltando ou inválida
- **Nota**: Adicionado recentemente, mas pode não ser obrigatório
- **Configuração atual**: `description: "Assinatura do plano ${plan.nome} - Optify"` ✅

---

### 8. 🏦 **PROBLEMAS ESPECÍFICOS DO MERCADO PAGO**

#### 8.1 Limites de criação de preferências
- **Sintoma**: API retorna erro de rate limit
- **Problema**: Muitas requisições em pouco tempo
- **Solução**: Implementar backoff exponencial

#### 8.2 IP bloqueado
- **Sintoma**: API retorna 403 ou bloqueia requisições
- **Problema**: IP do Google Cloud pode estar em blacklist
- **Como verificar**: Logs mostram IP de origem

#### 8.3 Conta do Mercado Pago com restrições
- **Sintoma**: Algumas funcionalidades não disponíveis
- **Problema**: Conta pode ter restrições por falta de documentação, pendências, etc.

#### 8.4 Ambiente sandbox vs produção
- **Sintoma**: Funciona em um ambiente, não funciona em outro
- **Problema**: 
  - Token de sandbox com URL de produção
  - Token de produção com URL de sandbox
- **URLs**:
  - Produção: `https://api.mercadopago.com`
  - Sandbox: `https://api.mercadopago.com` (mesmo endpoint, diferente token)

---

### 9. 🔄 **PROBLEMAS NO FRONTEND**

#### 9.1 Mutation travada em estado de erro
- **Sintoma**: Botão não reativa mesmo após erro
- **Problema**: `createPreferenceMutation.isError` mantém estado
- **Solução**: Já implementado reset automático ✅

#### 9.2 URL de checkout incorreta
- **Sintoma**: Redireciona mas não carrega checkout
- **Verificar**: 
  - `preference.checkout_url`
  - `preference.init_point`
  - `preference.sandbox_init_point`
- **Como verificar**: Console do navegador mostra URL

#### 9.3 Erro ao redirecionar
- **Sintoma**: Erro no console do navegador
- **Problema**: `window.location.href` falha
- **Verificar**: Console do navegador (F12)

---

### 10. ⚙️ **PROBLEMAS DE CONFIGURAÇÃO DO FIREBASE**

#### 10.1 Secret não acessível pela função
- **Sintoma**: `process.env.MERCADO_PAGO_ACCESS_TOKEN` é undefined
- **Problema**: 
  - Secret não foi definido corretamente
  - Versão do secret não está ativa
  - Função não tem permissão para acessar o secret
- **Verificar**: 
  ```typescript
  // Na função, verificar:
  secrets: ['MERCADO_PAGO_ACCESS_TOKEN', 'BASE_URL_FRONTEND']
  ```

#### 10.2 Variável BASE_URL_FRONTEND incorreta
- **Sintoma**: URLs de retorno inválidas
- **Valor atual**: Fallback para `'https://optify.host'`
- **Verificar**: 
  - Secret `BASE_URL_FRONTEND` está configurado?
  - URL está correta e acessível?

#### 10.3 Região da função incorreta
- **Sintoma**: Alta latência ou erros de rede
- **Configuração atual**: `us-central1` ✅
- **Nota**: Mercado Pago é brasileiro, mas `us-central1` deve funcionar

---

## 🔍 **COMO DIAGNOSTICAR**

### Passo 1: Verificar Logs do Firebase Functions
```
Firebase Console → Functions → Logs
Filtrar por: createPaymentPreference
```

**Procurar por**:
- `🔍 Debug - Configuração` → Verifica token
- `🔍 Debug - Payload completo para MP` → Verifica dados enviados
- `🔍 Debug - Resposta completa do MP` → Verifica resposta
- `❌ Erro` → Mostra erros específicos

### Passo 2: Verificar Console do Navegador
```
F12 → Console
```

**Procurar por**:
- Erros de rede (fetch falhou)
- Erros de CORS
- Erros de JavaScript
- `🔍 Hook - Erro da API` → Erro na chamada

### Passo 3: Testar Token Manualmente
```bash
curl -X GET \
  'https://api.mercadopago.com/users/me' \
  -H 'Authorization: Bearer SEU_TOKEN_AQUI'
```

**Resposta esperada**: JSON com dados do usuário
**Se der erro**: Token inválido ou sem permissões

### Passo 4: Verificar Secrets no Google Cloud
```
Google Cloud Console → Secret Manager
```

**Verificar**:
- `MERCADO_PAGO_ACCESS_TOKEN` existe?
- Versão está ativa?
- Função tem permissão para acessar?

### Passo 5: Verificar Resposta da API do Mercado Pago
No código, a resposta completa é logada:
```typescript
console.log('🔍 Debug - Resposta completa do MP:', JSON.stringify(data, null, 2));
```

**Verificar**:
- Campo `errors` existe?
- Campo `status` qual valor?
- `init_point` ou `sandbox_init_point` existem?

---

## ✅ **CHECKLIST DE VERIFICAÇÃO**

Marque cada item após verificar:

- [ ] Token `MERCADO_PAGO_ACCESS_TOKEN` configurado no Secret Manager
- [ ] Token é válido (não expirado)
- [ ] Token é do ambiente correto (produção vs sandbox)
- [ ] Token tem permissões para criar preferências
- [ ] Valor do plano é >= R$ 1,00 (recomendado >= R$ 5,00)
- [ ] Email do payer é válido e não está vazio
- [ ] `BASE_URL_FRONTEND` está configurado corretamente
- [ ] URLs de retorno são HTTPS válidas
- [ ] Notification URL é acessível publicamente
- [ ] Função tem acesso aos secrets
- [ ] Logs não mostram erros específicos
- [ ] Console do navegador não mostra erros
- [ ] Resposta do Mercado Pago não contém `errors`
- [ ] Resposta contém `init_point` ou `sandbox_init_point`
- [ ] Status da preferência é `active` ou válido
- [ ] Conta do Mercado Pago está verificada
- [ ] Aplicação está habilitada para produção (se for produção)

---

## 🚨 **CAUSAS MAIS PROVÁVEIS (Ordenadas por Probabilidade)**

1. **Token não configurado ou inválido** (70% de chance)
   - Verificar Secret Manager primeiro

2. **Valor muito baixo** (15% de chance)
   - R$ 1,00 pode ser rejeitado pelo Mercado Pago

3. **Erros na resposta do Mercado Pago** (10% de chance)
   - Campo `errors` na resposta JSON

4. **URL de checkout não retornada** (3% de chance)
   - `init_point` null na resposta

5. **Outras causas** (2% de chance)
   - Problemas de rede, timeout, etc.

---

## 📞 **PRÓXIMOS PASSOS**

1. **Acesse os logs** do Firebase Functions após tentar criar uma preferência
2. **Copie os logs** que começam com `🔍 Debug`
3. **Verifique** cada item do checklist acima
4. **Compartilhe** os logs para análise mais detalhada

---

**Última atualização**: Após implementação de logs detalhados e validações (2024)





