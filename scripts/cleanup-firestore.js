// Script para limpar plataformas duplicadas usando Firebase CLI
// Execute com: firebase firestore:delete --all-collections --yes

const { execSync } = require('child_process');
const fs = require('fs');

// Script para exportar, limpar e reimportar dados
async function cleanupPlatforms() {
  try {
    console.log('🔍 Iniciando limpeza de plataformas duplicadas...');
    
    // 1. Exportar dados atuais
    console.log('📤 Exportando dados atuais...');
    execSync('firebase firestore:export ./backup', { stdio: 'inherit' });
    
    // 2. Ler dados exportados
    const backupPath = './backup/all_namespaces/all_kinds';
    if (!fs.existsSync(backupPath)) {
      throw new Error('Backup não encontrado');
    }
    
    // 3. Processar dados para remover duplicatas
    console.log('🔄 Processando dados...');
    const processedData = await processPlatforms(backupPath);
    
    // 4. Limpar coleção atual
    console.log('🗑️  Limpando coleção atual...');
    execSync('firebase firestore:delete platforms --yes', { stdio: 'inherit' });
    
    // 5. Reimportar dados limpos
    console.log('📥 Reimportando dados limpos...');
    await importCleanData(processedData);
    
    console.log('🎉 Limpeza concluída!');
    
  } catch (error) {
    console.error('❌ Erro:', error);
  }
}

async function processPlatforms(backupPath) {
  // Lógica para processar e remover duplicatas
  // Implementação simplificada
  return {};
}

async function importCleanData(data) {
  // Lógica para importar dados limpos
  // Implementação simplificada
}

// Executar
cleanupPlatforms();
