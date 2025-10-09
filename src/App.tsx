import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { FirebaseAuthProvider } from "@/contexts/FirebaseAuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";

// Pages
import Home from "./pages/Home";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import BasicInfo from "./pages/BasicInfo";
import InitialSetup from "./pages/InitialSetup";
import Dashboard from "./pages/Dashboard";
import GestaoFuncionarios from "./pages/GestaoFuncionarios";
import Pagamentos from "./pages/Pagamentos";
import ResumoDia from "./pages/ResumoDia";
import Saldos from "./pages/Saldos";
import Relatorios from "./pages/Relatorios";
import Historico from "./pages/Historico";
import HistoricoDiario from "./pages/HistoricoDiario";
import Planos from "./pages/Planos";
import Admin from "./pages/Admin";
import Afiliados from "./pages/Afiliados";
import Settings from "./pages/Settings";
import Perfil from "./pages/Perfil";
import NotFound from "./pages/NotFound";
import EmployeeProfile from "./pages/EmployeeProfile";
import Termos from "./pages/Termos";
import Privacidade from "./pages/Privacidade";
import Suporte from "./pages/Suporte";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <FirebaseAuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/basic-info" element={<BasicInfo />} />
            <Route path="/initial-setup" element={<InitialSetup />} />
            
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/gestao-funcionarios" element={<ProtectedRoute><GestaoFuncionarios /></ProtectedRoute>} />
            <Route path="/gestao-funcionarios/:id" element={<ProtectedRoute><EmployeeProfile /></ProtectedRoute>} />
            <Route path="/pagamentos" element={<ProtectedRoute><Pagamentos /></ProtectedRoute>} />
            <Route path="/resumo-dia" element={<ProtectedRoute><ResumoDia /></ProtectedRoute>} />
            <Route path="/saldos" element={<ProtectedRoute><Saldos /></ProtectedRoute>} />
            <Route path="/relatorios" element={<ProtectedRoute><Relatorios /></ProtectedRoute>} />
            <Route path="/historico" element={<ProtectedRoute><Historico /></ProtectedRoute>} />
            <Route path="/historico-diario" element={<ProtectedRoute><HistoricoDiario /></ProtectedRoute>} />
            <Route path="/planos" element={<ProtectedRoute><Planos /></ProtectedRoute>} />
            <Route path="/afiliados" element={<ProtectedRoute><Afiliados /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
            <Route path="/perfil" element={<ProtectedRoute><Perfil /></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute requireAdmin><Admin /></ProtectedRoute>} />

            <Route path="/termos" element={<Termos />} />
            <Route path="/privacidade" element={<Privacidade />} />
            <Route path="/suporte" element={<Suporte />} />
            
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </FirebaseAuthProvider>
  </QueryClientProvider>
);

export default App;
