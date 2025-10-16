@echo off
echo 🔧 Testando compilacao das functions...
echo.

cd functions

echo 1. Verificando se node_modules existe...
if not exist "node_modules" (
    echo ❌ node_modules nao existe! Instalando dependencias...
    call npm install
) else (
    echo ✅ node_modules OK
)

echo.
echo 2. Limpando build anterior...
if exist "lib" (
    rmdir /s /q lib
    echo ✅ lib removido
)

echo.
echo 3. Compilando TypeScript...
call npx tsc

if errorlevel 1 (
    echo ❌ ERRO NA COMPILACAO!
    echo.
    echo Verifique os erros acima
    pause
    exit /b 1
)

echo.
echo 4. Verificando se generateAIResponse foi compilado...
if exist "lib\ai\assistant.js" (
    echo ✅ assistant.js compilado com sucesso!
) else (
    echo ❌ assistant.js NAO foi compilado!
    pause
    exit /b 1
)

echo.
echo 5. Verificando exports no index.js...
findstr "generateAIResponse" lib\index.js >nul
if errorlevel 1 (
    echo ❌ generateAIResponse NAO esta sendo exportado!
) else (
    echo ✅ generateAIResponse esta sendo exportado!
)

echo.
echo ========================================
echo ✅ COMPILACAO CONCLUIDA COM SUCESSO!
echo ========================================
echo.
echo Agora execute:
echo    firebase emulators:start --only functions
echo.
pause



