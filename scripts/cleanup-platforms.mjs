import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, deleteDoc, doc } from 'firebase/firestore';

// Configuração do Firebase
const firebaseConfig = {
  apiKey: "AIzaSyC...", // Substitua pela sua API key
  authDomain: "optify-definitivo.firebaseapp.com",
  projectId: "optify-definitivo",
  storageBucket: "optify-definitivo.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function cleanupDuplicatePlatforms() {
  try {
    console.log('🔍 Iniciando análise de plataformas duplicadas...');
    
    // Buscar todas as plataformas
    const platformsRef = collection(db, 'platforms');
    const snapshot = await getDocs(platformsRef);
    
    console.log(`📊 Total de plataformas encontradas: ${snapshot.size}`);
    
    // Agrupar por nome para identificar duplicatas
    const platformsByName = {};
    const allPlatforms = [];
    
    snapshot.forEach(doc => {
      const data = doc.data();
      const name = data.name?.toLowerCase().trim();
      
      if (!name) {
        console.log(`⚠️  Plataforma sem nome encontrada: ${doc.id}`);
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
        console.log(`🔄 Duplicatas encontradas para "${name}": ${platforms.length} registros`);
        
        // Ordenar por data de criação (manter o mais antigo)
        platforms.sort((a, b) => a.createdAt - b.createdAt);
        
        // Marcar todos exceto o primeiro como duplicatas
        for (let i = 1; i < platforms.length; i++) {
          duplicates.push(platforms[i]);
        }
      }
    });
    
    console.log(`🗑️  Total de duplicatas identificadas: ${duplicates.length}`);
    
    if (duplicates.length === 0) {
      console.log('✅ Nenhuma duplicata encontrada!');
      return;
    }
    
    // Mostrar duplicatas
    console.log('\n📋 Duplicatas que serão removidas:');
    duplicates.forEach((dup, index) => {
      console.log(`${index + 1}. ID: ${dup.id} | Nome: ${dup.name} | Criado: ${dup.createdAt.toLocaleString()}`);
    });
    
    // Confirmar antes de deletar
    console.log('\n⚠️  Esta operação é irreversível!');
    console.log('Para continuar, descomente as linhas de deleteDoc abaixo.');
    
    // Descomente as linhas abaixo para executar a limpeza
    /*
    console.log('\n🗑️  Removendo duplicatas...');
    let deletedCount = 0;
    
    for (const duplicate of duplicates) {
      await deleteDoc(doc(db, 'platforms', duplicate.id));
      deletedCount++;
      console.log(`✅ Removida: ${duplicate.name} (${duplicate.id})`);
    }
    
    console.log(`\n🎉 Limpeza concluída! ${deletedCount} duplicatas removidas.`);
    
    // Verificar resultado final
    const finalSnapshot = await getDocs(platformsRef);
    console.log(`📊 Total de plataformas após limpeza: ${finalSnapshot.size}`);
    */
    
  } catch (error) {
    console.error('❌ Erro durante a limpeza:', error);
  }
}

// Executar limpeza
cleanupDuplicatePlatforms();
