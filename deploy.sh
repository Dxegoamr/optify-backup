#!/bin/bash

# Script de deploy para Google Cloud Run
# Uso: ./deploy.sh [environment]

set -e

# Configurações
PROJECT_ID="optify-definitivo"
SERVICE_NAME="optify-core-engine"
REGION="us-central1"
IMAGE_NAME="gcr.io/$PROJECT_ID/$SERVICE_NAME"

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🚀 Iniciando deploy do Optify Core Engine...${NC}"

# Verificar se o gcloud está instalado
if ! command -v gcloud &> /dev/null; then
    echo -e "${RED}❌ Google Cloud CLI não está instalado. Instale em: https://cloud.google.com/sdk/docs/install${NC}"
    exit 1
fi

# Verificar se o Docker está instalado
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker não está instalado. Instale em: https://docs.docker.com/get-docker/${NC}"
    exit 1
fi

# Configurar projeto
echo -e "${YELLOW}📋 Configurando projeto Google Cloud...${NC}"
gcloud config set project $PROJECT_ID

# Habilitar APIs necessárias
echo -e "${YELLOW}🔧 Habilitando APIs necessárias...${NC}"
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable containerregistry.googleapis.com

# Fazer login no Container Registry
echo -e "${YELLOW}🔐 Fazendo login no Container Registry...${NC}"
gcloud auth configure-docker

# Build da imagem
echo -e "${YELLOW}🏗️  Construindo imagem Docker...${NC}"
docker build -t $IMAGE_NAME:latest .

# Push da imagem
echo -e "${YELLOW}📤 Enviando imagem para Container Registry...${NC}"
docker push $IMAGE_NAME:latest

# Deploy no Cloud Run
echo -e "${YELLOW}🚀 Fazendo deploy no Cloud Run...${NC}"
gcloud run deploy $SERVICE_NAME \
  --image $IMAGE_NAME:latest \
  --platform managed \
  --region $REGION \
  --allow-unauthenticated \
  --port 8080 \
  --memory 1Gi \
  --cpu 1 \
  --max-instances 10 \
  --set-env-vars NODE_ENV=production,PORT=8080 \
  --set-secrets FIREBASE_PRIVATE_KEY=firebase-private-key:latest,MERCADO_PAGO_ACCESS_TOKEN=mercado-pago-token:latest

# Obter URL do serviço
SERVICE_URL=$(gcloud run services describe $SERVICE_NAME --platform managed --region $REGION --format 'value(status.url)')

echo -e "${GREEN}✅ Deploy concluído com sucesso!${NC}"
echo -e "${GREEN}🌐 URL do serviço: $SERVICE_URL${NC}"
echo -e "${YELLOW}📝 Para configurar secrets, execute:${NC}"
echo -e "${YELLOW}   gcloud secrets create firebase-private-key --data-file=path/to/firebase-private-key.json${NC}"
echo -e "${YELLOW}   gcloud secrets create mercado-pago-token --data-file=path/to/mercado-pago-token.txt${NC}"




