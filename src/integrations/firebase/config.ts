import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getAnalytics } from 'firebase/analytics';

// Configuração do Firebase
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyAStGKJqRedz12n8JUSfW1eKlPXKsFRHFA",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "optify-definitivo.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "optify-definitivo",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "optify-definitivo.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "1083748361977",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:1083748361977:web:faf62042d761fddad26428"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);

// Inicializar serviços
export const db = getFirestore(app);
export const auth = getAuth(app);

// Analytics (desabilitado temporariamente)
export const analytics = null;

export default app;

