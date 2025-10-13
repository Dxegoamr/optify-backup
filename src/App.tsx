import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Suspense, lazy } from "react";
import { FirebaseAuthProvider } from "@/contexts/FirebaseAuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import PlanLimitationGuard from "@/components/PlanLimitationGuard";
import AdminRouteGuard from "@/routes/AdminRouteGuard";

// Loading component
const PageLoading = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="flex items-center space-x-2">
      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
      <span className="text-sm text-muted-foreground">Carregando...</span>
    </div>
  </div>
);

// Lazy load heavy pages
const Home = lazy(() => import("./pages/Home"));
const Login = lazy(() => import("./pages/Login"));
const Signup = lazy(() => import("./pages/Signup"));
const BasicInfo = lazy(() => import("./pages/BasicInfo"));
const InitialSetup = lazy(() => import("./pages/InitialSetup"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const GestaoFuncionarios = lazy(() => import("./pages/GestaoFuncionarios"));
const Pagamentos = lazy(() => import("./pages/Pagamentos"));
const ResumoDia = lazy(() => import("./pages/ResumoDia"));
const Saldos = lazy(() => import("./pages/Saldos"));
const Relatorios = lazy(() => import("./pages/Relatorios"));
const Historico = lazy(() => import("./pages/Historico"));
const Planos = lazy(() => import("./pages/Planos"));
const Admin = lazy(() => import("./pages/Admin"));
const Afiliados = lazy(() => import("./pages/Afiliados"));
const Settings = lazy(() => import("./pages/Settings"));
const Perfil = lazy(() => import("./pages/Perfil"));
const NotFound = lazy(() => import("./pages/NotFound"));
const EmployeeProfile = lazy(() => import("./pages/EmployeeProfile"));
const Termos = lazy(() => import("./pages/Termos"));
const Privacidade = lazy(() => import("./pages/Privacidade"));
const Suporte = lazy(() => import("./pages/Suporte"));
const PaymentResult = lazy(() => import("./pages/payment/PaymentResult"));
const AIAssistantPage = lazy(() => import("./pages/AIAssistantPage"));

const queryClient = new QueryClient();

const App = () => (
  <div className="min-h-screen overflow-x-hidden">
    <QueryClientProvider client={queryClient}>
      <FirebaseAuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <Suspense fallback={<PageLoading />}>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="/basic-info" element={<BasicInfo />} />
                <Route path="/initial-setup" element={<InitialSetup />} />
                
                <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                <Route path="/gestao-funcionarios" element={<ProtectedRoute><GestaoFuncionarios /></ProtectedRoute>} />
                <Route path="/gestao-funcionarios/:id" element={<ProtectedRoute><EmployeeProfile /></ProtectedRoute>} />
                <Route path="/pagamentos" element={<ProtectedRoute><PlanLimitationGuard requiredFeature="payments" pageName="Gestão de Pagamentos"><Pagamentos /></PlanLimitationGuard></ProtectedRoute>} />
                <Route path="/resumo-dia" element={<ProtectedRoute><ResumoDia /></ProtectedRoute>} />
                <Route path="/saldos" element={<ProtectedRoute><PlanLimitationGuard requiredFeature="balances" pageName="Saldo de Contas"><Saldos /></PlanLimitationGuard></ProtectedRoute>} />
                <Route path="/relatorios" element={<ProtectedRoute><PlanLimitationGuard requiredFeature="reports" pageName="Relatórios"><Relatorios /></PlanLimitationGuard></ProtectedRoute>} />
                <Route path="/historico" element={<ProtectedRoute><PlanLimitationGuard requiredFeature="history" pageName="Histórico"><Historico /></PlanLimitationGuard></ProtectedRoute>} />
                <Route path="/planos" element={<ProtectedRoute><Planos /></ProtectedRoute>} />
                <Route path="/afiliados" element={<ProtectedRoute><Afiliados /></ProtectedRoute>} />
                <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
                <Route path="/perfil" element={<ProtectedRoute><Perfil /></ProtectedRoute>} />
                <Route path="/admin" element={
                  <ProtectedRoute>
                    <AdminRouteGuard>
                      <PlanLimitationGuard requiredFeature="advancedPanel" pageName="Painel Administrativo">
                        <Admin />
                      </PlanLimitationGuard>
                    </AdminRouteGuard>
                  </ProtectedRoute>
                } />

                <Route path="/termos" element={<Termos />} />
                <Route path="/privacidade" element={<Privacidade />} />
                <Route path="/suporte" element={<Suporte />} />
                <Route path="/assistente" element={<ProtectedRoute><AIAssistantPage /></ProtectedRoute>} />
                
                {/* Rotas de pagamento */}
                <Route path="/payment/success" element={<ProtectedRoute><PaymentResult mode="success" /></ProtectedRoute>} />
                <Route path="/payment/failure" element={<ProtectedRoute><PaymentResult mode="failure" /></ProtectedRoute>} />
                <Route path="/payment/pending" element={<ProtectedRoute><PaymentResult mode="pending" /></ProtectedRoute>} />
                
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
      </TooltipProvider>
    </FirebaseAuthProvider>
  </QueryClientProvider>
  </div>
);

export default App;
