import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

// Configuração do Firebase Admin SDK
const firebaseAdminConfig = {
  projectId: process.env.FIREBASE_PROJECT_ID || 'optify-definitivo',
  privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
};

// Inicializar Firebase Admin apenas se não estiver inicializado
let adminApp;
if (getApps().length === 0) {
  adminApp = initializeApp({
    credential: cert(firebaseAdminConfig),
    projectId: firebaseAdminConfig.projectId,
  });
} else {
  adminApp = getApps()[0];
}

// Exportar serviços do Firebase Admin
export const adminDb = getFirestore(adminApp);
export const adminAuth = getAuth(adminApp);

export default adminApp;








