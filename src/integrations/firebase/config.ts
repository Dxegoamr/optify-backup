import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getAnalytics } from 'firebase/analytics';
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';

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
export const functions = getFunctions(app);

// Analytics (desabilitado temporariamente)
export const analytics = null;

// Configurar App Check
const initializeAppCheckWithConfig = () => {
  // Apenas inicializar App Check em produção
  if (import.meta.env.PROD && import.meta.env.VITE_RECAPTCHA_SITE_KEY) {
    try {
      initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider(import.meta.env.VITE_RECAPTCHA_SITE_KEY),
        isTokenAutoRefreshEnabled: true,
      });
      console.log('✅ App Check inicializado com reCAPTCHA v3');
    } catch (error) {
      console.error('❌ Erro ao inicializar App Check:', error);
    }
  } else {
    // Em desenvolvimento, usar token de debug
    if (import.meta.env.DEV) {
      // @ts-ignore - token de debug para desenvolvimento
      window.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
      console.log('🔧 App Check em modo debug para desenvolvimento');
    }
  }
};

// Inicializar App Check
initializeAppCheckWithConfig();

// Conectar emulador em desenvolvimento
if (import.meta.env.DEV) {
  try {
    connectFunctionsEmulator(functions, 'localhost', 5001);
    console.log('🔧 Conectado ao emulador de Functions');
  } catch (error) {
    // Ignorar erro se já conectado
    console.log('🔧 Emulador já conectado ou erro:', error);
  }
}

export default app;

