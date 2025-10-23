// Configurações de ambiente para desenvolvimento
export const env = {
  // Firebase
  FIREBASE_API_KEY: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyD3Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8',
  FIREBASE_AUTH_DOMAIN: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'optify-definitivo.firebaseapp.com',
  FIREBASE_PROJECT_ID: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'optify-definitivo',
  FIREBASE_STORAGE_BUCKET: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'optify-definitivo.appspot.com',
  FIREBASE_MESSAGING_SENDER_ID: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '123456789',
  FIREBASE_APP_ID: import.meta.env.VITE_FIREBASE_APP_ID || '1:123456789:web:abcdef123456',

  // Mercado Pago
  MERCADO_PAGO_PUBLIC_KEY: import.meta.env.VITE_MERCADO_PAGO_PUBLIC_KEY || 'APP_USR-9ca765f9-6a73-47a9-ab3d-0923791c2a4f',
  API_URL: import.meta.env.VITE_API_URL || 'https://us-central1-optify-definitivo.cloudfunctions.net',
};
