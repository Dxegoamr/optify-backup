#!/bin/bash

echo "🚀 Fazendo deploy das Firebase Functions com correções CORS..."

# Deploy apenas das functions
firebase deploy --only functions

echo "✅ Deploy concluído!"
echo ""
echo "🔗 URLs das Functions:"
echo "- createPaymentPreference: https://us-central1-optify-definitivo.cloudfunctions.net/createPaymentPreference"
echo "- mercadoPagoWebhook: https://us-central1-optify-definitivo.cloudfunctions.net/mercadoPagoWebhook"
echo "- checkPaymentStatus: https://us-central1-optify-definitivo.cloudfunctions.net/checkPaymentStatus"
echo ""
echo "🧪 Para testar:"
echo "1. Abra o console do navegador (F12)"
echo "2. Vá para a página de Planos"
echo "3. Clique em 'Assinar' em qualquer plano"
echo "4. Verifique se não há mais erros de CORS"
