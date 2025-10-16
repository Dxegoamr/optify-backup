import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Inicializar Firebase Admin se ainda não foi inicializado
if (getApps().length === 0) {
  initializeApp();
}

export const db = getFirestore();

