const admin = require('firebase-admin');

// Inicializar Firebase Admin
const serviceAccount = require('../serviceAccountKey.json'); // Você precisa baixar este arquivo do Firebase Console

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://optify-definitivo-default-rtdb.firebaseio.com"
});

const db = admin.firestore();

async function cleanupDuplicatePlatforms() {
  try {
    console.log('🔍 Iniciando limpeza de plataformas duplicadas...');
    
    // Buscar todas as plataformas
    const platformsSnapshot = await db.collection('platforms').get();
    console.log(`📊 Total de plataformas encontradas: ${platformsSnapshot.size}`);
    
    // Agrupar por nome para identificar duplicatas
    const platformsByName = {};
    const duplicates = [];
    
    platformsSnapshot.forEach(doc => {
      const data = doc.data();
      const name = data.name?.toLowerCase().trim();
      
      if (!name) {
        console.log(`⚠️  Plataforma sem nome encontrada: ${doc.id}`);
        return;
      }
      
      if (!platformsByName[name]) {
        platformsByName[name] = [];
      }
      
      platformsByName[name].push({
        id: doc.id,
        data: data,
        createdAt: data.createdAt || new Date(0)
      });
    });
    
    // Identificar duplicatas (mais de uma plataforma com o mesmo nome)
    Object.keys(platformsByName).forEach(name => {
      const platforms = platformsByName[name];
      if (platforms.length > 1) {
        console.log(`🔄 Duplicatas encontradas para "${name}": ${platforms.length} registros`);
        
        // Ordenar por data de criação (manter o mais antigo)
        platforms.sort((a, b) => a.createdAt - b.createdAt);
        
        // Marcar todos exceto o primeiro como duplicatas
        for (let i = 1; i < platforms.length; i++) {
          duplicates.push(platforms[i]);
        }
      }
    });
    
    console.log(`🗑️  Total de duplicatas a serem removidas: ${duplicates.length}`);
    
    if (duplicates.length === 0) {
      console.log('✅ Nenhuma duplicata encontrada!');
      return;
    }
    
    // Confirmar antes de deletar
    console.log('\n📋 Duplicatas que serão removidas:');
    duplicates.forEach((dup, index) => {
      console.log(`${index + 1}. ID: ${dup.id} | Nome: ${dup.data.name} | Criado: ${dup.createdAt}`);
    });
    
    // Deletar duplicatas
    console.log('\n🗑️  Removendo duplicatas...');
    const batch = db.batch();
    let deletedCount = 0;
    
    for (const duplicate of duplicates) {
      batch.delete(db.collection('platforms').doc(duplicate.id));
      deletedCount++;
      
      // Commit em lotes de 500 (limite do Firestore)
      if (deletedCount % 500 === 0) {
        await batch.commit();
        console.log(`✅ Removidas ${deletedCount} duplicatas...`);
      }
    }
    
    // Commit final
    if (deletedCount % 500 !== 0) {
      await batch.commit();
    }
    
    console.log(`\n🎉 Limpeza concluída! ${deletedCount} duplicatas removidas.`);
    
    // Verificar resultado final
    const finalSnapshot = await db.collection('platforms').get();
    console.log(`📊 Total de plataformas após limpeza: ${finalSnapshot.size}`);
    
  } catch (error) {
    console.error('❌ Erro durante a limpeza:', error);
  } finally {
    process.exit(0);
  }
}

// Executar limpeza
cleanupDuplicatePlatforms();
