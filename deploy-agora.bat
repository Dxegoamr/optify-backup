@echo off
echo ============================================
echo Iniciando deploy do Optify
echo ============================================
echo.

echo 1. Compilando functions...
cd functions
call npm run build
if %errorlevel% neq 0 (
    echo ERRO ao compilar functions!
    pause
    exit /b 1
)
cd ..
echo OK - Functions compiladas
echo.

echo 2. Fazendo deploy da funcao createPaymentPreference...
firebase deploy --only functions:createPaymentPreference
if %errorlevel% neq 0 (
    echo ERRO ao fazer deploy da function!
    pause
    exit /b 1
)
echo OK - Function deployada
echo.

echo 3. Fazendo deploy do hosting...
firebase deploy --only hosting
if %errorlevel% neq 0 (
    echo ERRO ao fazer deploy do hosting!
    pause
    exit /b 1
)
echo OK - Hosting deployado
echo.

echo ============================================
echo Deploy concluido com sucesso!
echo ============================================
pause

