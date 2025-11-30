@echo off
echo ============================================
echo CORRIGINDO MERCADO PAGO
echo ============================================
echo.

echo 1. Compilando functions...
cd functions
call npm run build
if %errorlevel% neq 0 (
    echo ERRO ao compilar!
    pause
    exit /b 1
)
cd ..
echo OK!
echo.

echo 2. Fazendo deploy da funcao...
firebase deploy --only functions:createPaymentPreference
if %errorlevel% neq 0 (
    echo ERRO no deploy!
    pause
    exit /b 1
)
echo OK!
echo.

echo 3. Fazendo deploy do hosting...
firebase deploy --only hosting
if %errorlevel% neq 0 (
    echo ERRO no deploy!
    pause
    exit /b 1
)
echo OK!
echo.

echo ============================================
echo CONCLUIDO! Teste o pagamento agora.
echo ============================================
pause






















