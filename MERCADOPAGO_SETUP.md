# 🚀 Configuração do Mercado Pago - Optify

## ✅ Problemas Corrigidos

### 1. **Hook useCreatePreference Corrigido**
- ✅ Adicionado `mutationFn` no objeto de configuração do `useMutation`
- ✅ Melhorado tratamento de erros com logs detalhados
- ✅ Adicionado arquivo de configuração `src/config/env.ts`

### 2. **Arquivos Criados/Atualizados**
- ✅ `src/config/env.ts` - Configurações de ambiente centralizadas
- ✅ `src/hooks/useCreatePreference.ts` - Hook corrigido com logs de debug
- ✅ `src/pages/Planos.tsx` - Logs de debug adicionados

## 🔧 Próximos Passos

### 1. **Criar arquivo .env na raiz do projeto**
```bash
# Copie e cole no arquivo .env:
VITE_FIREBASE_API_KEY=sua_firebase_api_key_aqui
VITE_FIREBASE_AUTH_DOMAIN=optify-definitivo.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=optify-definitivo
VITE_FIREBASE_STORAGE_BUCKET=optify-definitivo.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=seu_sender_id_aqui
VITE_FIREBASE_APP_ID=seu_app_id_aqui

# Mercado Pago Configuration - PRODUÇÃO
VITE_MERCADO_PAGO_PUBLIC_KEY=APP_USR-9ca765f9-6a73-47a9-ab3d-0923791c2a4f
VITE_API_URL=https://us-central1-optify-definitivo.cloudfunctions.net
```

### 2. **Configurar Firebase Functions**
```bash
# Execute no terminal:
firebase functions:config:set \
  mercadopago.access_token="APP_USR-5496244105993399-070119-b9bec860fcf72e513a288bf609f3700c-454772336" \
  mercadopago.webhook_secret="d2f65399c863658bfaf6adb73621b346c4f644bef36905f136e1f46a9b44c33c" \
  app.base_url_frontend="https://optify-definitivo.web.app/"
```

### 3. **Deploy das Functions**
```bash
firebase deploy --only functions
```

### 4. **Testar a Integração**
1. Abra o console do navegador (F12)
2. Vá para a página de Planos
3. Clique em "Assinar" em qualquer plano
4. Verifique os logs de debug no console
5. Se tudo estiver correto, você será redirecionado para o Mercado Pago

## 🔍 Debug e Logs

Agora você verá logs detalhados no console:
- 🔍 **Hook - URL da API**: URL sendo usada
- 🔍 **Hook - Payload**: Dados enviados para a API
- 🔍 **Hook - Status da resposta**: Status HTTP da resposta
- 🔍 **Hook - Resposta da API**: Dados retornados pelo Mercado Pago

## 🚨 Se Ainda Houver Erros

1. **Verifique se o arquivo .env existe** na raiz do projeto
2. **Confirme se as variáveis estão corretas** no .env
3. **Verifique se as Functions foram deployadas** corretamente
4. **Teste a URL da API** diretamente no navegador:
   ```
   https://createpaymentpreference-3ysw3ji34q-uc.a.run.app
   ```

## 📞 Suporte

Se ainda houver problemas, verifique:
- Console do navegador para logs de erro
- Firebase Functions logs: `firebase functions:log`
- Status das variáveis de ambiente no console

## ✅ **STATUS ATUAL - CONFIGURADO**

**✅ Variáveis do Mercado Pago configuradas com sucesso!**

- ✅ **MERCADO_PAGO_ACCESS_TOKEN**: Configurado
- ✅ **MERCADO_PAGO_WEBHOOK_SECRET**: Configurado  
- ✅ **BASE_URL_FRONTEND**: https://optify-definitivo.web.app/
- ✅ **Functions deployadas**: createPaymentPreference, mercadoPagoWebhook, checkPaymentStatus

**URLs das Functions:**
- `createPaymentPreference`: https://createpaymentpreference-3ysw3ji34q-uc.a.run.app
- `mercadoPagoWebhook`: https://mercadopagowebhook-3ysw3ji34q-uc.a.run.app
- `checkPaymentStatus`: https://checkpaymentstatus-3ysw3ji34q-uc.a.run.app

---

**✅ O erro "No mutationFn found" foi corrigido!**
