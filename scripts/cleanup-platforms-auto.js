// Script automatizado para limpar plataformas duplicadas
// Execute com: node scripts/cleanup-platforms-auto.js

const admin = require('firebase-admin');

// Configuração do Firebase Admin
const serviceAccount = {
  type: "service_account",
  project_id: "optify-definitivo",
  private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
  private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
  client_id: process.env.FIREBASE_CLIENT_ID,
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
  auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
  client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${process.env.FIREBASE_CLIENT_EMAIL}`
};

// Inicializar Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://optify-definitivo-default-rtdb.firebaseio.com"
});

const db = admin.firestore();

async function cleanupDuplicatePlatforms() {
  try {
    console.log('🔍 Iniciando limpeza de plataformas duplicadas...');
    
    // Buscar todas as plataformas
    const platformsRef = db.collection('platforms');
    const snapshot = await platformsRef.get();
    
    console.log(`📊 Total de plataformas encontradas: ${snapshot.size}`);
    
    // Agrupar por nome
    const platformsByName = {};
    const allPlatforms = [];
    
    snapshot.forEach(doc => {
      const data = doc.data();
      const name = data.name?.toLowerCase().trim();
      
      if (!name) {
        console.log(`⚠️  Plataforma sem nome: ${doc.id}`);
        return;
      }
      
      const platform = {
        id: doc.id,
        name: data.name,
        normalizedName: name,
        data: data,
        createdAt: data.createdAt?.toDate() || new Date(0)
      };
      
      allPlatforms.push(platform);
      
      if (!platformsByName[name]) {
        platformsByName[name] = [];
      }
      platformsByName[name].push(platform);
    });
    
    // Identificar duplicatas
    const duplicates = [];
    Object.keys(platformsByName).forEach(name => {
      const platforms = platformsByName[name];
      if (platforms.length > 1) {
        console.log(`🔄 Duplicatas para "${name}": ${platforms.length} registros`);
        
        // Ordenar por data (manter o mais antigo)
        platforms.sort((a, b) => a.createdAt - b.createdAt);
        
        // Marcar duplicatas (exceto o primeiro)
        for (let i = 1; i < platforms.length; i++) {
          duplicates.push(platforms[i]);
        }
      }
    });
    
    console.log(`🗑️  Duplicatas a remover: ${duplicates.length}`);
    
    if (duplicates.length === 0) {
      console.log('✅ Nenhuma duplicata encontrada!');
      return;
    }
    
    // Mostrar duplicatas
    console.log('\n📋 Duplicatas:');
    duplicates.forEach((dup, index) => {
      console.log(`${index + 1}. ${dup.name} (${dup.id}) - ${dup.createdAt.toLocaleString()}`);
    });
    
    // Remover duplicatas
    console.log('\n🗑️  Removendo duplicatas...');
    let deletedCount = 0;
    
    for (const duplicate of duplicates) {
      try {
        await platformsRef.doc(duplicate.id).delete();
        deletedCount++;
        console.log(`✅ Removida: ${duplicate.name}`);
      } catch (error) {
        console.error(`❌ Erro ao remover ${duplicate.name}:`, error);
      }
    }
    
    console.log(`\n🎉 Limpeza concluída! ${deletedCount} duplicatas removidas.`);
    
    // Verificar resultado
    const finalSnapshot = await platformsRef.get();
    console.log(`📊 Total após limpeza: ${finalSnapshot.size}`);
    
  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    process.exit(0);
  }
}

// Executar limpeza
cleanupDuplicatePlatforms();
