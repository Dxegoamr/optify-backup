#!/bin/bash
# Script bash para buscar logs do Firebase Functions
# Execute: bash get-logs.sh

echo "🔍 Buscando logs do Firebase Functions..."
echo ""

# Configurações
PROJECT_ID="optify-definitivo"
FUNCTION_NAME="createPaymentPreference"
LIMIT=50

echo "📋 Projeto: $PROJECT_ID"
echo "📋 Função: $FUNCTION_NAME"
echo "📋 Limite: $LIMIT logs"
echo ""

# Verificar se gcloud está instalado
if ! command -v gcloud &> /dev/null; then
    echo "❌ gcloud não está instalado ou não está no PATH"
    echo ""
    echo "📥 Instale o Google Cloud SDK:"
    echo "   https://cloud.google.com/sdk/docs/install"
    exit 1
fi

echo "✅ gcloud encontrado"
echo ""

# Verificar se está autenticado
ACCOUNT=$(gcloud auth list --filter=status:ACTIVE --format="value(account)" 2>&1)
if [ -z "$ACCOUNT" ]; then
    echo "❌ Você não está autenticado no gcloud"
    echo ""
    echo "🔐 Execute: gcloud auth login"
    exit 1
else
    echo "✅ Autenticado como: $ACCOUNT"
fi

echo ""
echo "🔍 Buscando logs..."
echo ""

# Buscar logs usando gcloud
echo "═══════════════════════════════════════════════════════════════"
echo "📊 LOGS ENCONTRADOS (últimos $LIMIT)"
echo "═══════════════════════════════════════════════════════════════"
echo ""

gcloud logging read \
    "resource.type=cloud_function AND resource.labels.function_name=$FUNCTION_NAME" \
    --project=$PROJECT_ID \
    --limit=$LIMIT \
    --format="value(timestamp,textPayload,jsonPayload.message,jsonPayload.severity)" \
    --freshness=7d

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo ""

# Buscar logs específicos importantes
echo "🎯 Buscando logs específicos de debug..."
echo ""

echo "═══════════════════════════════════════════════════════════════"
echo "🔍 LOGS DE DEBUG ENCONTRADOS"
echo "═══════════════════════════════════════════════════════════════"
echo ""

gcloud logging read \
    "resource.type=cloud_function AND resource.labels.function_name=$FUNCTION_NAME AND (textPayload=~'🔍 Debug' OR textPayload=~'❌ Erro' OR jsonPayload.message=~'🔍 Debug' OR jsonPayload.message=~'❌ Erro')" \
    --project=$PROJECT_ID \
    --limit=20 \
    --format="value(timestamp,textPayload,jsonPayload.message)" \
    --freshness=7d

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "✅ Busca concluída!"
echo ""
echo "💡 Para ver mais logs, acesse:"
echo "   https://console.firebase.google.com/project/$PROJECT_ID/functions/logs"





