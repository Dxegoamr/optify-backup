#!/bin/bash

# Script para configurar as variáveis de ambiente do Firebase Functions
# Execute este script no diretório raiz do projeto

echo "🔧 Configurando variáveis de ambiente do Firebase Functions..."

# Configurar as variáveis de ambiente para produção
firebase functions:config:set \
  mercadopago.access_token="APP_USR-5496244105993399-070119-b9bec860fcf72e513a288bf609f3700c-454772336" \
  mercadopago.webhook_secret="d2f65399c863658bfaf6adb73621b346c4f644bef36905f136e1f46a9b44c33c" \
  app.base_url_frontend="https://optify.host"

echo "✅ Variáveis de ambiente configuradas com sucesso!"
echo ""
echo "📋 Próximos passos:"
echo "1. Faça o deploy das functions: firebase deploy --only functions"
echo "2. Configure o webhook do Mercado Pago para:"
echo "   https://us-central1-optify-definitivo.cloudfunctions.net/mercadoPagoWebhook"
echo "3. Teste um pagamento para verificar se está funcionando"
echo ""
echo "🔗 URLs das functions:"
echo "- createPaymentPreference: https://us-central1-optify-definitivo.cloudfunctions.net/createPaymentPreference"
echo "- mercadoPagoWebhook: https://us-central1-optify-definitivo.cloudfunctions.net/mercadoPagoWebhook"
echo "- checkPaymentStatus: https://us-central1-optify-definitivo.cloudfunctions.net/checkPaymentStatus"
