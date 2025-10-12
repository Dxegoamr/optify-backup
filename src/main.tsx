import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { configureTimezone } from "./utils/timezone";
import { initSentry } from "./observability/sentry";

// Inicializar Sentry
initSentry();

// Configurar o fuso horário padrão do sistema
configureTimezone();

// Registrar Service Worker em produção
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then(registration => {
        console.log('✅ Service Worker registrado:', registration.scope);
      })
      .catch(error => {
        console.error('❌ Erro ao registrar Service Worker:', error);
      });
  });
}

createRoot(document.getElementById("root")!).render(
  <App />
);
