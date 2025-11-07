# Script PowerShell para buscar logs do Firebase Functions
# Execute: .\get-logs.ps1

Write-Host "Buscando logs do Firebase Functions..." -ForegroundColor Cyan
Write-Host ""

$PROJECT_ID = "optify-definitivo"
$FUNCTION_NAME = "createPaymentPreference"
$LIMIT = 50

Write-Host "Projeto: $PROJECT_ID" -ForegroundColor Yellow
Write-Host "Funcao: $FUNCTION_NAME" -ForegroundColor Yellow
Write-Host "Limite: $LIMIT logs" -ForegroundColor Yellow
Write-Host ""

# Verificar se gcloud esta instalado
try {
    $gcloudVersion = gcloud --version 2>&1 | Select-Object -First 1
    Write-Host "gcloud encontrado: $gcloudVersion" -ForegroundColor Green
} catch {
    Write-Host "ERRO: gcloud nao esta instalado ou nao esta no PATH" -ForegroundColor Red
    Write-Host ""
    Write-Host "Instale o Google Cloud SDK:" -ForegroundColor Yellow
    Write-Host "https://cloud.google.com/sdk/docs/install" -ForegroundColor Cyan
    exit 1
}

# Verificar se esta autenticado
try {
    $account = gcloud auth list --filter=status:ACTIVE --format="value(account)" 2>&1
    if ([string]::IsNullOrEmpty($account)) {
        Write-Host "ERRO: Voce nao esta autenticado no gcloud" -ForegroundColor Red
        Write-Host ""
        Write-Host "Execute: gcloud auth login" -ForegroundColor Yellow
        exit 1
    } else {
        Write-Host "Autenticado como: $account" -ForegroundColor Green
    }
} catch {
    Write-Host "ERRO: Erro ao verificar autenticacao" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Buscando logs..." -ForegroundColor Cyan
Write-Host ""

# Buscar logs usando gcloud
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "LOGS ENCONTRADOS (ultimos $LIMIT)" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

$query = "resource.type=cloud_function AND resource.labels.function_name=$FUNCTION_NAME"
$logs = gcloud logging read $query --project=$PROJECT_ID --limit=$LIMIT --format="value(timestamp,textPayload,jsonPayload.message,jsonPayload.severity)" --freshness=7d 2>&1

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERRO ao buscar logs" -ForegroundColor Red
    Write-Host $logs
    exit 1
}

if ($logs -and $logs.Count -gt 0) {
    $logs | ForEach-Object {
        if ($_ -match "Debug|Erro|Error|ERROR") {
            Write-Host $_ -ForegroundColor Yellow
        } elseif ($_ -match "error|Error|ERROR") {
            Write-Host $_ -ForegroundColor Red
        } else {
            Write-Host $_
        }
    }
} else {
    Write-Host "Nenhum log encontrado" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Tente:" -ForegroundColor Cyan
    Write-Host "1. Criar uma preferencia de pagamento primeiro" -ForegroundColor White
    Write-Host "2. Aumentar o limite: --limit=100" -ForegroundColor White
    Write-Host "3. Verificar se a funcao foi executada nas ultimas 7 dias" -ForegroundColor White
}

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# Buscar logs especificos de debug
Write-Host "Buscando logs especificos de debug..." -ForegroundColor Cyan
Write-Host ""

$debugQuery = "resource.type=cloud_function AND resource.labels.function_name=$FUNCTION_NAME AND (textPayload=~'Debug' OR textPayload=~'Erro' OR jsonPayload.message=~'Debug' OR jsonPayload.message=~'Erro')"
$debugLogs = gcloud logging read $debugQuery --project=$PROJECT_ID --limit=20 --format="value(timestamp,textPayload,jsonPayload.message)" --freshness=7d 2>&1

if ($debugLogs -and $debugLogs.Count -gt 0) {
    Write-Host "============================================================" -ForegroundColor Green
    Write-Host "LOGS DE DEBUG ENCONTRADOS" -ForegroundColor Green
    Write-Host "============================================================" -ForegroundColor Green
    Write-Host ""
    $debugLogs | ForEach-Object {
        Write-Host $_ -ForegroundColor Yellow
    }
} else {
    Write-Host "Nenhum log de debug encontrado" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "Busca concluida!" -ForegroundColor Green
Write-Host ""
Write-Host "Para ver mais logs, acesse:" -ForegroundColor Cyan
Write-Host "https://console.firebase.google.com/project/$PROJECT_ID/functions/logs" -ForegroundColor White
