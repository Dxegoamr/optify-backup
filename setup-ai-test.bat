@echo off
echo 🚀 Configurando IA para teste local...

echo.
echo 1. Criando arquivo .env com a chave da API...
echo OPENAI_API_KEY=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 > functions\.env

echo.
echo 2. Iniciando emulador do Firebase...
echo    (Mantenha este terminal aberto)
echo.
firebase emulators:start --only functions

pause
