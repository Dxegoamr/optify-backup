@echo off
echo Compilando functions...
cd functions
call npm run build
cd ..

echo Fazendo deploy da funcao createPaymentPreference...
firebase deploy --only functions:createPaymentPreference

echo Fazendo deploy do hosting...
firebase deploy --only hosting

echo Deploy concluido!
pause

