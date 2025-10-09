import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { configureTimezone } from "./utils/timezone";

// Configurar o fuso horário padrão do sistema
configureTimezone();

createRoot(document.getElementById("root")!).render(<App />);
